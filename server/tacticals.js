import { assert, active, log, phase, secureRandom } from "./game.js";

export const TACTICAL_CARDS = {
  switchblade: {
    id: "switchblade",
    name: "Switchblade",
    description: "+15 Kick Damage in next Shootout",
  },
  getaway: {
    id: "getaway",
    name: "Getaway",
    description: "Choose 1–6 movement spaces on your next roll",
  },
  bailout: {
    id: "bailout",
    name: "Bailout",
    description: "Get Out of County Jail free",
  },
  scanner: {
    id: "scanner",
    name: "Police Scanner",
    description: "Halve the next rent or tax you land on",
  },
};

export const TACTICAL_KEYS = Object.keys(TACTICAL_CARDS);

export function drawTacticalCard(g, p, cardKey = null, rng = secureRandom) {
  p.tacticals ||= [];
  if (p.tacticals.length >= 2) {
    log(g, `${p.name}'s tactical stash is full (max 2).`, "info");
    return null;
  }
  const key = cardKey || TACTICAL_KEYS[rng(TACTICAL_KEYS.length)];
  p.tacticals.push(key);
  log(
    g,
    `${p.name} acquired tactical card: ${TACTICAL_CARDS[key]?.name || key}.`,
    "good",
  );
  return key;
}

export function handleStreetLuck(g, p, rng = secureRandom) {
  p.tacticals ||= [];
  if (p.tacticals.length >= 2) return false;
  const isTactical =
    typeof rng === "function" && rng.length === 0 ? false : rng(100) < 40;
  if (isTactical) {
    drawTacticalCard(g, p, null, rng);
    phase(g, "end");
    return true;
  }
  return false;
}

export function isDuelBettingOpen(d, now = Date.now()) {
  if (!d) return false;
  if (d.stage === "ready") return true;
  if (d.stage === "live") {
    const liveStart = d.liveAt || (d.startsAt ? d.startsAt - 3000 : 0);
    return liveStart > 0 && now - liveStart <= 5000;
  }
  return false;
}

export function settleDuelBets(g, winner) {
  const bets = g.duel?.bets;
  if (!bets || !Array.isArray(bets) || bets.length === 0) return;
  const winnerPlayer = g.players.find((p) => p.id === winner);
  for (const bet of bets) {
    const bettor = g.players.find((p) => p.id === bet.player);
    if (!bettor || bettor.out) continue;
    if (bet.pick === winner) {
      const payout = bet.amount * 2;
      bettor.cash += payout;
      log(
        g,
        `💰 Side-bet victory! ${bettor.name} cashed in $${payout} backing ${winnerPlayer?.name || "the winner"}!`,
        "good",
      );
    } else {
      log(
        g,
        `${bettor.name} lost their $${bet.amount} shootout side-bet.`,
        "bad",
      );
    }
  }
}

export function tacticalAction(g, id, a, _rng = secureRandom, options = {}) {
  if (a.type === "tactical-use") {
    const p = g.players.find((x) => x.id === id);
    assert(p && !p.out, "You are not an active player.");
    const cardKey = a.card || a.cardId;
    assert(cardKey && TACTICAL_CARDS[cardKey], "Invalid tactical card.");
    p.tacticals ||= [];
    const cardIdx = p.tacticals.findIndex(
      (c) => (typeof c === "string" ? c : c?.id) === cardKey,
    );
    assert(cardIdx !== -1, "You do not own this tactical card.");

    p.activeEffects ||= {};
    if (cardKey === "getaway") {
      assert(
        !p.activeEffects.getaway,
        "Getaway is already primed for your next roll.",
      );
      const spaces = a.spaces ?? a.steps;
      if (spaces !== undefined) {
        assert(
          Number.isInteger(spaces) && spaces >= 1 && spaces <= 6,
          "Choose 1–6 movement spaces.",
        );
        p.activeEffects.getaway = spaces;
      } else {
        p.activeEffects.getaway = true;
      }
      log(
        g,
        `${p.name} activated Getaway: next roll will move ${spaces ? spaces + " spaces" : "a chosen 1–6 spaces"}.`,
        "good",
      );
    } else if (cardKey === "switchblade") {
      if (g.phase === "duel" && g.duel?.fighters?.[id]) {
        assert(
          !g.duel.fighters[id].kickBonus,
          "Switchblade is already equipped in this shootout.",
        );
        g.duel.fighters[id].kickBonus = 15;
      } else {
        assert(
          !p.activeEffects.switchblade,
          "Switchblade is already equipped for your next shootout.",
        );
        p.activeEffects.switchblade = true;
      }
      log(
        g,
        `${p.name} equipped a Switchblade (+15 Kick Damage in next Shootout).`,
        "good",
      );
    } else if (cardKey === "bailout") {
      if (p.jail > 0) {
        p.jail = 0;
        if (g.phase === "jail" && active(g).id === id) phase(g, "roll");
        log(
          g,
          `${p.name} used Bailout to walk out of County Jail free!`,
          "good",
        );
      } else {
        assert(
          !p.activeEffects.bailout,
          "Bailout is already primed for your next arrest.",
        );
        p.activeEffects.bailout = true;
        log(
          g,
          `${p.name} prepared Bailout for their next arrest.`,
          "good",
        );
      }
    } else if (cardKey === "scanner") {
      if (g.phase === "rent" && g.pending && active(g).id === id) {
        g.pending.amount = Math.floor(g.pending.amount / 2);
        log(
          g,
          `${p.name} used Police Scanner to halve the rent to $${g.pending.amount}!`,
          "good",
        );
      } else {
        assert(
          !p.activeEffects.scanner,
          "Police Scanner is already active for your next rent or tax.",
        );
        p.activeEffects.scanner = true;
        log(
          g,
          `${p.name} activated Police Scanner (halves next rent or tax landed on).`,
          "good",
        );
      }
    }

    p.tacticals.splice(cardIdx, 1);
    return true;
  }

  if (a.type === "duel-bet") {
    const p = g.players.find((x) => x.id === id);
    assert(p && !p.out, "Eliminated players cannot place bets.");
    assert(g.phase === "duel" && g.duel, "No shootout is currently active.");
    const now = options.now || Date.now();
    assert(
      isDuelBettingOpen(g.duel, now),
      "Betting is closed for this shootout.",
    );
    assert(
      id !== g.duel.attacker && id !== g.duel.defender,
      "Duel participants cannot place side bets.",
    );
    assert(
      !g.duel.bets?.some((b) => b.player === id),
      "You have already placed a side-bet on this shootout.",
    );
    assert(
      a.amount === 50 || a.amount === 100,
      "Bet amount must be $50 or $100.",
    );
    assert(p.cash >= a.amount, "You cannot afford this bet.");
    assert(
      a.pick === g.duel.attacker || a.pick === g.duel.defender,
      "You must bet on either the challenger or the landlord.",
    );

    p.cash -= a.amount;
    g.duel.bets ||= [];
    g.duel.bets.push({ player: id, amount: a.amount, pick: a.pick });
    const target = g.players.find((x) => x.id === a.pick);
    log(
      g,
      `${p.name} placed a $${a.amount} side-bet on ${target?.name || "a shooter"}!`,
      "info",
    );
    return true;
  }

  return false;
}
