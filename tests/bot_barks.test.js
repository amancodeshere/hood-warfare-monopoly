import test from "node:test";
import assert from "node:assert/strict";
import {
  player,
  room,
  start,
  action,
  land,
  finishAuction,
  eliminate,
} from "../server/game.js";
import {
  PERSONALITIES,
  BOT_NAME_PERSONALITIES,
  BOT_BARK_COOLDOWN_MS,
  ROOM_BARK_THROTTLE_MS,
  getBotPersonality,
  getBotBarkText,
  triggerBotBark,
  setBotBarkIO,
} from "../server/botBarks.js";

function setupGame(playersConfig = ["Human", "Bot1"]) {
  const host = player(playersConfig[0], false);
  const g = room("TEST01", host);
  g.schemaVersion = 1;
  g.settings.auctions = true;
  g.settings.doubles = false;
  for (let i = 1; i < playersConfig.length; i++) {
    const isBot = playersConfig[i].toLowerCase().includes("bot") || ["Remy", "Jax", "Nova", "Unc"].includes(playersConfig[i]);
    const p = player(playersConfig[i], isBot);
    p.crew = i;
    g.players.push(p);
  }
  start(g, host.id);
  return { g, host, players: g.players };
}

test("personalities have all 9 required contextual bark categories with multiple lines", () => {
  const categories = [
    "buy_property",
    "collect_rent",
    "pay_rent",
    "duel_challenge",
    "duel_win",
    "duel_loss",
    "stoppa_loss",
    "low_cash",
    "bankrupt",
  ];

  const personalityKeys = [
    "aggressive_hustler",
    "street_gambler",
    "chill_veteran",
    "defensive_mogul",
  ];

  assert.equal(BOT_BARK_COOLDOWN_MS, 8000);
  assert.equal(ROOM_BARK_THROTTLE_MS, 3000);
  assert.equal(BOT_NAME_PERSONALITIES.Jax, PERSONALITIES.aggressive_hustler);
  assert.equal(BOT_NAME_PERSONALITIES.Nova, PERSONALITIES.street_gambler);

  for (const key of personalityKeys) {
    const personality = PERSONALITIES[key];
    assert.ok(personality, `Personality ${key} should exist`);
    assert.ok(personality.name, `Personality ${key} should have a name`);
    for (const cat of categories) {
      const barks = personality.barks[cat];
      assert.ok(Array.isArray(barks), `${key} missing category ${cat}`);
      assert.ok(barks.length >= 2, `${key} category ${cat} should have at least 2 bark options`);
      for (const text of barks) {
        assert.equal(typeof text, "string");
        assert.ok(text.trim().length > 0);
      }
    }
  }
});

test("bot personality resolution by name, crew index, and explicit override", () => {
  // Test getBotBarkText directly
  const sampleBot = player("Jax", true);
  const sampleBark = getBotBarkText(sampleBot, "buy_property", () => 0);
  assert.equal(typeof sampleBark, "string");
  assert.ok(sampleBark.length > 0);

  // Test by name
  assert.equal(getBotPersonality(player("Jax", true)).id, "aggressive_hustler");
  assert.equal(getBotPersonality(player("Big Bag", true)).id, "aggressive_hustler");
  assert.equal(getBotPersonality(player("Nova", true)).id, "street_gambler");
  assert.equal(getBotPersonality(player("Lil Receipt", true)).id, "street_gambler");
  assert.equal(getBotPersonality(player("Unc", true)).id, "chill_veteran");
  assert.equal(getBotPersonality(player("Remy", true)).id, "chill_veteran");
  assert.equal(getBotPersonality(player("Miss Motion", true)).id, "defensive_mogul");

  // Test by crew index
  const bot0 = player("Generic", true);
  bot0.crew = 0;
  assert.equal(getBotPersonality(bot0).id, "aggressive_hustler");

  const bot1 = player("Generic", true);
  bot1.crew = 1;
  assert.equal(getBotPersonality(bot1).id, "street_gambler");

  const bot2 = player("Generic", true);
  bot2.crew = 2;
  assert.equal(getBotPersonality(bot2).id, "chill_veteran");

  const bot3 = player("Generic", true);
  bot3.crew = 3;
  assert.equal(getBotPersonality(bot3).id, "defensive_mogul");

  // Test explicit override
  const custom = player("Custom", true);
  custom.personality = "defensive_mogul";
  assert.equal(getBotPersonality(custom).id, "defensive_mogul");

  // Aliases with spaces
  custom.personality = "Street Gambler";
  assert.equal(getBotPersonality(custom).id, "street_gambler");
});

test("bark generation produces valid chat message format for all 9 categories", () => {
  const { g } = setupGame(["Human", "Jax"]);
  const bot = g.players[1];
  assert.equal(bot.bot, true);

  const categories = [
    "buy_property",
    "collect_rent",
    "pay_rent",
    "duel_challenge",
    "duel_win",
    "duel_loss",
    "stoppa_loss",
    "low_cash",
    "bankrupt",
  ];

  let currentTime = 100000;
  for (const cat of categories) {
    const msg = triggerBotBark(g, bot, cat, { now: currentTime });
    assert.ok(msg, `Should generate bark for ${cat}`);
    assert.equal(msg.type, "chat");
    assert.equal(msg.id, bot.id);
    assert.equal(msg.player, bot.id);
    assert.equal(msg.name, bot.name);
    assert.equal(typeof msg.text, "string");
    assert.equal(msg.time, currentTime);

    // Verify it was pushed to g.chat
    assert.equal(g.chat[g.chat.length - 1], msg);

    // Advance time past cooldown for next category test
    currentTime += 10000;
  }
});

test("rate limiting enforces max 1 bark per 8s per bot", () => {
  const { g } = setupGame(["Human", "Jax"]);
  const bot = g.players[1];

  const t0 = 100000;
  // First bark at t0 succeeds
  const msg1 = triggerBotBark(g, bot, "buy_property", { now: t0 });
  assert.ok(msg1);
  assert.equal(bot.lastBarkTime, t0);
  assert.equal(g.lastBotBarkTime, t0);
  assert.equal(g.chat.length, 1);

  // Attempt 3.5 seconds later (room throttle would allow, but bot cooldown blocks it)
  const msg2 = triggerBotBark(g, bot, "collect_rent", { now: t0 + 3500 });
  assert.equal(msg2, null);
  assert.equal(g.chat.length, 1);
  assert.equal(bot.lastBarkTime, t0);

  // Attempt 7.999 seconds later (still under 8s)
  const msg3 = triggerBotBark(g, bot, "collect_rent", { now: t0 + 7999 });
  assert.equal(msg3, null);
  assert.equal(g.chat.length, 1);

  // Attempt 8 seconds later (8000ms >= 8000ms) -> succeeds
  const msg4 = triggerBotBark(g, bot, "collect_rent", { now: t0 + 8000 });
  assert.ok(msg4);
  assert.equal(g.chat.length, 2);
  assert.equal(bot.lastBarkTime, t0 + 8000);
  assert.equal(g.lastBotBarkTime, t0 + 8000);
});

test("rate limiting enforces room throttle of at least 3s between any bot barks", () => {
  const { g } = setupGame(["Human", "Jax", "Nova"]);
  const bot1 = g.players[1];
  const bot2 = g.players[2];

  const t0 = 200000;
  // Bot 1 barks at t0
  const msg1 = triggerBotBark(g, bot1, "buy_property", { now: t0 });
  assert.ok(msg1);
  assert.equal(g.chat.length, 1);
  assert.equal(g.lastBotBarkTime, t0);

  // Bot 2 attempts to bark at t0 + 1500 (1.5s later -> blocked by 3s room throttle)
  const msg2 = triggerBotBark(g, bot2, "buy_property", { now: t0 + 1500 });
  assert.equal(msg2, null);
  assert.equal(g.chat.length, 1);
  assert.equal(bot2.lastBarkTime, 0);

  // Bot 2 attempts to bark at t0 + 2999 (< 3s -> blocked)
  const msg3 = triggerBotBark(g, bot2, "buy_property", { now: t0 + 2999 });
  assert.equal(msg3, null);
  assert.equal(g.chat.length, 1);

  // Bot 2 attempts to bark at t0 + 3000 (3s later -> succeeds)
  const msg4 = triggerBotBark(g, bot2, "buy_property", { now: t0 + 3000 });
  assert.ok(msg4);
  assert.equal(g.chat.length, 2);
  assert.equal(bot2.lastBarkTime, t0 + 3000);
  assert.equal(g.lastBotBarkTime, t0 + 3000);

  // Now bot 1 attempts at t0 + 5000 (only 5s since bot 1 barked, needs 8s)
  const msg5 = triggerBotBark(g, bot1, "buy_property", { now: t0 + 5000 });
  assert.equal(msg5, null);
  assert.equal(g.chat.length, 2);

  // Bot 1 attempts at t0 + 8000 (8s since bot 1 barked, and 5s since bot 2 barked) -> succeeds
  const msg6 = triggerBotBark(g, bot1, "buy_property", { now: t0 + 8000 });
  assert.ok(msg6);
  assert.equal(g.chat.length, 3);
});

test("humans never auto-bark", () => {
  const { g, host } = setupGame(["Alice", "Jax"]);
  assert.equal(host.bot, false);

  const categories = [
    "buy_property",
    "collect_rent",
    "pay_rent",
    "duel_challenge",
    "duel_win",
    "duel_loss",
    "stoppa_loss",
    "low_cash",
    "bankrupt",
  ];

  for (const cat of categories) {
    const res = triggerBotBark(g, host, cat);
    assert.equal(res, null, `Human must never bark for category ${cat}`);
    assert.equal(g.chat.length, 0);
  }
});

test("eliminated bots only bark if the event is bankruptcy", () => {
  const { g } = setupGame(["Human", "Jax"]);
  const bot = g.players[1];
  bot.out = true;

  // Non-bankrupt triggers should be ignored for eliminated bots
  assert.equal(triggerBotBark(g, bot, "buy_property"), null);
  assert.equal(triggerBotBark(g, bot, "pay_rent"), null);
  assert.equal(triggerBotBark(g, bot, "collect_rent"), null);
  assert.equal(g.chat.length, 0);

  // Bankrupt trigger is allowed as their final words
  const bark = triggerBotBark(g, bot, "bankrupt");
  assert.ok(bark);
  assert.equal(g.chat.length, 1);
  assert.equal(g.chat[0].text, bark.text);
});

test("in-game integration: bot buys property triggers buy_property bark", () => {
  const { g } = setupGame(["Human", "Jax"]);
  const bot = g.players[1];

  // Set bot as active player on an unowned property
  g.turn = 1;
  bot.pos = 1; // 1st property space
  g.phase = "buy";
  assert.equal(g.chat.length, 0);

  action(g, bot.id, { type: "buy" }, undefined, { now: 50000 });
  assert.equal(g.chat.length, 1);
  const msg = g.chat[0];
  assert.equal(msg.id, bot.id);
  assert.equal(msg.type, "chat");

  const hustlerBarks = PERSONALITIES.aggressive_hustler.barks.buy_property;
  assert.ok(hustlerBarks.includes(msg.text), `Bark '${msg.text}' should belong to Aggressive Hustler buy_property`);
});

test("in-game integration: human buying property never triggers bark", () => {
  const { g, host } = setupGame(["Human", "Jax"]);
  g.turn = 0;
  host.pos = 1;
  g.phase = "buy";

  action(g, host.id, { type: "buy" });
  assert.equal(g.chat.length, 0);
});

test("in-game integration: auction win by bot triggers buy_property bark", () => {
  const { g } = setupGame(["Human", "Jax"]);
  const bot = g.players[1];

  g.auction = {
    tile: 3,
    highBid: 150,
    highBidder: bot.id,
    passed: [g.players[0].id],
    startedAt: 1000,
    clock: 0,
  };
  g.phase = "auction";

  finishAuction(g, { now: 70000 });
  assert.equal(g.chat.length, 1);
  assert.equal(g.chat[0].id, bot.id);
  assert.equal(g.chat[0].type, "chat");
});

test("in-game integration: rent payment triggers pay_rent and collect_rent barks", () => {
  const { g } = setupGame(["Human", "Jax"]);
  const bot = g.players[1];
  const human = g.players[0];

  // Case 1: Bot pays rent to human landlord
  g.turn = 1;
  g.phase = "rent";
  g.pending = { amount: 100, owner: human.id, tile: 1 };
  bot.cash = 1000;
  human.cash = 1000;

  action(g, bot.id, { type: "pay" }, undefined, { now: 80000 });
  assert.equal(g.chat.length, 1);
  assert.equal(g.chat[0].id, bot.id);
  const payBarks = PERSONALITIES.aggressive_hustler.barks.pay_rent;
  assert.ok(payBarks.includes(g.chat[0].text), `Bark should be from pay_rent: ${g.chat[0].text}`);

  // Case 2: Human pays rent to bot landlord
  g.turn = 0;
  g.phase = "rent";
  g.pending = { amount: 120, owner: bot.id, tile: 3 };
  // Ensure cooldown has passed
  action(g, human.id, { type: "pay" }, undefined, { now: 90000 });
  assert.equal(g.chat.length, 2);
  assert.equal(g.chat[1].id, bot.id);
  const collectBarks = PERSONALITIES.aggressive_hustler.barks.collect_rent;
  assert.ok(collectBarks.includes(g.chat[1].text), `Bark should be from collect_rent: ${g.chat[1].text}`);
});

test("in-game integration: shootout challenge triggers duel_challenge bark", () => {
  const { g } = setupGame(["Human", "Jax"]);
  const bot = g.players[1];
  const human = g.players[0];

  // Set bot in rent debt they cannot afford
  g.turn = 1;
  g.phase = "rent";
  bot.cash = 50;
  g.pending = { amount: 200, owner: human.id, tile: 1 };

  action(g, bot.id, { type: "shootout" }, undefined, { now: 110000 });
  assert.equal(g.phase, "duel");
  assert.equal(g.chat.length, 1);
  assert.equal(g.chat[0].id, bot.id);
  const challengeBarks = PERSONALITIES.aggressive_hustler.barks.duel_challenge;
  assert.ok(challengeBarks.includes(g.chat[0].text), `Bark should be duel_challenge: ${g.chat[0].text}`);
});

test("in-game integration: stoppa loss triggers stoppa_loss bark", () => {
  const { g } = setupGame(["Human", "Jax"]);
  const bot = g.players[1];

  g.turn = 1;
  g.phase = "stoppa-result";
  g.pending = { percent: 10, amount: 150, basis: 1500 };

  action(g, bot.id, { type: "stoppa-collect" }, undefined, { now: 120000 });
  assert.equal(g.chat.length, 1);
  assert.equal(g.chat[0].id, bot.id);
  const stoppaBarks = PERSONALITIES.aggressive_hustler.barks.stoppa_loss;
  assert.ok(stoppaBarks.includes(g.chat[0].text), `Bark should be stoppa_loss: ${g.chat[0].text}`);
});

test("in-game integration: bot bankruptcy triggers bankrupt bark", () => {
  const { g } = setupGame(["Human", "Jax"]);
  const bot = g.players[1];

  eliminate(g, bot, g.players[0], { now: 130000 });
  assert.equal(bot.out, true);
  assert.equal(g.chat.length, 1);
  assert.equal(g.chat[0].id, bot.id);
  const bankruptBarks = PERSONALITIES.aggressive_hustler.barks.bankrupt;
  assert.ok(bankruptBarks.includes(g.chat[0].text), `Bark should be bankrupt: ${g.chat[0].text}`);
});

test("in-game integration: landing with low cash triggers low_cash bark", () => {
  const { g } = setupGame(["Human", "Jax"]);
  const bot = g.players[1];

  g.turn = 1;
  bot.cash = 100; // <= 150
  bot.pos = 10; // Jail / Just Visiting
  land(g, undefined, { now: 140000 });

  assert.equal(g.chat.length, 1);
  assert.equal(g.chat[0].id, bot.id);
  const lowCashBarks = PERSONALITIES.aggressive_hustler.barks.low_cash;
  assert.ok(lowCashBarks.includes(g.chat[0].text), `Bark should be low_cash: ${g.chat[0].text}`);
});

test("triggerBotBark supports context.emit and socket.io broadcasting", () => {
  const { g } = setupGame(["Human", "Jax"]);
  const bot = g.players[1];

  let emitted = null;
  const mockEmit = (event, payload) => {
    emitted = { event, payload };
  };

  const msg = triggerBotBark(g, bot, "buy_property", {
    now: 150000,
    emit: mockEmit,
  });

  assert.ok(msg);
  assert.ok(emitted);
  assert.equal(emitted.event, "chat");
  assert.equal(emitted.payload.id, bot.id);
  assert.equal(emitted.payload.text, msg.text);

  // Test setBotBarkIO
  let ioEmitted = null;
  const mockIO = {
    to: (code) => ({
      emit: (event, payload) => {
        ioEmitted = { code, event, payload };
      },
    }),
  };
  setBotBarkIO(mockIO);

  const msg2 = triggerBotBark(g, bot, "collect_rent", {
    now: 160000,
  });
  assert.ok(msg2);
  assert.ok(ioEmitted);
  assert.equal(ioEmitted.code, g.code);
  assert.equal(ioEmitted.event, "chat");
  assert.equal(ioEmitted.payload.id, bot.id);

  // Clean up global mock
  setBotBarkIO(null);
});
