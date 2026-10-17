let globalIo = null;

export function setBotBarkIO(io) {
  globalIo = io;
}

export const BOT_BARK_COOLDOWN_MS = 8000;
export const ROOM_BARK_THROTTLE_MS = 3000;

export const PERSONALITIES = {
  aggressive_hustler: {
    id: "aggressive_hustler",
    name: "Aggressive Hustler",
    barks: {
      buy_property: [
        "This block is officially under new management.",
        "Locked down another corner.",
        "Expanding the empire brick by brick.",
        "Nobody sets foot on this strip without paying toll.",
      ],
      collect_rent: [
        "Rent is due on the 1st, 15th, and right now!",
        "Appreciate the donation, cousin.",
        "Pay up! Ain't no free passes on my strip.",
        "Keep that cash flow moving into my pockets.",
      ],
      pay_rent: [
        "Highway robbery right here.",
        "Enjoy it while it lasts.",
        "Take my paper, but keep one eye open.",
        "That's just a small tax. I'll take your whole block next.",
      ],
      duel_challenge: [
        "You stepped on the wrong block, let's settle it!",
        "Spin the block on 'em!",
        "Ain't no rent getting paid today without smoke!",
        "Time to see if you really run this corner.",
      ],
      duel_win: [
        "Told you this is my turf!",
        "Quickest draw on the North side.",
        "Put some respect on my name!",
        "Ran you off the block! Who's next?",
      ],
      duel_loss: [
        "Lucky shot. Next time you won't walk away.",
        "Debt wiped... for now.",
        "Caught me slippin'... won't happen twice.",
        "You got me this round, but the war ain't over.",
      ],
      stoppa_loss: [
        "Oppa Stoppa just took my lunch money...",
        "Community plot is eating good tonight.",
        "Spin had hands today, smh.",
        "Got caught lackin' by the neighborhood tax.",
      ],
      low_cash: [
        "Gotta hustle up some funds before I'm sleeping on the bench.",
        "Need someone to trade me a lifeline.",
        "Cash low, heat high. Time to make a risky move.",
        "Pockets looking dry. Somebody's gonna pay for this.",
      ],
      bankrupt: [
        "They got me. I'm packing up the block.",
        "Street took everything from me today.",
        "I'll be back for everything I lost.",
        "Down but never out. Respect the hustle.",
      ],
      trade_accept: [
        "Now that's what I call good business.",
        "Pleasure doing business with you, partner.",
        "We both eating off this deal.",
        "Good deal. Now stay off my side of town.",
      ],
      trade_decline: [
        "You must be out your mind with that offer.",
        "That deal is straight robbery, I'll pass.",
        "Keep that garbage off my table.",
        "Ain't no way I'm letting you finesse me.",
      ],
    },
  },
  street_gambler: {
    id: "street_gambler",
    name: "Street Gambler",
    barks: {
      buy_property: [
        "Another tile on the board, another dice roll in my favor.",
        "Double down on this corner! Watch it pay off.",
        "Locked down another corner.",
        "This block is officially under new management. High roller suite incoming.",
      ],
      collect_rent: [
        "The house always wins, baby!",
        "Rent is due on the 1st, 15th, and right now!",
        "Dice rolled your way right into my trap.",
        "Appreciate the donation, cousin.",
      ],
      pay_rent: [
        "Bad roll, bad beat. But the night is young.",
        "Enjoy it while it lasts.",
        "Highway robbery right here.",
        "Just variance, fam. I'll win it back on the next spin.",
      ],
      duel_challenge: [
        "Spin the block on 'em!",
        "Spin the chamber! Double or nothing right here!",
        "You stepped on the wrong block, let's settle it!",
        "All on red or smoke in the air, let's ride!",
      ],
      duel_win: [
        "Jackpot! Never bet against me!",
        "Told you this is my turf!",
        "Quickest draw on the North side.",
        "Odds were against you from the jump!",
      ],
      duel_loss: [
        "Snake eyes... debt wiped... for now.",
        "Lucky shot. Next time you won't walk away.",
        "Debt wiped... for now.",
        "Rolled a blank. Next round I'm doubling down.",
      ],
      stoppa_loss: [
        "The wheel did me dirty this time!",
        "Oppa Stoppa just took my lunch money...",
        "Community plot is eating good tonight.",
        "Bad spin, but real shooters keep rolling.",
      ],
      low_cash: [
        "Down to my last stacks. Time for high-risk plays.",
        "Need someone to trade me a lifeline.",
        "Gotta hustle up some funds before I'm sleeping on the bench.",
        "Bankroll running on fumes! Need a miracle spin.",
      ],
      bankrupt: [
        "Busted out! Table took all my chips.",
        "Street took everything from me today.",
        "They got me. I'm packing up the block.",
        "Zeroed out. The gamble didn't pay off today.",
      ],
      trade_accept: [
        "Deal's inked! Let's see how the dice roll now.",
        "Fair swap, let's roll!",
        "A gamble we both can profit from.",
        "Shuffled the deck and came out on top!",
      ],
      trade_decline: [
        "Odds are way too stacked against me. Pass.",
        "I gamble with dice, not bad trades.",
        "No bet on that one, fam.",
        "That's a sucker bet, pass.",
      ],
    },
  },
  chill_veteran: {
    id: "chill_veteran",
    name: "Chill Veteran",
    barks: {
      buy_property: [
        "Patience pays off. Added another deed to the portfolio.",
        "I've owned this corner three times before in my life.",
        "This block is officially under new management.",
        "Locked down another corner.",
      ],
      collect_rent: [
        "Appreciate the respect, young blood. Taxes of the game.",
        "Rent is due on the 1st, 15th, and right now!",
        "Appreciate the donation, cousin.",
        "Cost of doing business on these streets.",
      ],
      pay_rent: [
        "Fair's fair. Street code honored.",
        "Highway robbery right here.",
        "Enjoy it while it lasts.",
        "Money comes and goes, wisdom stays.",
      ],
      duel_challenge: [
        "Let an old timer show you how we used to handle business.",
        "You stepped on the wrong block, let's settle it!",
        "Spin the block on 'em!",
        "Time for a classic street lesson. Step up.",
      ],
      duel_win: [
        "Experience always beats raw ambition.",
        "Told you this is my turf!",
        "Quickest draw on the North side.",
        "Class dismissed. Respect your elders.",
      ],
      duel_loss: [
        "Reflexes ain't what they used to be...",
        "Lucky shot. Next time you won't walk away.",
        "Debt wiped... for now.",
        "You got hands, kid. Don't let it get to your head.",
      ],
      stoppa_loss: [
        "Even the wisest get caught in the trap sometimes.",
        "Oppa Stoppa just took my lunch money...",
        "Community plot is eating good tonight.",
        "Gotta pay the neighborhood tax once in a while.",
      ],
      low_cash: [
        "Reminds me of the lean years. Gotta play smart now.",
        "Gotta hustle up some funds before I'm sleeping on the bench.",
        "Need someone to trade me a lifeline.",
        "Pockets looking lighter than a summer breeze.",
      ],
      bankrupt: [
        "Retiring from the block. Had a good run.",
        "They got me. I'm packing up the block.",
        "Street took everything from me today.",
        "Hanging up my boots. Respect to the survivors.",
      ],
      trade_accept: [
        "A handshake deal done right. Respect.",
        "Fair trade. We both grow our holdings.",
        "Old school negotiation at its finest.",
        "Good business is good for everybody.",
      ],
      trade_decline: [
        "I've seen bad deals in my day, and that's one.",
        "No thanks, young blood. I'll hold my ground.",
        "That math doesn't add up for me, pass.",
        "Not today, partner. Keep looking.",
      ],
    },
  },
  defensive_mogul: {
    id: "defensive_mogul",
    name: "Defensive Mogul",
    barks: {
      buy_property: [
        "Strategic acquisition completed. My portfolio expands.",
        "Locked down another corner.",
        "This block is officially under new management.",
        "Prime real estate secured. Yields are looking great.",
      ],
      collect_rent: [
        "Invoice settled in full. Pleasure doing business.",
        "Cash flow is king, and you're just a tenant.",
        "Rent is due on the 1st, 15th, and right now!",
        "Appreciate the donation, cousin.",
      ],
      pay_rent: [
        "Tax write-off. You won't see me sweat over overhead.",
        "Highway robbery right here.",
        "Enjoy it while it lasts.",
        "Just operational overhead. I'll recover this in revenue.",
      ],
      duel_challenge: [
        "Hostile takeover initiated. Settle this right now.",
        "You stepped on the wrong block, let's settle it!",
        "Spin the block on 'em!",
        "Liquidating this dispute with extreme prejudice.",
      ],
      duel_win: [
        "Hostile takeover successful. Turf secured.",
        "Told you this is my turf!",
        "Quickest draw on the North side.",
        "Market dominance maintained. Zero competition.",
      ],
      duel_loss: [
        "Regulatory fine paid. We will appeal this outcome.",
        "Debt wiped... for now.",
        "Lucky shot. Next time you won't walk away.",
        "A temporary hit to the quarterly balance sheet.",
      ],
      stoppa_loss: [
        "Involuntary philanthropic contribution registered.",
        "Oppa Stoppa just took my lunch money...",
        "Community plot is eating good tonight.",
        "Oppa Stoppa audit caught me off guard.",
      ],
      low_cash: [
        "Liquidity crisis detected. Seeking emergency trade partners.",
        "Gotta hustle up some funds before I'm sleeping on the bench.",
        "Need someone to trade me a lifeline.",
        "Working capital critically depressed. Need cash injection.",
      ],
      bankrupt: [
        "Chapter 11 filed. Liquidation complete.",
        "They got me. I'm packing up the block.",
        "Street took everything from me today.",
        "Bankrupt. Hostile market conditions took my assets.",
      ],
      trade_accept: [
        "Contract ratified. Mutual asset appreciation.",
        "Transaction approved. A solid addition to the portfolio.",
        "Synergy achieved on this deal.",
        "Merger terms accepted. Productive negotiation.",
      ],
      trade_decline: [
        "Term sheet rejected. Inadequate ROI.",
        "Hostile valuation detected. Offer declined.",
        "That deal doesn't meet portfolio standards.",
        "Unfavorable terms. Deal is dead on arrival.",
      ],
    },
  },
};

// Aliases with spaces
PERSONALITIES["Aggressive Hustler"] = PERSONALITIES.aggressive_hustler;
PERSONALITIES["Street Gambler"] = PERSONALITIES.street_gambler;
PERSONALITIES["Chill Veteran"] = PERSONALITIES.chill_veteran;
PERSONALITIES["Defensive Mogul"] = PERSONALITIES.defensive_mogul;

export const BOT_NAME_PERSONALITIES = {
  Jax: PERSONALITIES.aggressive_hustler,
  "Big Bag": PERSONALITIES.aggressive_hustler,
  Nova: PERSONALITIES.street_gambler,
  "Lil Receipt": PERSONALITIES.street_gambler,
  Unc: PERSONALITIES.chill_veteran,
  Remy: PERSONALITIES.chill_veteran,
  "Miss Motion": PERSONALITIES.defensive_mogul,
};

const ORDERED_PERSONALITIES = [
  PERSONALITIES.aggressive_hustler,
  PERSONALITIES.street_gambler,
  PERSONALITIES.chill_veteran,
  PERSONALITIES.defensive_mogul,
];

export function getBotPersonality(bot) {
  if (!bot) return PERSONALITIES.aggressive_hustler;
  if (bot.personality && PERSONALITIES[bot.personality]) {
    return PERSONALITIES[bot.personality];
  }
  if (bot.name && BOT_NAME_PERSONALITIES[bot.name]) {
    return BOT_NAME_PERSONALITIES[bot.name];
  }
  const idx = Math.abs(Number.isInteger(bot.crew) ? bot.crew : 0) % ORDERED_PERSONALITIES.length;
  return ORDERED_PERSONALITIES[idx];
}

export function getBotBarkText(bot, triggerType, rng = Math.random) {
  const personality = getBotPersonality(bot);
  const list = personality?.barks?.[triggerType];
  if (!list || list.length === 0) return null;
  const index = Math.floor(rng() * list.length);
  return list[index];
}

export function triggerBotBark(g, botPlayer, triggerType, context = {}) {
  if (!g) return null;
  // Humans never auto-bark
  if (!botPlayer || !botPlayer.bot) return null;
  // Eliminated bots only bark if the event is bankruptcy
  if (botPlayer.out && triggerType !== "bankrupt") return null;

  const now = Number.isFinite(context.now) ? context.now : Date.now();

  // Check per-bot cooldown (max 1 bark per bot every 8 seconds)
  if (
    botPlayer.lastBarkTime &&
    now - botPlayer.lastBarkTime < BOT_BARK_COOLDOWN_MS
  ) {
    return null;
  }

  // Check room throttle (at least 3 seconds between any bot barks)
  if (
    g.lastBotBarkTime &&
    now - g.lastBotBarkTime < ROOM_BARK_THROTTLE_MS
  ) {
    return null;
  }

  const rng = typeof context.rng === "function" ? context.rng : Math.random;
  const text = getBotBarkText(botPlayer, triggerType, rng);
  if (!text) return null;

  botPlayer.lastBarkTime = now;
  botPlayer.lastBarkType = triggerType;
  g.lastBotBarkTime = now;

  const message = {
    type: "chat",
    id: botPlayer.id,
    player: botPlayer.id,
    name: botPlayer.name,
    text,
    time: now,
  };

  g.chat ||= [];
  g.chat.push(message);
  if (g.chat.length > 100) {
    g.chat = g.chat.slice(-100);
  }

  if (typeof context.emit === "function") {
    context.emit("chat", message);
  }
  if (context.io && g.code) {
    context.io.to(g.code).emit("chat", message);
  } else if (globalIo && g.code) {
    globalIo.to(g.code).emit("chat", message);
  }

  return message;
}
