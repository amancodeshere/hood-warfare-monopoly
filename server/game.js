import { createFPS, fpsAction, fpsWinner, fpsBot, fpsTick } from "./fps.js";
import { randomInt, randomUUID } from "node:crypto";
import {
  BOARD as DEFAULT_BOARD,
  CARDS,
  ROULETTE,
  makeBoard,
} from "../shared/board.js";
import { BOARD as LEGACY_BOARD } from "../shared/legacy-board.js";
import { DEFAULT_SETTINGS } from "../shared/settings.js";
import { extendedAction } from "./features.js";
export const board = (g) => g.board || DEFAULT_BOARD;
export const allied = (g, a, b) =>
  a === b ||
  (!!g.settings?.teams &&
    g.players.find((p) => p.id === a)?.team != null &&
    g.players.find((p) => p.id === a)?.team ===
      g.players.find((p) => p.id === b)?.team);
export function migrate(g) {
  if (!g.schemaVersion) {
    g.schemaVersion = 1;
    g.board = LEGACY_BOARD;
    g.settings = {
      ...DEFAULT_SETTINGS,
      auctions: false,
      doubles: false,
      autoFill: false,
    };
  }
  g.settings = { ...DEFAULT_SETTINGS, ...g.settings };
  g.chat ||= [];
  g.spectators ||= [];
  g.turnStarted ??= Date.now();
  g.players.forEach((p) => {
    p.reserve ??= 60;
    p.afk ??= 0;
    p.team ??= null;
  });
  return g;
}
export const secureRandom = (n) => randomInt(n);
export const assert = (ok, message) => {
  if (!ok) throw new Error(message);
};
export function player(name, bot = false) {
  return {
    id: randomUUID(),
    name,
    bot,
    crew: 0,
    cash: 1500,
    pos: 0,
    jail: 0,
    escapes: 0,
    out: false,
    connected: bot,
    team: null,
    reserve: 60,
    afk: 0,
  };
}
export function room(code, p) {
  return {
    code,
    host: p.id,
    players: [p],
    status: "lobby",
    phase: "roll",
    turn: 0,
    round: 1,
    limit: null,
    schemaVersion: 2,
    board: makeBoard(),
    settings: { ...DEFAULT_SETTINGS },
    teamNames: { 1: "Eastside", 2: "Sunset", 3: "Northside", 4: "After Hours" },
    chat: [],
    spectators: [],
    doubleCount: 0,
    extraRoll: false,
    deadline: 0,
    props: {},
    log: [],
    dice: [1, 1],
    pending: null,
    duel: null,
    trade: null,
    pot: 0,
    revision: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
export const active = (g) => g.players[g.turn];
export const holdings = (g, id) =>
  board(g).filter((t) => g.props[t.id]?.owner === id);
export const worth = (g, p) =>
  p.cash +
  holdings(g, p.id).reduce(
    (s, t) =>
      s +
      (g.props[t.id].mortgaged ? t.price / 2 : t.price) +
      g.props[t.id].level * (t.build || 0),
    0,
  );
export function log(g, text, kind = "info") {
  g.log.unshift({ id: randomUUID(), text, kind, time: Date.now() });
  g.log = g.log.slice(0, 60);
}
export function phase(g, value) {
  g.phase = value;
  if (value === "rent" && !g.debtExtended) {
    g.turnDeadline = (g.turnDeadline || Date.now()) + 90000;
    g.debtExtended = true;
  }
  g.deadline =
    value === "duel"
      ? Date.now() + 25000
      : value === "auction"
        ? Date.now() + 20000
        : g.turnDeadline || Date.now() + (g.settings?.turnSeconds || 90) * 1000;
}
export function fullSet(g, t, id) {
  const BOARD = board(g);
  return (
    t.group !== undefined &&
    BOARD.filter((x) => x.group === t.group).every(
      (x) =>
        g.props[x.id] &&
        allied(g, g.props[x.id].owner, id) &&
        !g.props[x.id].mortgaged,
    )
  );
}
export function rent(g, t) {
  const BOARD = board(g);
  const q = g.props[t.id];
  if (
    !q ||
    q.mortgaged ||
    (g.settings?.prisonRent === false &&
      g.players.find((p) => p.id === q.owner)?.jail)
  )
    return 0;
  if (t.type === "utility")
    return (
      (g.dice[0] + g.dice[1]) *
      (BOARD.filter(
        (x) =>
          x.type === "utility" &&
          g.props[x.id] &&
          allied(g, g.props[x.id].owner, q.owner) &&
          !g.props[x.id].mortgaged,
      ).length >= 2
        ? 10
        : 4)
    );
  if (t.type === "transit")
    return (
      (g.schemaVersion === 1 ? 45 : 25) *
      (g.schemaVersion === 1
        ? holdings(g, q.owner).filter(
            (x) => x.type === "transit" && !g.props[x.id].mortgaged,
          ).length
        : 2 **
          (BOARD.filter(
            (x) =>
              x.type === "transit" &&
              g.props[x.id] &&
              allied(g, g.props[x.id].owner, q.owner) &&
              !g.props[x.id].mortgaged,
          ).length -
            1))
    );
  return (
    t.rent *
    (q.level
      ? [1, 3, 6, 10, 16, 25][q.level]
      : fullSet(g, t, q.owner) && g.settings?.doubleRent !== false
        ? 2
        : 1)
  );
}
export function start(g, id) {
  assert(g.status === "lobby" && g.host === id, "Only the host can start.");
  assert(g.players.length >= 2, "Add a friend or a bot first.");
  if (g.settings.teams)
    assert(
      new Set(g.players.map((p) => p.team ?? p.id)).size >= 2,
      "Create at least two opposing teams.",
    );
  if (g.settings.randomOrder) {
    for (let i = g.players.length - 1; i > 0; i--) {
      const j = secureRandom(i + 1);
      [g.players[i], g.players[j]] = [g.players[j], g.players[i]];
    }
  }
  g.players.forEach((p, i) => {
    p.crew = i;
    p.cash = g.settings.startingCash;
  });
  g.status = "playing";
  prepareTurn(g);
  phase(g, "roll");
  log(
    g,
    `The block is open. Every crew starts with $${g.settings.startingCash}.`,
    "good",
  );
}
function jail(g, p) {
  p.pos = board(g).findIndex((t) => t.type === "jail");
  g.extraRoll = false;
  g.doubleCount = 0;
  p.jail = 2;
  log(g, `${p.name} was sent to County Jail.`, "bad");
}
function charge(g, p, amount, owner = null) {
  if (p.cash >= amount) {
    p.cash -= amount;
    if (owner) owner.cash += amount;
    else g.pot += amount;
    log(g, `${p.name} paid $${amount}${owner ? ` to ${owner.name}` : ""}.`);
    phase(g, "end");
  } else {
    g.pending = { amount, owner: owner?.id || null, tile: p.pos };
    phase(g, "rent");
    log(g, `${p.name} owes $${amount}. Time to make a move.`, "bad");
  }
}
export function land(g, rng = secureRandom) {
  const BOARD = board(g);
  const p = active(g),
    t = BOARD[p.pos];
  g.pending = null;
  if (t.price) {
    const q = g.props[t.id];
    if (!q) {
      phase(g, "buy");
    } else if (!allied(g, q.owner, p.id) && rent(g, t) > 0) {
      const amount = rent(g, t);
      g.pending = { amount, owner: q.owner, tile: t.id };
      phase(g, "rent");
    } else phase(g, "end");
  } else if (t.type === "card") {
    g.pending = { card: structuredClone(CARDS[rng(CARDS.length)]) };
    phase(g, "card");
  } else if (t.type === "roulette") phase(g, "roulette");
  else if (t.type === "stoppa") phase(g, "stoppa");
  else if (t.type === "tax") charge(g, p, 100);
  else if (t.type === "raid") {
    jail(g, p);
    phase(g, "end");
  } else if (t.type === "parking") {
    if (g.pot && g.settings?.communityCash !== false) {
      log(g, `${p.name} scooped the $${g.pot} community pot.`, "good");
      p.cash += g.pot;
      g.pot = 0;
    }
    phase(g, "end");
  } else phase(g, "end");
}
function cardEffect(g, c) {
  const p = active(g);
  log(g, `${p.name}: ${c.title}. ${c.text}`, c.tone);
  if (c.jail) jail(g, p);
  if (c.escape) p.escapes++;
  if (c.home) {
    p.pos = 0;
    p.cash += 200;
  }
  phase(g, "end");
  if (c.amount > 0) p.cash += c.amount;
  if (c.amount < 0) charge(g, p, -c.amount);
  if (c.repair)
    charge(
      g,
      p,
      Math.min(
        200,
        holdings(g, p.id).reduce((s, t) => s + g.props[t.id].level * 50, 0),
      ),
    );
}
export function victory(g) {
  const alive = g.players.filter((p) => !p.out);
  const sides = new Set(
    alive.map((p) =>
      g.settings?.teams && p.team != null ? "team:" + p.team : p.id,
    ),
  );
  if (
    sides.size <= 1 ||
    (g.limit !== null && g.limit !== undefined && g.round > g.limit)
  ) {
    g.status = "finished";
    const sideWorth = (p) =>
      g.settings?.teams && p.team != null
        ? alive
            .filter((x) => x.team === p.team)
            .reduce((n, x) => n + worth(g, x), 0)
        : worth(g, p);
    g.winner = [...alive].sort((a, b) => sideWorth(b) - sideWorth(a))[0]?.id;
    g.winners = g.players
      .filter((p) => allied(g, p.id, g.winner))
      .map((p) => p.id);
    g.finishedAt = Date.now();
    g.trade = null;
    phase(g, "finished");
    log(
      g,
      `${g.players.find((p) => p.id === g.winner)?.name || "The bank"} owns the block.`,
      "good",
    );
    return true;
  }
  return false;
}
export function eliminate(g, p, creditor) {
  const wasActive = active(g).id === p.id;
  const interrupted = {
    phase: g.phase,
    pending: g.pending,
    deadline: g.deadline,
  };
  const teammate = g.players.find(
    (x) => !x.out && x.id !== p.id && allied(g, x.id, p.id),
  );
  const heir = teammate || creditor;
  if (!wasActive && interrupted.pending?.owner === p.id) {
    if (heir) interrupted.pending = { ...interrupted.pending, owner: heir.id };
    else {
      interrupted.pending = null;
      interrupted.phase = "end";
    }
  }
  p.out = true;
  for (const t of holdings(g, p.id)) {
    if (heir) g.props[t.id].owner = heir.id;
    else delete g.props[t.id];
  }
  if (heir) heir.cash += p.cash;
  if (heir) heir.escapes += p.escapes;
  p.escapes = 0;
  p.cash = 0;
  g.pending = null;
  g.trade = null;
  log(
    g,
    `${p.name} is out${heir ? `. ${heir.name} inherits their turf` : ". The turf returns to the market"}.`,
    "bad",
  );
  if (!victory(g)) {
    if (wasActive) phase(g, "end");
    else {
      g.phase = interrupted.phase;
      g.pending = interrupted.pending;
      g.deadline = interrupted.deadline;
    }
  }
}
export function next(g) {
  if (g.extraRoll && !active(g).out && !active(g).jail) {
    g.extraRoll = false;
    g.pending = null;
    g.trade = null;
    phase(g, "roll");
    log(g, `${active(g).name} rolled doubles. Run it back!`, "good");
    return;
  }
  finishClock(g);
  g.extraRoll = false;
  g.doubleCount = 0;
  g.trade = null;
  g.pending = null;
  g.duel = null;
  do {
    g.turn = (g.turn + 1) % g.players.length;
    if (g.turn === 0) g.round++;
  } while (g.players[g.turn].out);
  if (victory(g)) return;
  prepareTurn(g);
  phase(g, active(g).jail ? "jail" : "roll");
}
function settleDuel(g, winner) {
  const d = g.duel;
  d.winner = winner;
  if (d.mode === "fps") d.stage = "finished";
  const p = g.players.find((p) => p.id === d.attacker),
    owner = g.players.find((p) => p.id === d.defender);
  if (d.winner === d.attacker) {
    log(
      g,
      `${p.name} wins the shootout. The $${d.debt} rent is wiped.`,
      "good",
    );
    g.pending = null;
  } else eliminate(g, p, owner);
  if (g.status !== "finished") phase(g, "duel-result");
}
export function tickDuel(g, now = Date.now()) {
  if (g.phase !== "duel" || g.duel?.mode !== "fps") return false;
  const d = g.duel;
  const changed = fpsTick(d, now);
  if (d.stage === "ready" && now >= g.deadline) {
    // An absent challenger forfeits; an absent landlord concedes the debt.
    settleDuel(g, d.ready.includes(d.attacker) ? d.attacker : d.defender);
    return true;
  }
  const winner = fpsWinner(d, now);
  if (winner) {
    settleDuel(g, winner);
    return true;
  }
  return changed;
}
export function resolveDuel(g, rng = secureRandom) {
  const d = g.duel;
  if (!d || !d.choices[d.attacker] || !d.choices[d.defender]) return;
  const a = d.choices[d.attacker],
    b = d.choices[d.defender];
  const beats = { fire: "flank", flank: "guard", guard: "fire" };
  let winner = null;
  if (a !== b) {
    winner = beats[a] === b ? d.attacker : d.defender;
    d.scores[winner]++;
  }
  d.history.push({ a, b, winner });
  d.choices = {};
  if (Math.max(...Object.values(d.scores)) >= 2 || d.history.length >= 5) {
    d.winner =
      d.scores[d.attacker] === d.scores[d.defender]
        ? [d.attacker, d.defender][rng(2)]
        : d.scores[d.attacker] > d.scores[d.defender]
          ? d.attacker
          : d.defender;
    settleDuel(g, d.winner);
  } else phase(g, "duel");
}
export function action(g, id, a, rng = secureRandom, options = {}) {
  const BOARD = board(g);
  assert(g.status === "playing", "This match is not active.");
  assert(a && typeof a.type === "string", "Invalid action.");
  const p = g.players.find((x) => x.id === id);
  assert(
    p &&
      (!p.out ||
        (active(g).id === id &&
          a.type === "end" &&
          ["end", "duel-result"].includes(g.phase))),
    "You are not an active player.",
  );
  if (
    g.phase === "duel" &&
    g.duel?.mode === "fps" &&
    a.type === "forfeit" &&
    [g.duel.attacker, g.duel.defender].includes(id)
  ) {
    if (id === g.duel.attacker) settleDuel(g, g.duel.defender);
    else {
      eliminate(g, p);
      settleDuel(g, g.duel.attacker);
    }
    return;
  }
  if (extendedAction(g, id, a, rng, options)) return;
  if (g.duel?.mode === "fps" && a.type.startsWith("duel-")) {
    assert(g.phase === "duel", "This shootout is over.");
    const now = options.now ?? Date.now();
    fpsAction(g.duel, id, a, now);
    if (g.duel.stage === "live") g.deadline = g.duel.endsAt;
    tickDuel(g, now);
    return;
  }
  if (a.type === "duel-choice") {
    assert(
      g.phase === "duel" && [g.duel.attacker, g.duel.defender].includes(id),
      "You are not in this duel.",
    );
    assert(
      ["fire", "flank", "guard"].includes(a.choice),
      "Choose a valid tactic.",
    );
    assert(!g.duel.choices[id], "Your tactic is already locked.");
    g.duel.choices[id] = a.choice;
    resolveDuel(g, rng);
    return;
  }
  if (a.type === "trade-respond") {
    const tr = g.trade;
    assert(tr && tr.to === id, "No trade to answer.");
    if (a.accept) {
      const from = g.players.find((x) => x.id === tr.from);
      assert(!from.out && !p.out, "This trade is no longer available.");
      assert(
        g.props[tr.give]?.owner === from.id && g.props[tr.take]?.owner === id,
        "The properties changed hands.",
      );
      assert(
        !g.props[tr.give].level && !g.props[tr.take].level,
        "Sell upgrades before trading.",
      );
      assert(
        from.cash >= tr.cash,
        "The offering crew cannot afford this trade.",
      );
      g.props[tr.give].owner = id;
      g.props[tr.take].owner = from.id;
      from.cash -= tr.cash;
      p.cash += tr.cash;
      log(g, `${from.name} and ${p.name} traded blocks.`, "good");
    }
    g.trade = null;
    return;
  }
  assert(active(g).id === id, "Wait for your turn.");
  if (a.type === "roll") {
    assert(g.phase === "roll", "You cannot roll right now.");
    g.dice = [rng(6) + 1, rng(6) + 1];
    const doubles = g.settings?.doubles && g.dice[0] === g.dice[1];
    g.doubleCount = doubles ? g.doubleCount + 1 : 0;
    g.extraRoll = !!doubles;
    if (g.doubleCount >= 3) {
      jail(g, p);
      phase(g, "end");
      return;
    }
    const old = p.pos;
    p.pos = (p.pos + g.dice[0] + g.dice[1]) % BOARD.length;
    if (p.pos < old) {
      p.cash += 200;
      log(g, `${p.name} passed Home Base. +$200.`, "good");
    }
    g.lastMove = {
      id: randomUUID(),
      player: p.id,
      from: old,
      steps: g.dice[0] + g.dice[1],
    };
    log(g, `${p.name} rolled ${g.dice[0] + g.dice[1]} → ${BOARD[p.pos].name}.`);
    land(g, rng);
  } else if (a.type === "buy") {
    assert(g.phase === "buy", "Nothing to buy.");
    const t = BOARD[p.pos];
    assert(
      !g.props[t.id] && p.cash >= t.price,
      "You cannot afford this block.",
    );
    p.cash -= t.price;
    g.props[t.id] = { owner: id, level: 0, mortgaged: false };
    log(g, `${p.name} claimed ${t.name}.`, "good");
    phase(g, "end");
  } else if (a.type === "skip") {
    assert(g.phase === "buy", "Nothing to pass on.");
    if (g.settings?.auctions) {
      g.auction = {
        tile: p.pos,
        highBid: 0,
        highBidder: null,
        passed: [],
        startedAt: Date.now(),
      };
      phase(g, "auction");
    } else phase(g, "end");
  } else if (a.type === "pay") {
    assert(g.phase === "rent" && g.pending, "No debt to pay.");
    const d = g.pending;
    assert(p.cash >= d.amount, "Raise cash first, or challenge the landlord.");
    p.cash -= d.amount;
    const owner = g.players.find((x) => x.id === d.owner);
    if (owner) owner.cash += d.amount;
    else g.pot += d.amount;
    log(g, `${p.name} paid $${d.amount}${owner ? ` to ${owner.name}` : ""}.`);
    g.pending = null;
    phase(g, "end");
  } else if (a.type === "shootout") {
    assert(
      g.phase === "rent" && g.pending?.owner && p.cash < g.pending.amount,
      "Shootouts are only available when you cannot afford player rent.",
    );
    const owner = g.players.find((x) => x.id === g.pending.owner);
    assert(owner && !owner.out, "This landlord is no longer active.");
    g.duel = {
      ...createFPS([id, owner.id]),
      attacker: id,
      defender: owner.id,
      debt: g.pending.amount,
      scores: { [id]: 0, [owner.id]: 0 },
      choices: {},
      history: [],
      winner: null,
    };
    phase(g, "duel");
    log(g, `${p.name} challenged ${owner.name} to a shootout!`, "bad");
  } else if (a.type === "surrender") {
    assert(
      g.phase === "rent" && g.pending && p.cash < g.pending.amount,
      "You can only surrender when you cannot pay.",
    );
    eliminate(
      g,
      p,
      g.players.find((x) => x.id === g.pending.owner),
    );
  } else if (a.type === "card") {
    assert(g.phase === "card", "No card to draw.");
    const c = g.pending.card;
    g.pending = null;
    cardEffect(g, c);
  } else if (a.type === "spin") {
    assert(g.phase === "roulette", "You can only spin on a Roulette space.");
    const pool = ROULETTE.flatMap((x, i) => Array(x.weight).fill(i)),
      index = pool[rng(pool.length)];
    g.pending = { roulette: index, card: { ...ROULETTE[index] } };
    phase(g, "roulette-result");
    log(g, `${p.name} spun the street wheel.`);
  } else if (a.type === "collect") {
    assert(g.phase === "roulette-result", "No wheel result to collect.");
    const c = g.pending.card;
    g.pending = null;
    cardEffect(g, c);
  } else if (a.type === "jail-pay") {
    assert(g.phase === "jail" && p.jail, "You are not in jail.");
    assert(p.cash >= 100, "You need $100 to post bail.");
    p.cash -= 100;
    g.pot += 100;
    p.jail = 0;
    phase(g, "roll");
    log(g, `${p.name} posted bail.`);
  } else if (a.type === "jail-card") {
    assert(
      g.phase === "jail" && p.jail && p.escapes > 0,
      "You need an escape card.",
    );
    p.escapes--;
    p.jail = 0;
    phase(g, "roll");
    log(g, `${p.name} used an escape card.`);
  } else if (a.type === "jail-wait") {
    assert(g.phase === "jail" && p.jail, "You are not in jail.");
    p.jail--;
    log(g, `${p.name} served a jail turn${!p.jail ? " and is free" : ""}.`);
    phase(g, "end");
  } else if (["upgrade", "sell", "mortgage", "redeem"].includes(a.type)) {
    assert(
      ["roll", "end", "rent", "buy"].includes(g.phase),
      "Finish the current event first.",
    );
    const t = BOARD[a.tile],
      q = g.props[a.tile];
    assert(t?.price && q?.owner === id, "You do not own that block.");
    if (a.type === "upgrade") {
      assert(
        t.type === "property" && fullSet(g, t, id),
        "Own the entire district with no mortgages to build.",
      );
      assert(
        q.level < (g.schemaVersion === 1 ? 3 : 5) && p.cash >= t.build,
        "You cannot build here yet.",
      );
      const min = Math.min(
        ...BOARD.filter((x) => x.group === t.group && g.props[x.id]).map(
          (x) => g.props[x.id].level,
        ),
      );
      assert(
        !g.settings?.evenBuild || q.level === min,
        "Build evenly across your district.",
      );
      p.cash -= t.build;
      q.level++;
    }
    if (a.type === "sell") {
      assert(q.level > 0, "No business to sell.");
      const max = Math.max(
        ...BOARD.filter((x) => x.group === t.group && g.props[x.id]).map(
          (x) => g.props[x.id].level,
        ),
      );
      assert(
        !g.settings?.evenBuild || q.level === max,
        "Sell evenly across your district.",
      );
      q.level--;
      p.cash += Math.floor(t.build / 2);
    }
    if (a.type === "mortgage") {
      assert(
        g.settings?.mortgage !== false,
        "Mortgages are disabled in this room.",
      );
      assert(!q.mortgaged && !q.level, "Sell businesses before mortgaging.");
      assert(
        t.group === undefined ||
          !BOARD.filter((x) => x.group === t.group && g.props[x.id]).some(
            (x) => g.props[x.id].level,
          ),
        "Sell all district businesses first.",
      );
      q.mortgaged = true;
      p.cash += t.price / 2;
    }
    if (a.type === "redeem") {
      const cost = Math.ceil((t.price * 55) / 100);
      assert(q.mortgaged && p.cash >= cost, "Not enough cash to redeem.");
      q.mortgaged = false;
      p.cash -= cost;
    }
    log(
      g,
      `${p.name}: ${a.type === "upgrade" ? "built on" : a.type === "sell" ? "sold a business on" : a.type === "mortgage" ? "mortgaged" : "redeemed"} ${t.name}.`,
    );
  } else if (a.type === "trade") {
    assert(
      ["roll", "end"].includes(g.phase),
      "Trade before rolling or after resolving your tile.",
    );
    assert(!g.trade, "Wait for the current trade to be answered.");
    const to = g.players.find((x) => x.id === a.to);
    assert(to && !to.out && to.id !== id, "Choose another active crew.");
    assert(
      g.props[a.give]?.owner === id && g.props[a.take]?.owner === to.id,
      "Choose a block from each crew.",
    );
    assert(
      !g.props[a.give].level && !g.props[a.take].level,
      "Sell businesses before trading.",
    );
    assert(
      Number.isInteger(a.cash) && a.cash >= 0 && a.cash <= p.cash,
      "Choose an affordable cash bonus.",
    );
    g.trade = { from: id, to: a.to, give: a.give, take: a.take, cash: a.cash };
  } else if (a.type === "trade-cancel") {
    assert(g.trade?.from === id, "No trade to cancel.");
    g.trade = null;
  } else if (a.type === "end") {
    assert(
      ["end", "duel-result"].includes(g.phase),
      "Resolve this tile first.",
    );
    next(g);
  } else throw new Error("Unknown action.");
}
export function defaultAction(g, id) {
  const BOARD = board(g);
  const p = g.players.find((x) => x.id === id);
  if (g.phase === "auction") {
    const au = g.auction,
      t = BOARD[au.tile];
    return p.cash > au.highBid + 210 && au.highBid < t.price * 1.2
      ? { type: "auction-bid", amount: au.highBid + 10 }
      : { type: "auction-pass" };
  }
  if (g.phase === "duel" && g.duel.mode === "fps")
    return fpsBot(g.duel, id, secureRandom);
  if (g.phase === "duel")
    return {
      type: "duel-choice",
      choice: ["fire", "flank", "guard"][secureRandom(3)],
    };
  switch (g.phase) {
    case "roll":
      return { type: "roll" };
    case "buy":
      return { type: p.cash >= BOARD[p.pos].price + 180 ? "buy" : "skip" };
    case "rent":
      if (p.cash >= g.pending.amount) return { type: "pay" };
      else {
        const t = holdings(g, id).find(
          (t) =>
            !g.props[t.id].mortgaged &&
            !g.props[t.id].level &&
            (t.group === undefined ||
              !BOARD.some((x) => x.group === t.group && g.props[x.id]?.level)),
        );
        if (t && g.settings?.mortgage !== false)
          return { type: "mortgage", tile: t.id };
        const built = holdings(g, id)
          .sort((a, b) => g.props[b.id].level - g.props[a.id].level)
          .find(
            (t) =>
              g.props[t.id].level > 0 &&
              (!g.settings.evenBuild ||
                g.props[t.id].level ===
                  Math.max(
                    ...BOARD.filter((x) => x.group === t.group).map(
                      (x) => g.props[x.id]?.level || 0,
                    ),
                  )),
          );
        if (built) return { type: "sell", tile: built.id };
        return { type: g.pending.owner ? "shootout" : "surrender" };
      }
    case "card":
      return { type: "card" };
    case "stoppa":
      return { type: "stoppa-spin" };
    case "stoppa-result":
      return { type: "stoppa-collect" };
    case "roulette":
      return { type: "spin" };
    case "roulette-result":
      return { type: "collect" };
    case "jail":
      return {
        type: p.escapes
          ? "jail-card"
          : p.cash >= 300
            ? "jail-pay"
            : "jail-wait",
      };
    default: {
      if (p.bot && g.phase === "end" && p.cash > 450) {
        const t = holdings(g, id).find(
          (t) =>
            t.type === "property" &&
            fullSet(g, t, id) &&
            g.props[t.id].level < (g.schemaVersion === 1 ? 3 : 5) &&
            p.cash - t.build > 350 &&
            g.props[t.id].level ===
              Math.min(
                ...BOARD.filter(
                  (x) => x.group === t.group && g.props[x.id],
                ).map((x) => g.props[x.id].level),
              ),
        );
        if (t) return { type: "upgrade", tile: t.id };
      }
      return { type: "end" };
    }
  }
}
export function view(g, id, hidden = []) {
  const v = structuredClone(g);
  if (v.duel) {
    v.duel.locked = Object.keys(v.duel.choices);
    delete v.duel.choices;
  }
  const me = g.players.find((p) => p.id === id);
  v.chat = (g.chat || []).filter(
    (m) =>
      !hidden.includes(m.profileId) &&
      (!m.team || (me?.team != null && m.team === String(me.team))),
  );
  delete v.reports;
  v.serverNow = Date.now();
  v.me = id;
  return v;
}

export function prepareTurn(g) {
  g.turnStarted = Date.now();
  g.debtExtended = false;
  g.timeDonors = [];
  g.autoTurn = false;
  g.timeoutCounted = false;
  g.turnDeadline =
    Date.now() +
    ((g.settings?.turnSeconds || 90) + (active(g).reserve || 0)) * 1000;
}
function finishClock(g) {
  const p = active(g);
  const used = Math.max(
    0,
    (Date.now() - g.turnStarted) / 1000 - (g.settings?.turnSeconds || 90),
  );
  p.reserve = Math.floor(
    Math.min(180, Math.max(0, (p.reserve || 0) - used) + (g.autoTurn ? 0 : 15)),
  );
  if (!g.autoTurn) p.afk = 0;
}
export function finishAuction(g) {
  const a = g.auction;
  if (!a) return;
  const p = g.players.find((p) => p.id === a.highBidder);
  if (p && !p.out && p.cash >= a.highBid && !g.props[a.tile]) {
    p.cash -= a.highBid;
    g.props[a.tile] = { owner: p.id, level: 0, mortgaged: false };
    log(g, `${p.name} won ${board(g)[a.tile].name} for $${a.highBid}.`, "good");
  } else log(g, `No bids. ${board(g)[a.tile].name} stays on the market.`);
  g.auction = null;
  g.turnDeadline = Math.max(g.turnDeadline || 0, Date.now() + 15000);
  phase(g, "end");
}

export function timeoutAction(g, id) {
  const p = g.players.find((p) => p.id === id);
  if (["duel", "auction"].includes(g.phase)) return defaultAction(g, id);
  g.autoTurn = true;
  if (!g.timeoutCounted) {
    g.timeoutCounted = true;
    p.afk = (p.afk || 0) + 1;
  }
  if (p.afk >= 2 && !p.out && g.phase !== "duel-result") {
    eliminate(
      g,
      p,
      g.phase === "rent"
        ? g.players.find((x) => x.id === g.pending?.owner)
        : null,
    );
    return null;
  }
  if (g.phase === "buy") {
    phase(g, "end");
    log(g, `${p.name} timed out. The block stays unclaimed.`);
    return null;
  }
  if (g.phase === "rent" && p.cash < g.pending.amount)
    return { type: "surrender" };
  return defaultAction(g, id);
}
