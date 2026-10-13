import { randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { readFileSync, writeFileSync, renameSync } from "node:fs";
import { resolve } from "node:path";
import { assert, worth } from "./game.js";
import { COSMETICS } from "../shared/cosmetics.js";
const derive = promisify(scrypt);
const text = (v, n = 20) =>
  String(v || "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, n);
export function profileStore(dir) {
  const file = resolve(dir, "profiles.json"),
    profiles = new Map(),
    tokens = new Map(),
    attempts = new Map();
  let saved;
  try {
    saved = JSON.parse(readFileSync(file, "utf8"));
    for (const p of saved.profiles || []) profiles.set(p.id, p);
    for (const [t, id] of saved.tokens || [])
      if (profiles.has(id)) tokens.set(t, id);
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  function persist() {
    writeFileSync(
      file + ".tmp",
      JSON.stringify({ profiles: [...profiles.values()], tokens: [...tokens] }),
      { mode: 0o600 },
    );
    renameSync(file + ".tmp", file);
  }
  const profile = (id) => profiles.get(id);
  function safe(p, viewer = p.id) {
    return {
      id: p.id,
      code: p.code,
      name: p.name,
      username: p.username || null,
      registered: !!p.passwordHash,
      appearance: p.appearance,
      stats: p.stats,
      respect: p.respect,
      history: p.history.filter((h) => h.public || viewer === p.id),
      friends: viewer === p.id ? p.friends : undefined,
      incoming: viewer === p.id ? p.incoming : undefined,
      outgoing: viewer === p.id ? p.outgoing : undefined,
      blocks: viewer === p.id ? p.blocks : undefined,
      muted: viewer === p.id ? p.muted : undefined,
      invites: viewer === p.id ? p.invites : undefined,
    };
  }
  function create(name) {
    assert(profiles.size < 10000, "The profile desk is busy. Try again later.");
    const p = {
      id: randomUUID(),
      code: randomBytes(4).toString("hex").toUpperCase(),
      name: text(name) || "New crew",
      appearance: "crew",
      respect: 0,
      stats: { games: 0, wins: 0, practiceWins: 0, karma: 0 },
      friends: [],
      incoming: [],
      outgoing: [],
      blocks: [],
      muted: [],
      invites: [],
      history: [],
    };
    profiles.set(p.id, p);
    return p;
  }
  function issue(p) {
    const token = randomBytes(32).toString("hex");
    tokens.set(token, p.id);
    const all = [...tokens].filter(([, id]) => id === p.id);
    if (all.length > 20)
      for (const [t] of all.slice(0, all.length - 20)) tokens.delete(t);
    persist();
    return { token, profile: safe(p) };
  }
  function authorize(token, name) {
    const p = profile(tokens.get(token));
    if (p) return { token, profile: safe(p) };
    return issue(create(name));
  }
  function gate(key) {
    const now = Date.now(),
      a = attempts.get(key);
    if (!a || now - a.at > 900000) {
      if (attempts.size > 20000)
        for (const [k, v] of attempts)
          if (now - v.at > 900000) attempts.delete(k);
      attempts.set(key, { at: now, n: 1 });
      return;
    }
    a.n++;
    assert(a.n <= 8, "Too many sign-in attempts. Try again in 15 minutes.");
  }
  async function register(id, input, ip) {
    gate("register:" + ip);
    const p = profile(id);
    assert(p && !p.passwordHash, "This profile already has an account.");
    const username = String(input.username || "").toLowerCase();
    assert(
      /^[a-z0-9_]{3,20}$/.test(username),
      "Use 3–20 letters, numbers, or underscores.",
    );
    assert(
      typeof input.password === "string" &&
        input.password.length >= 12 &&
        input.password.length <= 128,
      "Use a password with 12–128 characters.",
    );
    assert(
      ![...profiles.values()].some((x) => x.username === username),
      "That username is taken.",
    );
    const salt = randomBytes(16).toString("hex"),
      hash = await derive(input.password, salt, 64);
    assert(
      ![...profiles.values()].some((x) => x.username === username),
      "That username is taken.",
    );
    assert(!p.passwordHash, "This profile already has an account.");
    p.username = username;
    p.salt = salt;
    p.passwordHash = hash.toString("hex");
    persist();
    return issue(p);
  }
  async function login(input, ip) {
    const username = String(input.username || "").toLowerCase();
    gate("login-ip:" + ip);
    gate("login-name:" + username);
    assert(
      typeof input.password === "string" && input.password.length <= 128,
      "Username or password is incorrect.",
    );
    const p = [...profiles.values()].find((x) => x.username === username),
      salt = p?.salt || "unknown-profile-salt";
    const hash = await derive(input.password, salt, 64);
    assert(
      p?.passwordHash &&
        timingSafeEqual(hash, Buffer.from(p.passwordHash, "hex")),
      "Username or password is incorrect.",
    );
    return issue(p);
  }
  function find(value) {
    return (
      profiles.get(value) ||
      [...profiles.values()].find(
        (p) =>
          p.code === String(value).toUpperCase() ||
          p.username === String(value).toLowerCase(),
      )
    );
  }
  function blocked(a, b) {
    return profile(a)?.blocks.includes(b) || profile(b)?.blocks.includes(a);
  }
  function change(id, a) {
    const p = profile(id);
    assert(p, "Reconnect your profile first.");
    let to;
    if (
      [
        "friend-request",
        "friend-accept",
        "friend-remove",
        "block",
        "mute",
        "invite",
      ].includes(a.type)
    ) {
      to = find(a.to);
      assert(
        to && to.id !== id,
        "Choose another player by friend code or username.",
      );
    }
    if (a.type === "rename") {
      p.name = text(a.name) || p.name;
    } else if (a.type === "equip") {
      const item = COSMETICS.find((x) => x.id === a.id);
      assert(
        item && p.respect >= item.cost,
        "Finish games to unlock this appearance.",
      );
      p.appearance = item.id;
    } else if (a.type === "friend-request") {
      assert(!blocked(id, to.id), "This friend request is unavailable.");
      assert(!p.friends.includes(to.id), "You are already friends.");
      assert(
        p.outgoing.length < 100 && to.incoming.length < 100,
        "Too many pending requests.",
      );
      if (!p.outgoing.includes(to.id)) {
        p.outgoing.push(to.id);
        to.incoming.push(id);
      }
    } else if (a.type === "friend-accept") {
      assert(
        p.incoming.includes(to.id) && !blocked(id, to.id),
        "This friend request is unavailable.",
      );
      p.incoming = p.incoming.filter((x) => x !== to.id);
      to.outgoing = to.outgoing.filter((x) => x !== id);
      if (a.accept !== false) {
        if (!p.friends.includes(to.id)) p.friends.push(to.id);
        if (!to.friends.includes(id)) to.friends.push(id);
      }
    } else if (a.type === "friend-remove") {
      p.friends = p.friends.filter((x) => x !== to.id);
      to.friends = to.friends.filter((x) => x !== id);
    } else if (a.type === "block") {
      if (a.blocked === false) p.blocks = p.blocks.filter((x) => x !== to.id);
      else if (!p.blocks.includes(to.id)) p.blocks.push(to.id);
    } else if (a.type === "mute") {
      if (a.muted === false) p.muted = p.muted.filter((x) => x !== to.id);
      else if (!p.muted.includes(to.id)) p.muted.push(to.id);
    } else if (a.type === "invite") {
      assert(
        p.friends.includes(to.id) && !blocked(id, to.id),
        "Invite an accepted friend.",
      );
      assert(
        typeof a.code === "string" && /^[A-F0-9]{6}$/.test(a.code),
        "Choose a valid room.",
      );
      to.invites = to.invites
        .filter((x) => Date.now() - x.time < 3600000)
        .slice(-9);
      to.invites.push({
        from: id,
        name: p.name,
        code: a.code,
        time: Date.now(),
        id: randomUUID(),
      });
    } else if (a.type === "dismiss-invite")
      p.invites = p.invites.filter((x) => x.id !== a.id);
    else throw new Error("Unknown profile action.");
    persist();
    return safe(p);
  }
  function friends(id, online) {
    const p = profile(id);
    return {
      friends: p.friends
        .map(profile)
        .filter(Boolean)
        .map((x) => ({ ...safe(x, id), online: online.has(x.id) })),
      incoming: p.incoming
        .map(profile)
        .filter(Boolean)
        .map((x) => safe(x, id)),
      outgoing: p.outgoing
        .map(profile)
        .filter(Boolean)
        .map((x) => safe(x, id)),
    };
  }
  function finish(g) {
    if (g.status !== "finished" || g.statsRecorded) return;
    g.statsRecorded = true;
    const humans = g.players.filter((p) => !p.bot && p.profileId),
      competitive = new Set(humans.map((p) => p.profileId)).size >= 2;
    for (const seat of humans) {
      const p = profile(seat.profileId);
      if (!p) continue;
      const won = (g.winners || [g.winner]).includes(seat.id);
      p.respect += competitive ? (won ? 10 : 3) : won ? 2 : 1;
      if (competitive) {
        p.stats.games++;
        p.stats.wins += won ? 1 : 0;
        p.stats.karma++;
      } else p.stats.practiceWins += won ? 1 : 0;
      p.history.unshift({
        code: g.code,
        public: g.settings.visibility === "public",
        won,
        map: g.settings.map,
        rounds: g.round,
        time: g.finishedAt || Date.now(),
        players: g.players.map((x) => ({
          name: x.name,
          bot: x.bot,
          out: x.out,
          worth: worth(g, x),
        })),
        settings: { ...g.settings },
        limit: g.limit,
      });
      p.history = p.history.slice(0, 30);
    }
    persist();
  }
  return {
    authorize,
    register,
    login,
    profile,
    safe,
    find,
    blocked,
    change,
    friends,
    finish,
    leaderboard: () =>
      [...profiles.values()]
        .filter((p) => p.stats.games > 0)
        .sort(
          (a, b) =>
            b.stats.wins - a.stats.wins || b.stats.karma - a.stats.karma,
        )
        .slice(0, 30)
        .map((p) => safe(p, null)),
  };
}
