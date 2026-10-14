import { shiftFPS } from "./fps.js";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  player,
  room,
  start,
  action,
  defaultAction,
  active,
  view,
  assert,
  log,
  board,
  migrate,
  finishAuction,
  timeoutAction,
  tickDuel,
} from "./game.js";
import { settings, matchLimit } from "../shared/settings.js";
import { profileStore } from "./profiles.js";
const root = fileURLToPath(new URL("..", import.meta.url));
const dataDir = process.env.DATA_DIR || resolve(root, "data");
mkdirSync(dataDir, { recursive: true, mode: 0o700 });
const profiles = profileStore(dataDir);
const file = resolve(dataDir, "rooms.json"),
  rooms = new Map(),
  sessions = new Map();
try {
  const saved = JSON.parse(readFileSync(file, "utf8"));
  for (const g of saved.rooms || []) {
    if (Date.now() - g.updatedAt < 24 * 3600000) {
      migrate(g);
      shiftFPS(
        g.duel,
        Math.max(0, Date.now() - (g.pausedAt || saved.savedAt || g.updatedAt)),
      );
      g.spectators = [];
      g.pausedAt = Date.now();
      g.players.forEach((p) => (p.connected = p.bot));
      g.turnDeadline = Date.now() + 90000;
      g.deadline =
        g.duel?.mode === "fps" && g.phase === "duel"
          ? g.duel.stage === "live"
            ? g.duel.endsAt
            : Date.now() + 25000
          : g.turnDeadline;
      rooms.set(g.code, g);
    }
  }
  for (const [token, s] of saved.sessions || [])
    if (rooms.has(s.code)) sessions.set(token, s);
} catch (e) {
  if (e.code !== "ENOENT") console.error("Room restore failed:", e.message);
}
let saveTimer;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      writeFileSync(
        file + ".tmp",
        JSON.stringify({
          savedAt: Date.now(),
          rooms: [...rooms.values()],
          sessions: [...sessions],
        }),
        { mode: 0o600 },
      );
      renameSync(file + ".tmp", file);
    } catch (e) {
      console.error("Persistence failed:", e.message);
    }
  }, 100);
}
const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        fontSrc: ["'self'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'", "ws:", "wss:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);
app.get("/api/health", (_req, res) =>
  res.json({ status: "ok", version: "1.0.0" }),
);
app.use(
  rateLimit({
    windowMs: 60000,
    limit: 300,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  }),
);
app.use(
  express.static(resolve(root, "dist"), {
    maxAge: "1h",
    setHeaders(res, path) {
      if (path.endsWith(".html")) res.setHeader("Cache-Control", "no-cache");
      else if (path.includes("/assets/"))
        res.setHeader("Cache-Control", "public,max-age=31536000,immutable");
    },
  }),
);
app.get("*", (_req, res) => res.sendFile(resolve(root, "dist/index.html")));
const http = createServer(app);
const io = new Server(http, {
  maxHttpBufferSize: 12000,
  pingTimeout: 20000,
  allowRequest(req, cb) {
    const origin = req.headers.origin;
    if (!origin) return cb(null, true);
    try {
      const host = req.headers["x-forwarded-host"] || req.headers.host;
      const url = new URL(origin);
      cb(
        null,
        url.host === host ||
          (!process.env.RAILWAY_ENVIRONMENT_ID &&
            ["localhost", "127.0.0.1"].includes(url.hostname)),
      );
    } catch {
      cb(null, false);
    }
  },
});
function profileUpdates() {
  const online = new Set(
    [...io.sockets.sockets.values()].map((s) => s.data.profile),
  );
  for (const s of io.sockets.sockets.values()) {
    const p = profiles.profile(s.data.profile);
    if (p)
      s.emit("profile", {
        profile: profiles.safe(p),
        ...profiles.friends(p.id, online),
      });
  }
}
function publish(g) {
  const recording = g.status === "finished" && !g.statsRecorded;
  profiles.finish(g);
  g.revision++;
  g.updatedAt = Date.now();
  for (const s of io.sockets.sockets.values())
    if (s.data.code === g.code) {
      const p = profiles.profile(s.data.profile);
      const hidden = [...(p?.muted || []), ...(p?.blocks || [])];
      s.emit("state", view(g, s.data.player, hidden));
    }
  if (recording) profileUpdates();
  save();
}
// React renders all player content as text; control characters are stripped here.
const cleanName = (n) =>
  String(n || "")
    .split("")
    .filter((c) => c.charCodeAt(0) >= 32 && c !== "<" && c !== ">")
    .join("")
    .trim()
    .slice(0, 20) || "New crew";
function releasePresence(socket, g) {
  const p = g?.players.find((p) => p.id === socket.data.player);
  if (p)
    p.connected =
      p.bot ||
      [...io.sockets.sockets.values()].some(
        (s) =>
          s.id !== socket.id &&
          s.data.code === g.code &&
          s.data.player === p.id,
      );
}
function attach(socket, g, p, token, spectator = false) {
  if (
    socket.data.code &&
    (socket.data.code !== g.code || socket.data.player !== p.id)
  ) {
    const old = rooms.get(socket.data.code);
    releasePresence(socket, old);
    if (socket.data.spectator && old)
      old.spectators = old.spectators.filter(
        (x) => x.id !== socket.data.player,
      );
    if (socket.data.code !== g.code) socket.leave(socket.data.code);
    if (old && old !== g) publish(old);
  }
  Object.assign(socket.data, { code: g.code, player: p.id, token, spectator });
  socket.join(g.code);
  p.connected = true;
  if (!spectator && !p.profileId && socket.data.profile)
    p.profileId = socket.data.profile;
  profileUpdates();
  if (!spectator && g.pausedAt && g.status === "playing") {
    const delta = Date.now() - g.pausedAt;
    shiftFPS(g.duel, delta);
    g.deadline += delta;
    g.turnDeadline = g.turnDeadline ? g.turnDeadline + delta : g.deadline;
    g.turnStarted = (g.turnStarted || Date.now()) + delta;
    g.pausedAt = null;
  }
}
function session(socket, allowWatch = false) {
  const g = rooms.get(socket.data.code);
  assert(
    g &&
      (g.players.some((p) => p.id === socket.data.player) ||
        (allowWatch && socket.data.spectator)),
    "Your room expired. Create a new one.",
  );
  return g;
}
function tokenFor(code, id, spectator = false) {
  const token = randomBytes(32).toString("hex");
  sessions.set(token, { code, id, spectator });
  return token;
}
const botNames = [
  "Remy",
  "Jax",
  "Nova",
  "Lil Receipt",
  "Unc",
  "Big Bag",
  "Miss Motion",
];
function addBot(g) {
  assert(g.players.length < g.settings.maxPlayers, "The room is full.");
  const b = player(
    botNames.find((n) => !g.players.some((p) => p.name === n)) || "Bot",
    true,
  );
  b.crew = g.players.length;
  g.players.push(b);
}
function fillBots(g) {
  while (g.players.length < g.settings.maxPlayers) addBot(g);
}
function teams(g) {
  if (g.settings.teams)
    g.players.forEach((p, i) => {
      p.team ??= String((i % 2) + 1);
    });
}
function getProfile(socket, name) {
  if (!profiles.profile(socket.data.profile)) {
    const a = profiles.authorize(null, cleanName(name));
    socket.data.profile = a.profile.id;
    socket.emit("profile-token", a);
    profileUpdates();
  }
  return profiles.profile(socket.data.profile);
}
function availableRoom(socket, g) {
  const p = profiles.profile(socket.data.profile);
  return (
    (!g.settings.registeredOnly || !!p?.passwordHash) &&
    !g.players.some((x) => x.profileId && profiles.blocked(p?.id, x.profileId))
  );
}
function maySwitch(socket) {
  const old = rooms.get(socket.data.code);
  assert(
    !old ||
      socket.data.spectator ||
      old.status === "finished" ||
      old.players.find((p) => p.id === socket.data.player)?.out,
    "Leave your current room first.",
  );
}
function createRoom(socket, d) {
  assert(rooms.size < 1500, "The streets are busy. Try again soon.");
  maySwitch(socket);
  const profile = getProfile(socket, d.name);
  if (d.name)
    profiles.change(profile.id, { type: "rename", name: cleanName(d.name) });
  const opts = settings(d.settings);
  assert(
    !opts.registeredOnly || profile.passwordHash,
    "Create an account before requiring registered seats.",
  );
  const city = profiles.resolveMap(profile.id, opts.map);
  let code;
  do {
    code = randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
  } while (rooms.has(code));
  const p = player(cleanName(d.name || profile.name));
  Object.assign(p, { profileId: profile.id, appearance: profile.appearance });
  const g = room(code, p);
  g.settings = opts;
  g.limit = matchLimit(d.limit);
  Object.assign(g, city);
  rooms.set(code, g);
  const token = tokenFor(code, p.id);
  attach(socket, g, p, token);
  if (d.solo) {
    fillBots(g);
    teams(g);
    start(g, p.id);
  }
  publish(g);
  return { token, code, id: p.id };
}
function joinRoom(socket, d) {
  assert(typeof d.code === "string", "Enter a room code.");
  const g = rooms.get(d.code.trim().toUpperCase());
  assert(g, "That room does not exist or has expired.");
  getProfile(socket, d.name);
  const existing = g.players.find((p) => p.profileId === socket.data.profile);
  if (existing) {
    if (socket.data.code !== g.code || socket.data.player !== existing.id)
      maySwitch(socket);
    const token = tokenFor(g.code, existing.id);
    attach(socket, g, existing, token);
    publish(g);
    return { token, code: g.code, id: existing.id };
  }
  assert(
    g.status === "lobby",
    "This match has started. Spectate or resume your saved seat.",
  );
  assert(g.players.length < g.settings.maxPlayers, "That room is full.");
  assert(
    availableRoom(socket, g),
    "This room requires an account or is unavailable for your profile.",
  );
  maySwitch(socket);
  assert(
    !g.players.some((p) => p.profileId === socket.data.profile),
    "Your profile already has a seat in this room. Use Reconnect.",
  );
  if (d.name)
    profiles.change(socket.data.profile, {
      type: "rename",
      name: cleanName(d.name),
    });
  const profile = profiles.profile(socket.data.profile),
    p = player(cleanName(d.name || profile.name));
  Object.assign(p, {
    crew: g.players.length,
    profileId: profile.id,
    appearance: profile.appearance,
  });
  g.players.push(p);
  const token = tokenFor(g.code, p.id);
  attach(socket, g, p, token);
  log(g, `${p.name} joined the crew.`);
  publish(g);
  return { token, code: g.code, id: p.id };
}
io.on("connection", (socket) => {
  let fpsCount = 0,
    count = 0,
    window = Date.now(),
    chatAt = [];
  function handle(event, fn) {
    socket.on(event, async (payload = {}, ack = () => {}) => {
      if (Date.now() - window > 10000) {
        window = Date.now();
        count = 0;
        fpsCount = 0;
      }
      const fps =
        event === "action" &&
        typeof payload?.type === "string" &&
        payload.type.startsWith("duel-") &&
        rooms.get(socket.data.code)?.duel?.mode === "fps" &&
        rooms.get(socket.data.code)?.duel?.fighters?.[socket.data.player];
      if (fps ? ++fpsCount > 400 : ++count > 30)
        return (
          typeof ack === "function" &&
          ack({ error: "Too many actions. Wait a moment." })
        );
      try {
        const result = await fn(payload);
        if (typeof ack === "function") ack({ ok: true, ...result });
      } catch (e) {
        if (typeof ack === "function")
          ack({ error: e.message || "Something went wrong." });
      }
    });
  }
  handle("profile-auth", (d) => {
    const a = profiles.authorize(d.token, d.name);
    socket.data.profile = a.profile.id;
    profileUpdates();
    return a;
  });
  for (const type of ["register", "login"])
    handle("profile-" + type, async (d) => {
      assert(
        !socket.data.code,
        "Leave your room before signing in or registering.",
      );
      const ip = socket.handshake.address;
      const a =
        type === "register"
          ? await profiles.register(getProfile(socket, d.name).id, d, ip)
          : await profiles.login(d, ip);
      socket.data.profile = a.profile.id;
      profileUpdates();
      return a;
    });
  for (const [event, operation] of [
    ["profile-email-request", profiles.requestEmail],
    ["profile-email-verify", profiles.verifyEmail],
    ["map-save", profiles.saveMap],
    ["map-delete", profiles.deleteMap],
  ]) {
    handle(event, async (d) => {
      const p = getProfile(socket);
      const result = await operation(p.id, d, socket.handshake.address);
      profileUpdates();
      return result;
    });
  }
  handle("profile-change", (d) => {
    getProfile(socket);
    if (d.type === "invite") {
      const g = session(socket, true);
      assert(
        g.code === d.code && g.status === "lobby",
        "Invite friends from an open lobby.",
      );
    }
    const profile = profiles.change(socket.data.profile, d);
    for (const g of rooms.values()) {
      let changed = false;
      for (const p of g.players)
        if (p.profileId === profile.id) {
          p.appearance = profile.appearance;
          if (g.status === "lobby") p.name = profile.name;
          changed = true;
        }
      if (changed) publish(g);
    }
    profileUpdates();
    return { profile };
  });
  handle("profile-find", (d) => {
    const p = profiles.find(d.query);
    assert(p, "No player found. Try their friend code or username.");
    return { profile: profiles.safe(p, socket.data.profile) };
  });
  handle("leaderboard", () => ({ players: profiles.leaderboard() }));
  handle("rooms", () => ({
    rooms: [...rooms.values()]
      .filter(
        (g) =>
          g.settings.visibility === "public" &&
          g.status !== "finished" &&
          availableRoom(socket, g),
      )
      .map((g) => ({
        code: g.code,
        players: g.players.length,
        maxPlayers: g.settings.maxPlayers,
        status: g.status,
        map: g.settings.map,
        teams: g.settings.teams,
        registeredOnly: g.settings.registeredOnly,
        limit: g.limit,
      })),
  }));
  handle("create", (d) => createRoom(socket, d));
  handle("join", (d) => joinRoom(socket, d));
  handle("quick-play", (d) => {
    getProfile(socket, d.name);
    const g = [...rooms.values()].find(
      (g) =>
        g.settings.visibility === "public" &&
        g.status === "lobby" &&
        g.players.length < g.settings.maxPlayers &&
        availableRoom(socket, g),
    );
    return g
      ? joinRoom(socket, { ...d, code: g.code })
      : createRoom(socket, {
          ...d,
          settings: { ...d.settings, visibility: "public" },
        });
  });
  handle("spectate", (d) => {
    maySwitch(socket);
    const g = rooms.get(
      String(d.code || "")
        .trim()
        .toUpperCase(),
    );
    assert(g, "Room not found.");
    getProfile(socket, d.name);
    assert(
      availableRoom(socket, g),
      "This room is unavailable for your profile.",
    );
    assert(g.spectators.length < 32, "The spectator bench is full.");
    const p = {
      id: randomBytes(16).toString("hex"),
      name: cleanName(d.name),
      profileId: socket.data.profile,
    };
    g.spectators.push(p);
    const token = tokenFor(g.code, p.id, true);
    attach(socket, g, p, token, true);
    publish(g);
    return { token, code: g.code, id: p.id };
  });
  handle("resume", (d) => {
    assert(typeof d.token === "string", "Missing seat token.");
    const s = sessions.get(d.token);
    assert(s, "Your saved seat has expired.");
    const g = rooms.get(s.code);
    let p = g?.players.find((x) => x.id === s.id);
    if (s.spectator && g) {
      p = g.spectators.find((x) => x.id === s.id) || {
        id: s.id,
        name: "Spectator",
      };
      if (!g.spectators.includes(p)) g.spectators.push(p);
    }
    assert(g && p, "Your room has expired.");
    attach(socket, g, p, d.token, s.spectator);
    publish(g);
    return { code: g.code, id: p.id, token: d.token };
  });
  handle("team-name", (d) => {
    const g = session(socket);
    assert(
      g.status === "lobby" && g.host === socket.data.player && g.settings.teams,
      "The host names teams before play.",
    );
    assert(["1", "2", "3", "4"].includes(String(d.team)), "Choose a team.");
    g.teamNames ||= {};
    g.teamNames[d.team] = cleanName(d.name);
    publish(g);
    return {};
  });
  handle("profile-logout", (d) => {
    assert(!socket.data.code, "Leave your room before signing out.");
    profiles.logout(d.token);
    const r = profiles.authorize(null, "New crew");
    socket.data.profile = r.profile.id;
    profileUpdates();
    return r;
  });
  handle("team", (d) => {
    const g = session(socket);
    assert(
      g.status === "lobby" && g.settings.teams,
      "Choose teams in the lobby.",
    );
    const p = g.players.find((p) => p.id === (d.id || socket.data.player));
    assert(
      p &&
        (p.id === socket.data.player ||
          (p.bot && g.host === socket.data.player)),
      "Choose your own team or a bot you host.",
    );
    assert(["1", "2", "3", "4"].includes(String(d.team)), "Choose a team.");
    p.team = String(d.team);
    publish(g);
    return {};
  });
  handle("lobby", (d) => {
    const g = session(socket);
    assert(
      g.host === socket.data.player,
      "Only the host can change the lobby.",
    );
    if (d.type === "rematch") {
      assert(g.status === "finished", "Finish the match before a rematch.");
      const old = g.players,
        opts = g.settings,
        limit = g.limit,
        revision = g.revision,
        code = g.code,
        teamNames = g.teamNames,
        host = g.host,
        city = {
          schemaVersion: g.schemaVersion,
          board: structuredClone(g.board),
          districts: g.districts,
          mapName: g.mapName,
          mapTheme: g.mapTheme,
        };
      for (const key of Object.keys(g)) delete g[key];
      Object.assign(
        g,
        room(
          code,
          old.find((p) => p.id === host),
        ),
        {
          settings: opts,
          limit,
          ...city,
          revision,
          teamNames,
          players: old.map((p) => ({
            ...player(p.name, p.bot),
            id: p.id,
            profileId: p.profileId,
            appearance: p.appearance,
            team: p.team,
            connected: p.connected,
          })),
        },
      );
    } else {
      assert(
        g.status === "lobby",
        "Settings are locked once the match starts.",
      );
      if (d.type === "add-bot") addBot(g);
      else if (d.type === "fill-bots") fillBots(g);
      else if (d.type === "remove-bot") {
        const i = g.players.findIndex((p) => p.id === d.id && p.bot);
        assert(i >= 0, "Only bot seats can be removed.");
        g.players.splice(i, 1);
      } else if (d.type === "settings") {
        const next = settings(d.settings, g.settings);
        assert(
          next.maxPlayers >= g.players.length,
          "Remove bot seats before reducing capacity.",
        );
        assert(
          !next.registeredOnly ||
            g.players.every(
              (p) => p.bot || profiles.profile(p.profileId)?.passwordHash,
            ),
          "Every human seat needs an account for this rule.",
        );
        const city = profiles.resolveMap(socket.data.profile, next.map);
        const limit = "limit" in d ? matchLimit(d.limit) : g.limit;
        g.settings = next;
        g.limit = limit;
        Object.assign(g, city);
      } else if (d.type === "start") {
        if (g.settings.autoFill) fillBots(g);
        teams(g);
        start(g, socket.data.player);
      } else throw new Error("Invalid lobby action.");
    }
    g.players.forEach((p, i) => (p.crew = i));
    publish(g);
    return {};
  });
  handle("chat", (d) => {
    const g = session(socket),
      p = g.players.find((x) => x.id === socket.data.player);
    const body = String(d.text || "")
      .split("")
      .map((c) => (c.charCodeAt(0) < 32 ? " " : c))
      .join("")
      .trim();
    assert(
      body.length > 0 && body.length <= 280,
      "Write a message of 1–280 characters.",
    );
    chatAt = chatAt.filter((t) => Date.now() - t < 10000);
    assert(chatAt.length < 5, "Slow down. Five chat messages per ten seconds.");
    chatAt.push(Date.now());
    assert(
      !d.team || (g.settings.teams && p.team != null),
      "Join a team to use team chat.",
    );
    g.chat.push({
      id: randomBytes(12).toString("hex"),
      player: p.id,
      profileId: p.profileId,
      name: p.name,
      text: body,
      team: d.team ? String(p.team) : null,
      time: Date.now(),
    });
    g.chat = g.chat.slice(-100);
    publish(g);
    return {};
  });
  handle("report", (d) => {
    const g = session(socket, true),
      p = g.players.find((x) => x.id === d.id);
    assert(p && !p.bot, "Choose a human player.");
    assert(
      typeof d.reason === "string" &&
        d.reason.trim().length >= 5 &&
        d.reason.length <= 300,
      "Describe the issue in 5–300 characters.",
    );
    assert(
      !g.reports?.some((r) => r.from === socket.data.player && r.to === p.id),
      "Your report is already saved for this player.",
    );
    g.reports ||= [];
    assert(
      g.reports.length < 100,
      "This room has reached its report limit. Mute or block the player.",
    );
    g.reports.push({
      from: socket.data.player,
      to: p.id,
      reason: d.reason.trim(),
      time: Date.now(),
    });
    save();
    return {};
  });
  handle("action", (d) => {
    const g = session(socket);
    action(g, socket.data.player, d);
    if (!(
      g.phase === "duel" &&
      g.duel?.arena &&
      g.duel.mode === "fps" &&
      d.type !== "duel-ready"
    ))
      publish(g);
    return {};
  });
  handle("leave", () => {
    const g = session(socket, true);
    assert(
      socket.data.spectator ||
        g.status !== "playing" ||
        g.players.find((p) => p.id === socket.data.player)?.out,
      "Forfeit your seat before leaving an active match.",
    );
    const id = socket.data.player;
    releasePresence(socket, g);
    if (socket.data.spectator)
      g.spectators = g.spectators.filter((p) => p.id !== id);
    else if (g.status === "lobby") {
      g.players = g.players.filter((p) => p.id !== id);
      g.players.forEach((p, i) => (p.crew = i));
      if (g.host === id) g.host = g.players.find((p) => !p.bot)?.id;
      if (!g.host) rooms.delete(g.code);
    }
    if (rooms.has(g.code)) publish(g);
    sessions.delete(socket.data.token);
    socket.leave(g.code);
    const profile = socket.data.profile;
    socket.data = { profile };
    save();
    return {};
  });
  socket.on("disconnect", () => {
    const g = rooms.get(socket.data.code);
    if (g) {
      const p = g.players.find((x) => x.id === socket.data.player);
      if (p)
        p.connected =
          p.bot ||
          [...io.sockets.sockets.values()].some((s) => s.data.player === p.id);
      if (socket.data.spectator)
        g.spectators = g.spectators.filter((p) => p.id !== socket.data.player);
      publish(g);
    }
    profileUpdates();
  });
});
const botDue = new Map();
const interval = setInterval(() => {
  for (const g of rooms.values()) {
    if (Date.now() - g.updatedAt > 24 * 3600000) {
      rooms.delete(g.code);
      for (const [t, s] of sessions) if (s.code === g.code) sessions.delete(t);
      save();
      continue;
    }
    if (g.status !== "playing") continue;
    if (!g.players.some((p) => !p.bot && p.connected)) {
      g.pausedAt ||= Date.now();
      continue;
    }
    if (g.phase === "duel" && g.duel?.arena && g.duel.mode === "fps") continue;
    if (g.phase === "duel" && g.duel?.mode === "fps") {
      if (tickDuel(g)) publish(g);
      if (g.phase === "duel") {
        for (const p of g.players.filter(
          (p) => p.bot && [g.duel.attacker, g.duel.defender].includes(p.id),
        )) {
          const key = g.code + ":fps:" + p.id;
          if ((botDue.get(key)?.at || 0) > Date.now()) continue;
          botDue.set(key, { at: Date.now() + 700 });
          const a = defaultAction(g, p.id);
          if (a) {
            try {
              action(g, p.id, a);
              publish(g);
            } catch {
              /* A concurrent hit may finish the duel before this bot acts. */
            }
          }
        }
        continue;
      }
    }
    if (g.phase === "auction" && Date.now() > g.deadline) {
      finishAuction(g);
      publish(g);
      continue;
    }
    const actors =
      g.phase === "duel"
        ? g.players.filter(
            (p) =>
              [g.duel.attacker, g.duel.defender].includes(p.id) &&
              !g.duel.choices[p.id],
          )
        : g.phase === "auction"
          ? g.players.filter(
              (p) =>
                p.bot &&
                !p.out &&
                !g.auction.passed.includes(p.id) &&
                g.auction.highBidder !== p.id,
            )
          : [active(g)];
    for (const p of actors) {
      const key = g.code + ":" + p.id,
        state =
          g.phase +
          ":" +
          g.turn +
          ":" +
          g.duel?.history.length +
          ":" +
          g.auction?.highBid;
      if (botDue.get(key)?.state !== state)
        botDue.set(key, { state, at: Date.now() + 1400 });
      const timed = Date.now() > g.deadline,
        eliminated = p.out && ["end", "duel-result"].includes(g.phase);
      if ((p.bot && Date.now() >= botDue.get(key).at) || timed || eliminated) {
        try {
          let a = defaultAction(g, p.id);
          if (!p.bot && timed) a = timeoutAction(g, p.id);
          if (a) action(g, p.id, a);
          publish(g);
          botDue.delete(key);
          if (g.phase !== "auction" && g.phase !== "duel") break;
        } catch (e) {
          console.error("Automatic turn failed:", g.code, g.phase, e.message);
          g.deadline = Date.now() + 15000;
        }
      }
    }
    if (g.trade && g.players.find((p) => p.id === g.trade.to)?.bot) {
      try {
        const tr = g.trade,
          t = board(g),
          value = (ids) =>
            ids.reduce(
              (n, id) => n + t[id].price * (g.props[id].mortgaged ? 0.5 : 1),
              0,
            );
        const accept = tr.giveTiles
          ? value(tr.giveTiles) + tr.cash + tr.giveEscapes * 100 >=
            value(tr.takeTiles) + tr.requestCash + tr.takeEscapes * 100
          : t[tr.give].price + tr.cash >= t[tr.take].price;
        action(g, tr.to, { type: "trade-respond", accept, offerId: tr.id });
        publish(g);
      } catch {
        g.trade = null;
        publish(g);
      }
    }
  }
}, 500);
// Combat has its own 20 Hz simulation; board turns retain their slower clock.
// Ten compact snapshots/second avoid sending the board, chat, and profiles per input.
const arenaInterval = setInterval(() => {
  const now = Date.now();
  for (const g of rooms.values()) {
    if (
      g.status !== "playing" ||
      g.phase !== "duel" ||
      !g.duel?.arena ||
      g.duel.mode !== "fps"
    )
      continue;
    if (!g.players.some((p) => !p.bot && p.connected)) {
      g.pausedAt ||= now;
      continue;
    }
    if (tickDuel(g, now) && g.phase !== "duel") {
      publish(g);
      continue;
    }
    for (const p of g.players.filter((p) => p.bot && g.duel.fighters[p.id])) {
      const key = g.code + ":arena:" + p.id;
      if ((botDue.get(key)?.at || 0) > now) continue;
      botDue.set(key, { at: now + 200 });
      try {
        const a = defaultAction(g, p.id);
        if (a) {
          action(g, p.id, a);
          if (a.type === "duel-ready" || g.phase !== "duel") publish(g);
        }
      } catch {
        /* An input can race settlement or the countdown. */
      }
      if (g.phase !== "duel") break;
    }
    if (g.phase !== "duel" || g.duel.stage !== "live") continue;
    if (now - (g.arenaSnapshotAt || 0) >= 95) {
      g.arenaSnapshotAt = now;
      const d = g.duel;
      io.to(g.code).emit("arena-state", {
        code: g.code,
        startsAt: d.startsAt,
        serverNow: now,
        fighters: d.fighters,
        projectiles: d.projectiles,
        shots: d.shots,
        tickAt: d.tickAt,
      });
    }
  }
}, 50);
const port = Number(process.env.PORT) || 3000;
http.listen(port, "0.0.0.0", () =>
  console.log(`Spin the Block listening on ${port}`),
);
function shutdown() {
  clearInterval(interval);
  clearInterval(arenaInterval);
  clearTimeout(saveTimer);
  try {
    writeFileSync(
      file,
      JSON.stringify({
        savedAt: Date.now(),
        rooms: [...rooms.values()],
        sessions: [...sessions],
      }),
      { mode: 0o600 },
    );
  } catch (e) {
    console.error(e.message);
  }
  io.close(() => http.close(() => process.exit(0)));
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
