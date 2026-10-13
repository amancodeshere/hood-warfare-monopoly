import { defineConfig } from 'vite';
export default defineConfig({server:{port:5173,proxy:{'/socket.io':{target:'http://127.0.0.1:3000',ws:true},'/api':'http://127.0.0.1:3000'}},build:{sourcemap:false}});
