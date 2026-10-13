import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { player, room, start, action, defaultAction, active, view, assert, log } from './game.js';
const root=fileURLToPath(new URL('..',import.meta.url));
const dataDir=process.env.DATA_DIR||resolve(root,'data');mkdirSync(dataDir,{recursive:true,mode:0o700});
const file=resolve(dataDir,'rooms.json'), rooms=new Map(), sessions=new Map();
try{const saved=JSON.parse(readFileSync(file,'utf8'));for(const g of saved.rooms||[]){if(Date.now()-g.updatedAt<24*3600000){g.players.forEach(p=>p.connected=p.bot);g.deadline=Date.now()+90000;rooms.set(g.code,g);}}for(const [token,s] of saved.sessions||[])if(rooms.has(s.code))sessions.set(token,s);}catch(e){if(e.code!=='ENOENT')console.error('Room restore failed:',e.message);}
let saveTimer;function save(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{try{writeFileSync(file+'.tmp',JSON.stringify({rooms:[...rooms.values()],sessions:[...sessions]}),{mode:0o600});renameSync(file+'.tmp',file);}catch(e){console.error('Persistence failed:',e.message);}},100);}
const app=express();app.set('trust proxy',1);app.disable('x-powered-by');app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'","'unsafe-inline'"],fontSrc:["'self'"],imgSrc:["'self'","data:"],connectSrc:["'self'","ws:","wss:"]}},crossOriginEmbedderPolicy:false}));
app.get('/api/health',(_req,res)=>res.json({status:'ok',version:'1.0.0'}));
app.use(rateLimit({windowMs:60000,limit:300,standardHeaders:'draft-7',legacyHeaders:false}));
app.use(express.static(resolve(root,'dist'),{maxAge:'1h',setHeaders(res,path){if(path.endsWith('.html'))res.setHeader('Cache-Control','no-cache');else if(path.includes('/assets/'))res.setHeader('Cache-Control','public,max-age=31536000,immutable');}}));
app.get('*',(_req,res)=>res.sendFile(resolve(root,'dist/index.html')));
const http=createServer(app);
const io=new Server(http,{maxHttpBufferSize:12000,pingTimeout:20000,allowRequest(req,cb){const origin=req.headers.origin;if(!origin)return cb(null,true);try{const host=req.headers['x-forwarded-host']||req.headers.host;const url=new URL(origin);cb(null,url.host===host||(!process.env.RAILWAY_ENVIRONMENT_ID&&['localhost','127.0.0.1'].includes(url.hostname)));}catch{cb(null,false);}}});
function publish(g){g.revision++;g.updatedAt=Date.now();for(const s of io.sockets.sockets.values())if(s.data.code===g.code)s.emit('state',view(g,s.data.player));save();}
const cleanName=n=>String(n||'').replace(/[<>\x00-\x1f]/g,'').trim().slice(0,20)||'New crew';
function attach(socket,g,p,token){if(socket.data.code)socket.leave(socket.data.code);socket.data.code=g.code;socket.data.player=p.id;socket.data.token=token;socket.join(g.code);p.connected=true;}
function session(socket){const g=rooms.get(socket.data.code);assert(g&&g.players.some(p=>p.id===socket.data.player),'Your room expired. Create a new one.');return g;}
function tokenFor(code,id){const token=randomBytes(32).toString('hex');sessions.set(token,{code,id});return token;}
io.on('connection',socket=>{
 let count=0,window=Date.now();
 function handle(event,fn){socket.on(event,(payload={},ack=()=>{})=>{if(Date.now()-window>10000){window=Date.now();count=0;}if(++count>30)return typeof ack==='function'&&ack({error:'Too many actions. Wait a moment.'});try{const result=fn(payload);if(typeof ack==='function')ack({ok:true,...result});}catch(e){if(typeof ack==='function')ack({error:e.message||'Something went wrong.'});}});}
 handle('create',d=>{assert(rooms.size<1500,'The streets are busy. Try again soon.');if(socket.data.code){const old=rooms.get(socket.data.code);assert(!old||old.status==='finished'||old.players.find(p=>p.id===socket.data.player)?.out,'Leave your current room before making a new one.');}let code;do{code=randomBytes(4).toString('hex').slice(0,6).toUpperCase();}while(rooms.has(code));const p=player(cleanName(d.name)),g=room(code,p);g.limit=[10,20,30].includes(d.limit)?d.limit:20;rooms.set(code,g);const token=tokenFor(code,p.id);attach(socket,g,p,token);if(d.solo){for(let i=1;i<4;i++){const b=player(['','Remy','Jax','Nova'][i],true);b.crew=i;g.players.push(b);}start(g,p.id);}publish(g);return {token,code,id:p.id};});
 handle('join',d=>{assert(typeof d.code==='string','Enter a room code.');const g=rooms.get(d.code.trim().toUpperCase());assert(g,'That room does not exist or has expired.');assert(g.status==='lobby','This match has started. Rejoin with your original browser.');assert(g.players.length<4,'That room is full.');const old=rooms.get(socket.data.code);assert(!old||old.code===g.code||old.status==='finished'||old.players.find(p=>p.id===socket.data.player)?.out,'Leave your current room first.');assert(!g.players.some(p=>p.id===socket.data.player),'You are already in this room.');const p=player(cleanName(d.name));p.crew=g.players.length;g.players.push(p);const token=tokenFor(g.code,p.id);attach(socket,g,p,token);log(g,`${p.name} joined the crew.`);publish(g);return {token,code:g.code,id:p.id};});
 handle('resume',d=>{assert(typeof d.token==='string','Missing seat token.');const s=sessions.get(d.token);assert(s,'Your saved seat has expired.');const g=rooms.get(s.code),p=g?.players.find(x=>x.id===s.id);assert(g&&p,'Your room has expired.');attach(socket,g,p,d.token);publish(g);return {code:g.code,id:p.id,token:d.token};});
 handle('lobby',d=>{const g=session(socket);assert(g.status==='lobby'&&g.host===socket.data.player,'Only the host can change the lobby.');if(d.type==='add-bot'){assert(g.players.length<4,'The room is full.');const b=player(['Remy','Jax','Nova'][g.players.filter(p=>p.bot).length%3],true);g.players.push(b);}else if(d.type==='remove-bot'){const i=g.players.findIndex(p=>p.id===d.id&&p.bot);assert(i>=0,'Only bot seats can be removed.');g.players.splice(i,1);}else if(d.type==='settings'){assert([10,20,30].includes(d.limit),'Choose a valid match length.');g.limit=d.limit;}else if(d.type==='start')start(g,socket.data.player);else throw new Error('Invalid lobby action.');g.players.forEach((p,i)=>p.crew=i);publish(g);return {};});
 handle('action',d=>{const g=session(socket);action(g,socket.data.player,d);publish(g);return {};});
 handle('leave',()=>{const g=session(socket);assert(g.status!=='playing','Use Reconnect to return to a running match. Your seat stays reserved.');const id=socket.data.player;if(g.status==='lobby'){g.players=g.players.filter(p=>p.id!==id);g.players.forEach((p,i)=>p.crew=i);if(g.host===id)g.host=g.players.find(p=>!p.bot)?.id;if(!g.host){rooms.delete(g.code);}else publish(g);}sessions.delete(socket.data.token);socket.leave(g.code);socket.data={};save();return {};});
 socket.on('disconnect',()=>{const g=rooms.get(socket.data.code);if(!g)return;const p=g.players.find(x=>x.id===socket.data.player);if(p)p.connected=p.bot||[...io.sockets.sockets.values()].some(s=>s.data.player===p.id);publish(g);});
});
const botDue=new Map();const interval=setInterval(()=>{for(const g of rooms.values()){
 if(Date.now()-g.updatedAt>24*3600000){rooms.delete(g.code);for(const [t,s]of sessions)if(s.code===g.code)sessions.delete(t);save();continue;}
 if(g.status!=='playing'||!g.players.some(p=>!p.bot&&p.connected))continue;
 const actors=g.phase==='duel'?g.players.filter(p=>[g.duel.attacker,g.duel.defender].includes(p.id)&&!g.duel.choices[p.id]):[active(g)];
 for(const p of actors){const key=g.code+':'+p.id;const state=g.phase+':'+g.turn+':'+g.duel?.history.length;if(botDue.get(key)?.state!==state)botDue.set(key,{state,at:Date.now()+1400});const timed=Date.now()>g.deadline;const eliminated=p.out&&['end','duel-result'].includes(g.phase);if((p.bot&&Date.now()>=botDue.get(key).at)||timed||eliminated){try{action(g,p.id,defaultAction(g,p.id));publish(g);botDue.delete(key);}catch(e){console.error('Automatic turn failed:',g.code,g.phase,e.message);g.deadline=Date.now()+15000;} }
 }
 if(g.trade&&g.players.find(p=>p.id===g.trade.to)?.bot){try{const tr=g.trade;const { BOARD }=awaitBoard;action(g,tr.to,{type:'trade-respond',accept:BOARD[tr.give].price+tr.cash>=BOARD[tr.take].price});publish(g);}catch{g.trade=null;publish(g);}}
}},500);
import * as awaitBoard from '../shared/board.js';
const port=Number(process.env.PORT)||3000;http.listen(port,'0.0.0.0',()=>console.log(`Spin the Block listening on ${port}`));
function shutdown(){clearInterval(interval);clearTimeout(saveTimer);try{writeFileSync(file,JSON.stringify({rooms:[...rooms.values()],sessions:[...sessions]}),{mode:0o600});}catch(e){console.error(e.message);}io.close(()=>http.close(()=>process.exit(0)));setTimeout(()=>process.exit(0),5000).unref();}process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
