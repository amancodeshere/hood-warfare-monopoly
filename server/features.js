import { randomUUID } from "node:crypto";
import {
  assert,
  active,
  board,
  phase,
  log,
  eliminate,
  finishAuction,
  land,
} from "./game.js";
const movable = (g) => ["roll", "end", "rent", "buy"].includes(g.phase);
function available(g, tile, id) {
  const q = g.props[tile],
    t = board(g)[tile];
  return (
    q?.owner === id &&
    !q.level &&
    (t.group === undefined ||
      !board(g).some((x) => x.group === t.group && g.props[x.id]?.level))
  );
}
function checkTrade(g, tr) {
  const a = g.players.find((p) => p.id === tr.from),
    b = g.players.find((p) => p.id === tr.to);
  assert(a && !a.out && b && !b.out, "This trade is no longer available.");
  assert(
    tr.giveTiles.every((t) => available(g, t, a.id)) &&
      tr.takeTiles.every((t) => available(g, t, b.id)),
    "The properties changed hands or gained businesses.",
  );
  assert(
    a.cash >= tr.cash && b.cash >= tr.requestCash,
    "A crew cannot afford the offered cash.",
  );
  assert(
    a.escapes >= tr.giveEscapes && b.escapes >= tr.takeEscapes,
    "An escape card is no longer available.",
  );
  if (g.phase === "rent" && g.pending?.owner) {
    for (const [p, offered, received, cashIn, cashOut] of [
      [a, tr.giveTiles, tr.takeTiles, tr.requestCash, tr.cash],
      [b, tr.takeTiles, tr.giveTiles, tr.cash, tr.requestCash],
    ]) {
      if (p.id === active(g).id) {
        const value = (ids) =>
          ids.reduce(
            (n, id) =>
              n + board(g)[id].price * (g.props[id].mortgaged ? 0.5 : 1),
            0,
          );
        assert(
          value(received) + cashIn >= value(offered) + cashOut,
          "Debt trades must return fair value. Raise cash; do not give your empire away.",
        );
      }
    }
  }
}
export function extendedAction(g, id, a, rng) {
  const p = g.players.find((x) => x.id === id);
  if (a.type === "auction-bid" || a.type === "auction-pass") {
    assert(g.phase === "auction" && g.auction, "No auction is open.");
    assert(
      !g.auction.passed.includes(id),
      "You already passed in this auction.",
    );
    if (a.type === "auction-bid") {
      assert(
        Number.isInteger(a.amount) &&
          a.amount >= g.auction.highBid + 10 &&
          a.amount <= p.cash,
        "Bid at least $10 more, within your cash balance.",
      );
      g.auction.highBid = a.amount;
      assert(g.auction.highBidder !== id, "You already hold the highest bid.");
      g.auction.highBidder = id;
      g.deadline = Date.now() + 20000;
      log(
        g,
        `${p.name} bids $${a.amount} on ${board(g)[g.auction.tile].name}.`,
      );
    } else {
      assert(
        g.auction.highBidder !== id,
        "The highest bidder cannot withdraw.",
      );
      g.auction.passed.push(id);
    }
    const others = g.players.filter(
      (x) => !x.out && x.id !== g.auction.highBidder,
    );
    if (others.every((x) => g.auction.passed.includes(x.id))) finishAuction(g);
    return true;
  }
  if (a.type === "stoppa-spin") {
    assert(
      active(g).id === id && g.phase === "stoppa",
      "Land on Oppa Stoppa first.",
    );
    const percent = rng(10) + 1;
    g.pending = {
      percent,
      amount: Math.floor((p.cash * percent) / 100),
      basis: p.cash,
    };
    phase(g, "stoppa-result");
    return true;
  }
  if (a.type === "stoppa-collect") {
    assert(
      active(g).id === id && g.phase === "stoppa-result",
      "No Oppa Stoppa result to settle.",
    );
    const { percent, amount } = g.pending;
    assert(p.cash >= amount, "Cash balance changed.");
    p.cash -= amount;
    g.pot += amount;
    log(
      g,
      `Oppa Stoppa caught ${p.name} lackin: ${percent}% ($${amount}) goes to the Community Plot.`,
      "bad",
    );
    g.pending = null;
    phase(g, "end");
    return true;
  }
  if (a.type === "gift") {
    assert(
      !["duel", "duel-result", "auction", "stoppa-result"].includes(g.phase),
      "Finish the showdown or auction first.",
    );
    assert(
      !(active(g).id === id && g.phase === "rent"),
      "Pay your own debt before sending gifts.",
    );
    const to = g.players.find((x) => x.id === a.to && !x.out && x.id !== id);
    assert(to, "Choose another active crew.");
    assert(
      Number.isInteger(a.amount) && a.amount > 0 && a.amount <= p.cash,
      "Choose an affordable cash gift.",
    );
    p.cash -= a.amount;
    to.cash += a.amount;
    log(g, `${p.name} sent ${to.name} a $${a.amount} rescue bag.`, "good");
    return true;
  }
  if (a.type === "give-time") {
    assert(active(g).id !== id, "Another crew can give you time.");
    assert(
      !["auction", "duel", "duel-result"].includes(g.phase),
      "The event has its own clock.",
    );
    assert(!g.timeDonors?.includes(id), "You already added time to this turn.");
    g.timeDonors ||= [];
    g.timeDonors.push(id);
    g.turnDeadline += 60000;
    g.deadline += 60000;
    log(g, `${p.name} gave ${active(g).name} an extra minute.`);
    return true;
  }
  if (a.type === "forfeit") {
    assert(
      !["duel", "duel-result", "auction"].includes(g.phase),
      "Finish the showdown or auction before leaving.",
    );
    const debt =
      active(g).id === id && g.phase === "rent"
        ? g.players.find((x) => x.id === g.pending?.owner)
        : null;
    eliminate(g, p, debt);
    return true;
  }
  if (a.type === "jail-roll") {
    assert(
      active(g).id === id && g.phase === "jail" && p.jail,
      "You are not in jail.",
    );
    g.dice = [rng(6) + 1, rng(6) + 1];
    g.extraRoll = false;
    if (g.dice[0] === g.dice[1]) {
      p.jail = 0;
      p.pos = (p.pos + g.dice[0] + g.dice[1]) % board(g).length;
      log(g, `${p.name} rolled doubles and escaped County.`, "good");
      land(g, rng);
    } else {
      p.jail--;
      log(g, `${p.name} failed to roll doubles and served a turn.`);
      phase(g, "end");
    }
    return true;
  }
  if (a.type === "trade" || a.type === "trade-counter") {
    assert(movable(g), "Finish the current event before trading.");
    if (a.type === "trade-counter") {
      assert(
        g.trade?.to === id,
        "Only the receiving crew can counter this offer.",
      );
      assert(
        !g.trade.id || a.offerId === g.trade.id,
        "This offer changed. Review the latest deal.",
      );
      assert(a.to === g.trade.from, "Counter the crew who sent this offer.");
    } else assert(!g.trade, "Wait for the current trade to be answered.");
    const giveTiles = a.giveTiles ?? (a.give !== undefined ? [a.give] : []),
      takeTiles = a.takeTiles ?? (a.take !== undefined ? [a.take] : []);
    assert(
      Array.isArray(giveTiles) &&
        Array.isArray(takeTiles) &&
        giveTiles.every((t) => Number.isInteger(t) && board(g)[t]?.price) &&
        takeTiles.every((t) => Number.isInteger(t) && board(g)[t]?.price) &&
        giveTiles.length <= 40 &&
        takeTiles.length <= 40 &&
        new Set([...giveTiles, ...takeTiles]).size ===
          giveTiles.length + takeTiles.length,
      "Choose unique properties.",
    );
    const tr = {
      id: randomUUID(),
      revision: a.type === "trade-counter" ? (g.trade.revision || 1) + 1 : 1,
      from: id,
      to: a.to,
      giveTiles,
      takeTiles,
      cash: a.cash ?? 0,
      requestCash: a.requestCash ?? 0,
      giveEscapes: a.giveEscapes ?? 0,
      takeEscapes: a.takeEscapes ?? 0,
    };
    assert(tr.to !== id, "Choose another crew.");
    assert(
      [tr.cash, tr.requestCash, tr.giveEscapes, tr.takeEscapes].every(
        (x) => Number.isInteger(x) && x >= 0,
      ),
      "Trade amounts must be nonnegative whole numbers.",
    );
    assert(
      giveTiles.length +
        takeTiles.length +
        tr.cash +
        tr.requestCash +
        tr.giveEscapes +
        tr.takeEscapes >
        0,
      "Offer a property, cash, or escape card.",
    );
    checkTrade(g, tr);
    g.trade = tr;
    log(
      g,
      `${p.name} ${a.type === "trade-counter" ? "countered" : "offered a deal to"} ${g.players.find((x) => x.id === tr.to).name}.`,
    );
    return true;
  }
  if (a.type === "trade-cancel") {
    assert(g.trade?.from === id, "No trade to cancel.");
    assert(
      !g.trade.id || a.offerId === g.trade.id,
      "This offer changed. Review the latest deal.",
    );
    g.trade = null;
    log(g, `${p.name} withdrew their trade offer.`);
    return true;
  }
  if (a.type === "trade-respond" && g.trade?.giveTiles) {
    const tr = g.trade;
    assert(tr.to === id, "No trade to answer.");
    assert(
      !tr.id || a.offerId === tr.id,
      "This offer changed. Review the latest deal.",
    );
    assert(typeof a.accept === "boolean", "Choose accept or decline.");
    assert(
      !a.accept ||
        ![
          "duel",
          "auction",
          "stoppa",
          "stoppa-result",
          "roulette",
          "roulette-result",
        ].includes(g.phase),
      "Finish this event before accepting a trade.",
    );
    if (a.accept) {
      checkTrade(g, tr);
      const from = g.players.find((x) => x.id === tr.from);
      tr.giveTiles.forEach((t) => (g.props[t].owner = id));
      tr.takeTiles.forEach((t) => (g.props[t].owner = tr.from));
      from.cash += tr.requestCash - tr.cash;
      p.cash += tr.cash - tr.requestCash;
      from.escapes += tr.takeEscapes - tr.giveEscapes;
      p.escapes += tr.giveEscapes - tr.takeEscapes;
      log(g, `${from.name} and ${p.name} made a block deal.`, "good");
    } else log(g, `${p.name} declined the trade offer.`);
    g.trade = null;
    return true;
  }
  return false;
}
