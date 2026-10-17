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
  allied,
  rollDice,
} from "./game.js";
import { tacticalAction } from "./tacticals.js";
import { triggerBotBark } from "./botBarks.js";
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
export function completesDistrictSet(
  g,
  playerId,
  tileId,
  tilesGained = [],
  tilesLost = [],
) {
  const b = board(g);
  const t = b[tileId];
  if (!t || t.group === undefined) return false;
  const districtTiles = b.filter((x) => x.group === t.group);
  if (districtTiles.length === 0) return false;

  const ownedBefore = districtTiles.filter(
    (x) => g.props[x.id] && allied(g, g.props[x.id].owner, playerId),
  );
  if (ownedBefore.length === districtTiles.length) {
    return false;
  }

  const ownedAfter = districtTiles.filter((x) => {
    if (tilesLost.includes(x.id)) return false;
    if (tilesGained.includes(x.id) || x.id === tileId) return true;
    return g.props[x.id] && allied(g, g.props[x.id].owner, playerId);
  });

  return ownedAfter.length === districtTiles.length;
}

export function botEvaluateTrade(g, tr = g.trade) {
  if (!tr) return null;
  const b = board(g);
  const fromPlayer = g.players.find((p) => p.id === tr.from);
  const toPlayer = g.players.find((p) => p.id === tr.to);
  if (!fromPlayer || !toPlayer) return null;

  const giveTiles = tr.giveTiles ?? (tr.give !== undefined ? [tr.give] : []);
  const takeTiles = tr.takeTiles ?? (tr.take !== undefined ? [tr.take] : []);
  const cash = tr.cash ?? 0;
  const requestCash = tr.requestCash ?? 0;
  const giveEscapes = tr.giveEscapes ?? 0;
  const takeEscapes = tr.takeEscapes ?? 0;

  const isReceiver = toPlayer.bot || !fromPlayer.bot;
  const bot = isReceiver ? toPlayer : fromPlayer;
  const opp = isReceiver ? fromPlayer : toPlayer;

  const tilesReceived = isReceiver ? giveTiles : takeTiles;
  const tilesGiven = isReceiver ? takeTiles : giveTiles;
  const cashReceived = isReceiver ? cash : requestCash;
  const cashGiven = isReceiver ? requestCash : cash;
  const escapesReceived = isReceiver ? giveEscapes : takeEscapes;
  const escapesGiven = isReceiver ? takeEscapes : giveEscapes;

  const evaluateTiles = (tileIds, recipientId, gainedTiles, lostTiles) => {
    return tileIds.reduce((sum, id) => {
      const tile = b[id];
      if (!tile || !tile.price) return sum;
      const completes = completesDistrictSet(
        g,
        recipientId,
        id,
        gainedTiles,
        lostTiles,
      );
      const mult = completes ? 2.2 : 1.0;
      const mortgage = g.props[id]?.mortgaged ? 0.5 : 1.0;
      return sum + tile.price * mult * mortgage;
    }, 0);
  };

  const valPropsGiven = evaluateTiles(
    tilesGiven,
    opp.id,
    tilesGiven,
    tilesReceived,
  );
  const valPropsReceived = evaluateTiles(
    tilesReceived,
    bot.id,
    tilesReceived,
    tilesGiven,
  );

  const valueGiven = valPropsGiven + cashGiven + escapesGiven * 100;
  const valueReceived = valPropsReceived + cashReceived + escapesReceived * 100;

  const givesOpponentMonopoly = tilesGiven.some((id) =>
    completesDistrictSet(g, opp.id, id, tilesGiven, tilesReceived),
  );
  const givesBotMonopoly = tilesReceived.some((id) =>
    completesDistrictSet(g, bot.id, id, tilesReceived, tilesGiven),
  );

  const ratio =
    valueGiven > 0
      ? valueReceived / valueGiven
      : valueReceived > 0
        ? Infinity
        : 1.0;

  // If trade gives opponent a monopoly while giving bot no monopoly,
  // decline unless heavily compensated (ratio >= 1.5).
  if (givesOpponentMonopoly && !givesBotMonopoly) {
    if (ratio >= 1.5) {
      return {
        decision: "accept",
        accept: true,
        action: { type: "trade-respond", accept: true, offerId: tr.id },
        ratio,
        valueGiven,
        valueReceived,
        givesOpponentMonopoly,
        givesBotMonopoly,
      };
    }
    return {
      decision: "decline",
      accept: false,
      reason: "Trade grants monopoly to opponent without monopoly compensation",
      action: { type: "trade-respond", accept: false, offerId: tr.id },
      ratio,
      valueGiven,
      valueReceived,
      givesOpponentMonopoly,
      givesBotMonopoly,
    };
  }

  if (ratio >= 1.0) {
    return {
      decision: "accept",
      accept: true,
      action: { type: "trade-respond", accept: true, offerId: tr.id },
      ratio,
      valueGiven,
      valueReceived,
      givesOpponentMonopoly,
      givesBotMonopoly,
    };
  }

  // Counter-offer capability: if incoming trade is close (ratio between 0.80 and 0.99)
  if (ratio >= 0.80 && ratio < 1.0) {
    const deficit = Math.round(valueGiven - valueReceived);
    const counterRequestCash = (isReceiver ? cash : requestCash) + deficit;
    const counterCash = 0;

    if (opp.cash < counterRequestCash || bot.cash < counterCash) {
      return {
        decision: "decline",
        accept: false,
        reason: "Opponent cannot afford counter-offer cash",
        action: { type: "trade-respond", accept: false, offerId: tr.id },
        ratio,
        valueGiven,
        valueReceived,
        givesOpponentMonopoly,
        givesBotMonopoly,
      };
    }

    const counterAction = {
      type: "trade-counter",
      offerId: tr.id,
      to: opp.id,
      giveTiles: [...tilesGiven],
      takeTiles: [...tilesReceived],
      cash: counterCash,
      requestCash: counterRequestCash,
      giveEscapes: escapesGiven,
      takeEscapes: escapesReceived,
    };

    return {
      decision: "counter",
      accept: false,
      counter: counterAction,
      action: counterAction,
      ratio,
      valueGiven,
      valueReceived,
      givesOpponentMonopoly,
      givesBotMonopoly,
    };
  }

  return {
    decision: "decline",
    accept: false,
    reason: "Offer value too low",
    action: { type: "trade-respond", accept: false, offerId: tr.id },
    ratio,
    valueGiven,
    valueReceived,
    givesOpponentMonopoly,
    givesBotMonopoly,
  };
}

export function extendedAction(g, id, a, rng, options) {
  if (tacticalAction(g, id, a, rng, options)) return true;
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
      const remainingSec = Math.max(0, (g.deadline - Date.now()) / 1000);
      const newSec = Math.max(5, Math.min(remainingSec, 8));
      g.deadline = Date.now() + Math.round(newSec * 1000);
      g.auction.clock = Math.round(newSec);
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
    triggerBotBark(g, p, "stoppa_loss", {
      percent,
      amount,
      now: options?.now,
    });
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
    g.dice = rollDice(rng, g.settings?.diceMode);
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
      createdAt: options?.now ?? Date.now(),
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
      triggerBotBark(g, p, "trade_accept", { now: options?.now });
      if (from.bot) {
        triggerBotBark(g, from, "trade_accept", { now: options?.now });
      }
    } else {
      log(g, `${p.name} declined the trade offer.`);
      triggerBotBark(g, p, "trade_decline", { now: options?.now });
    }
    g.trade = null;
    return true;
  }
  if (a.type === "grid-lockdown") {
    assert(
      !["duel", "duel-result", "auction", "stoppa-result"].includes(g.phase),
      "Finish the current showdown or auction first.",
    );
    const utilities = board(g).filter((x) => x.type === "utility");
    assert(
      utilities.length >= 2 &&
        utilities.every(
          (u) =>
            g.props[u.id] &&
            allied(g, g.props[u.id].owner, id) &&
            !g.props[u.id].mortgaged,
        ),
      "You must own both unmortgaged utilities to activate grid lockdown.",
    );
    assert(
      g.lockdownUsedRound !== g.round,
      "Grid lockdown can only be activated once per round.",
    );
    assert(p.cash >= 100, "Grid lockdown requires $100 maintenance cost.");
    const b = board(g);
    const maxDistrict = b.reduce(
      (m, x) => (x.group !== undefined && x.group > m ? x.group : m),
      b.length === 28 ? 5 : 7,
    );
    assert(
      Number.isInteger(a.district) && a.district >= 0 && a.district <= maxDistrict,
      `Choose a valid district (0-${maxDistrict}).`,
    );
    const districtTiles = b.filter((x) => x.group === a.district);
    assert(districtTiles.length > 0, "Invalid district.");
    const ownedByTeam = districtTiles.every(
      (x) => g.props[x.id] && allied(g, g.props[x.id].owner, id),
    );
    assert(!ownedByTeam, "Targeted district cannot be owned by your team.");
    p.cash -= 100;
    g.lockdownUsedRound = g.round;
    g.blackoutDistrict = a.district;
    g.blackoutExpiresOnPlayer = id;
    log(
      g,
      `${p.name} activated City Grid Lockdown on District ${a.district}. Rent halved!`,
      "good",
    );
    return true;
  }
  return false;
}
