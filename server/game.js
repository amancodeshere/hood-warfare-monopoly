import { randomInt, randomUUID } from "node:crypto";
import { BOARD, CARDS, ROULETTE } from "../shared/board.js";
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
    limit: 20,
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
  BOARD.filter((t) => g.props[t.id]?.owner === id);
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
  g.deadline = Date.now() + (value === "duel" ? 25000 : 90000);
}
export function fullSet(g, t, id) {
  return (
    t.group !== undefined &&
    BOARD.filter((x) => x.group === t.group).every(
      (x) => g.props[x.id]?.owner === id && !g.props[x.id].mortgaged,
    )
  );
}
export function rent(g, t) {
  const q = g.props[t.id];
  if (!q || q.mortgaged) return 0;
  if (t.type === "transit")
    return (
      45 *
      holdings(g, q.owner).filter(
        (x) => x.type === "transit" && !g.props[x.id].mortgaged,
      ).length
    );
  return (
    t.rent * (q.level ? [1, 3, 6, 10][q.level] : fullSet(g, t, q.owner) ? 2 : 1)
  );
}
export function start(g, id) {
  assert(g.status === "lobby" && g.host === id, "Only the host can start.");
  assert(g.players.length >= 2, "Add a friend or a bot first.");
  g.players.forEach((p, i) => (p.crew = i));
  g.status = "playing";
  phase(g, "roll");
  log(g, "The block is open. Every crew starts with $1,500.", "good");
}
function jail(g, p) {
  p.pos = 7;
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
  const p = active(g),
    t = BOARD[p.pos];
  g.pending = null;
  if (t.price) {
    const q = g.props[t.id];
    if (!q) {
      phase(g, "buy");
    } else if (q.owner !== p.id && rent(g, t) > 0) {
      const amount = rent(g, t);
      g.pending = { amount, owner: q.owner, tile: t.id };
      phase(g, "rent");
    } else phase(g, "end");
  } else if (t.type === "card") {
    g.pending = { card: structuredClone(CARDS[rng(CARDS.length)]) };
    phase(g, "card");
  } else if (t.type === "roulette") phase(g, "roulette");
  else if (t.type === "tax") charge(g, p, 100);
  else if (t.type === "raid") {
    jail(g, p);
    phase(g, "end");
  } else if (t.type === "parking") {
    if (g.pot) {
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
function victory(g) {
  const alive = g.players.filter((p) => !p.out);
  if (alive.length <= 1 || g.round > g.limit) {
    g.status = "finished";
    g.winner = [...alive].sort((a, b) => worth(g, b) - worth(g, a))[0]?.id;
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
function eliminate(g, p, creditor) {
  p.out = true;
  for (const t of holdings(g, p.id)) {
    if (creditor) g.props[t.id].owner = creditor.id;
    else delete g.props[t.id];
  }
  if (creditor) creditor.cash += p.cash;
  p.cash = 0;
  g.pending = null;
  g.trade = null;
  log(
    g,
    `${p.name} is out${creditor ? `. ${creditor.name} inherits their turf` : ". The turf returns to the market"}.`,
    "bad",
  );
  if (!victory(g)) phase(g, "end");
}
function next(g) {
  g.trade = null;
  g.pending = null;
  g.duel = null;
  do {
    g.turn = (g.turn + 1) % g.players.length;
    if (g.turn === 0) g.round++;
  } while (g.players[g.turn].out);
  if (victory(g)) return;
  phase(g, active(g).jail ? "jail" : "roll");
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
  } else phase(g, "duel");
}
export function action(g, id, a, rng = secureRandom) {
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
    const old = p.pos;
    p.pos = (p.pos + g.dice[0] + g.dice[1]) % BOARD.length;
    if (p.pos < old) {
      p.cash += 200;
      log(g, `${p.name} passed Home Base. +$200.`, "good");
    }
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
    phase(g, "end");
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
      assert(q.level < 3 && p.cash >= t.build, "You cannot build here yet.");
      const min = Math.min(
        ...holdings(g, id)
          .filter((x) => x.group === t.group)
          .map((x) => g.props[x.id].level),
      );
      assert(q.level === min, "Build evenly across your district.");
      p.cash -= t.build;
      q.level++;
    }
    if (a.type === "sell") {
      assert(q.level > 0, "No business to sell.");
      const max = Math.max(
        ...holdings(g, id)
          .filter((x) => x.group === t.group)
          .map((x) => g.props[x.id].level),
      );
      assert(q.level === max, "Sell evenly across your district.");
      q.level--;
      p.cash += Math.floor(t.build / 2);
    }
    if (a.type === "mortgage") {
      assert(!q.mortgaged && !q.level, "Sell businesses before mortgaging.");
      assert(
        t.group === undefined ||
          !holdings(g, id)
            .filter((x) => x.group === t.group)
            .some((x) => g.props[x.id].level),
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
  const p = g.players.find((x) => x.id === id);
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
              !holdings(g, id).some(
                (x) => x.group === t.group && g.props[x.id].level,
              )),
        );
        if (t) return { type: "mortgage", tile: t.id };
        const built = holdings(g, id)
          .sort((a, b) => g.props[b.id].level - g.props[a.id].level)
          .find((t) => g.props[t.id].level > 0);
        if (built) return { type: "sell", tile: built.id };
        return { type: g.pending.owner ? "shootout" : "surrender" };
      }
    case "card":
      return { type: "card" };
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
            g.props[t.id].level < 3 &&
            p.cash - t.build > 350 &&
            g.props[t.id].level ===
              Math.min(
                ...holdings(g, id)
                  .filter((x) => x.group === t.group)
                  .map((x) => g.props[x.id].level),
              ),
        );
        if (t) return { type: "upgrade", tile: t.id };
      }
      return { type: "end" };
    }
  }
}
export function view(g, id) {
  const v = structuredClone(g);
  if (v.duel) {
    v.duel.locked = Object.keys(v.duel.choices);
    delete v.duel.choices;
  }
  v.me = id;
  return v;
}
