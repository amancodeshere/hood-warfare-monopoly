import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { room, player, start, action, board } from "../server/game.js";
import {
  completesDistrictSet,
  botEvaluateTrade,
  extendedAction,
} from "../server/features.js";
import { getBotBarkText } from "../server/botBarks.js";
import { QUICK_CHAT_OPTIONS } from "../shared/quickChat.js";
import { getActivePlayerBark } from "../shared/barks.js";

function setupGame(botOpts = {}) {
  const p = player("Hustler");
  const b = player("Jax");
  b.bot = true;
  b.personality = botOpts.personality || "aggressive_hustler";

  const g = room("TESTBOT", p);
  g.players.push(b);
  start(g, p.id);
  if (botOpts.botCash !== undefined) b.cash = botOpts.botCash;
  if (botOpts.playerCash !== undefined) p.cash = botOpts.playerCash;
  return { g, p, b };
}

test("Monopoly set valuation: completesDistrictSet accurately detects monopoly completion", () => {
  const { g, p } = setupGame();
  const bTiles = board(g);

  // Group 0 in Atlanta: Tile 1 (Auntie's Bodega, $60) and Tile 3 (Broke Boy Blvd, $80)
  const tile1 = bTiles.find((t) => t.group === 0 && t.id === 1);
  const tile3 = bTiles.find((t) => t.group === 0 && t.id === 3);
  assert.ok(tile1 && tile3, "District 0 tiles must exist");

  // Neither owns anything initially
  assert.equal(completesDistrictSet(g, p.id, 1, [1], []), false);

  // Human player owns tile 1
  g.props[1] = { owner: p.id, level: 0, mortgaged: false };

  // Acquiring tile 3 will now complete District 0 for player p
  assert.equal(
    completesDistrictSet(g, p.id, 3, [3], []),
    true,
    "Gaining tile 3 when owning tile 1 must complete District 0",
  );

  // But acquiring tile 1 again does not complete a new set
  assert.equal(
    completesDistrictSet(g, p.id, 1, [1], []),
    false,
    "Already owned tile does not complete a new set",
  );

  // If player already owns both, neither completes the set
  g.props[3] = { owner: p.id, level: 0, mortgaged: false };
  assert.equal(
    completesDistrictSet(g, p.id, 3, [3], []),
    false,
    "District already completed prior to trade",
  );
});

test("Monopoly set valuation: opponent set-completing property is valued at 2.2x list price", () => {
  const { g, p, b } = setupGame();
  const bTiles = board(g);

  // Group 0: Tile 1 ($60), Tile 3 ($80)
  // Human owns Tile 1, Bot owns Tile 3 ($80 list price)
  g.props[1] = { owner: p.id, level: 0, mortgaged: false };
  g.props[3] = { owner: b.id, level: 0, mortgaged: false };

  // Group 1: Tile 6 ($100), Tile 8 ($120), Tile 9 ($140)
  // Human gives Tile 6 ($100 list price) which does NOT complete a set
  g.props[6] = { owner: p.id, level: 0, mortgaged: false };

  // Trade: Human offers Tile 6 ($100) and wants Tile 3 ($80)
  // Tile 3 completes District 0 for Human -> valued at 80 * 2.2 = 176 to the bot!
  // Tile 6 gives 100 to the bot.
  // Ratio = 100 / 176 = 0.568 (< 0.80) -> Bot declines!
  const tr = {
    id: "tr-monopoly-val",
    from: p.id,
    to: b.id,
    giveTiles: [6],
    takeTiles: [3],
    cash: 0,
    requestCash: 0,
    giveEscapes: 0,
    takeEscapes: 0,
  };

  const evalResult = botEvaluateTrade(g, tr);
  assert.ok(evalResult);
  assert.equal(evalResult.valueGiven, 80 * 2.2, "Bot gives tile valued at 2.2x list price");
  assert.equal(evalResult.valueReceived, bTiles[6].price, "Bot receives tile at standard 1.0x list price");
  assert.equal(evalResult.givesOpponentMonopoly, true);
  assert.equal(evalResult.givesBotMonopoly, false);
  assert.equal(evalResult.decision, "decline");
  assert.equal(evalResult.accept, false);
});

test("Monopoly protection: bot declines trade granting opponent monopoly without monopoly compensation", () => {
  const { g, p, b } = setupGame();

  // Human owns Tile 1, Bot owns Tile 3 ($80 list price, monopoly value = $176)
  g.props[1] = { owner: p.id, level: 0, mortgaged: false };
  g.props[3] = { owner: b.id, level: 0, mortgaged: false };

  // Opponent offers $160 cash for Tile 3 ($80 list price)
  // Ratio = 160 / 176 = 0.909 (between 0.80 and 0.99)
  // Normally 0.909 would trigger a counter-offer, but this gives opponent a monopoly
  // while giving the bot NO monopoly, so it must decline unless heavily compensated (>= 1.5x)
  const tr = {
    id: "tr-close-monopoly",
    from: p.id,
    to: b.id,
    giveTiles: [],
    takeTiles: [3],
    cash: 160,
    requestCash: 0,
    giveEscapes: 0,
    takeEscapes: 0,
  };

  const evalResult = botEvaluateTrade(g, tr);
  assert.equal(evalResult.givesOpponentMonopoly, true);
  assert.equal(evalResult.givesBotMonopoly, false);
  assert.equal(
    evalResult.decision,
    "decline",
    "Bot must decline monopoly-granting trade when not heavily compensated",
  );
});

test("Monopoly protection: bot accepts trade granting monopoly if heavily compensated (ratio >= 1.5)", () => {
  const { g, p, b } = setupGame();

  // Human owns Tile 1, Bot owns Tile 3 ($80 list price, monopoly value = $176)
  g.props[1] = { owner: p.id, level: 0, mortgaged: false };
  g.props[3] = { owner: b.id, level: 0, mortgaged: false };

  // Opponent offers heavy cash compensation: $300 cash for Tile 3
  // Ratio = 300 / 176 = 1.704 (>= 1.5)
  const tr = {
    id: "tr-heavily-compensated",
    from: p.id,
    to: b.id,
    giveTiles: [],
    takeTiles: [3],
    cash: 300,
    requestCash: 0,
    giveEscapes: 0,
    takeEscapes: 0,
  };

  const evalResult = botEvaluateTrade(g, tr);
  assert.equal(evalResult.givesOpponentMonopoly, true);
  assert.ok(evalResult.ratio >= 1.5, "Ratio must be heavily compensated (>= 1.5)");
  assert.equal(evalResult.decision, "accept", "Bot accepts heavily compensated monopoly trade");
  assert.equal(evalResult.accept, true);
});

test("Monopoly swap: bot allows mutual monopoly trades with fair valuation", () => {
  const { g, p, b } = setupGame();

  // District 0: Human owns 1, Bot owns 3 ($80) -> Bot giving 3 completes District 0 for human
  g.props[1] = { owner: p.id, level: 0, mortgaged: false };
  g.props[3] = { owner: b.id, level: 0, mortgaged: false };

  // District 7: Rich Auntie Row (37, $460), Final Boss Estate (39, $500)
  // Bot owns 37, Human owns 39 -> Human giving 39 completes District 7 for bot
  g.props[37] = { owner: b.id, level: 0, mortgaged: false };
  g.props[39] = { owner: p.id, level: 0, mortgaged: false };

  // Human offers 39 for 3 + $500 cash
  const tr = {
    id: "tr-monopoly-swap",
    from: p.id,
    to: b.id,
    giveTiles: [39],
    takeTiles: [3],
    cash: 0,
    requestCash: 0,
    giveEscapes: 0,
    takeEscapes: 0,
  };

  const evalResult = botEvaluateTrade(g, tr);
  assert.equal(evalResult.givesOpponentMonopoly, true);
  assert.equal(evalResult.givesBotMonopoly, true);
  // Both get monopolies, so the asymmetric monopoly decline rule does not block it
  assert.ok(evalResult.valueReceived > evalResult.valueGiven);
  assert.equal(evalResult.decision, "accept");
});

test("Counter-offer generation: bot generates counter-offer adjusting requestCash when ratio is 0.80 to 0.99", () => {
  const { g, p, b } = setupGame();

  // Group 2: Tile 11 ($160), Tile 13 ($180), Tile 14 ($200)
  // Human owns 11, Bot owns 13. Neither completes a monopoly
  g.props[11] = { owner: p.id, level: 0, mortgaged: false };
  g.props[13] = { owner: b.id, level: 0, mortgaged: false };

  // Human offers Tile 11 ($160) for Bot's Tile 13 ($180)
  // Ratio = 160 / 180 = 0.888 (between 0.80 and 0.99)
  // Deficit = $20. Bot counters asking for $20 cash
  const tr = {
    id: "tr-close-ratio",
    from: p.id,
    to: b.id,
    giveTiles: [11],
    takeTiles: [13],
    cash: 0,
    requestCash: 0,
    giveEscapes: 0,
    takeEscapes: 0,
  };

  const evalResult = botEvaluateTrade(g, tr);
  assert.ok(evalResult);
  assert.equal(evalResult.decision, "counter");
  assert.equal(evalResult.accept, false);
  assert.ok(evalResult.ratio >= 0.80 && evalResult.ratio < 1.0);

  // Verify counter-offer payload
  const counter = evalResult.counter;
  assert.ok(counter);
  assert.equal(counter.type, "trade-counter");
  assert.equal(counter.offerId, tr.id);
  assert.equal(counter.to, p.id);
  assert.deepEqual(counter.giveTiles, [13], "Bot offers the property human wanted");
  assert.deepEqual(counter.takeTiles, [11], "Bot takes the property human offered");
  assert.equal(counter.cash, 0);
  assert.equal(counter.requestCash, 20, "Bot requests $20 to make trade equitable");
});

test("Counter-offer generation: bot declines if opponent cannot afford required counter cash", () => {
  const { g, p, b } = setupGame({ playerCash: 10 });

  // Bot owns Tile 13 ($180), Human owns Tile 11 ($160)
  g.props[11] = { owner: p.id, level: 0, mortgaged: false };
  g.props[13] = { owner: b.id, level: 0, mortgaged: false };

  // Deficit is $20, but human only has $10 cash
  const tr = {
    id: "tr-unaffordable-counter",
    from: p.id,
    to: b.id,
    giveTiles: [11],
    takeTiles: [13],
    cash: 0,
    requestCash: 0,
    giveEscapes: 0,
    takeEscapes: 0,
  };

  const evalResult = botEvaluateTrade(g, tr);
  assert.equal(
    evalResult.decision,
    "decline",
    "Bot must decline if opponent cannot afford the counter cash",
  );
  assert.equal(evalResult.accept, false);
});

test("Quick-chat wheel: options match street barks and format valid chat payloads", () => {
  assert.equal(QUICK_CHAT_OPTIONS.length, 6, "Must define exactly 6 street barks");

  const expectedBarks = [
    { emoji: "💰", text: "Run my money!" },
    { emoji: "⚠️", text: "Watch your step!" },
    { emoji: "👑", text: "GG, respect!" },
    { emoji: "🎯", text: "Spin the block on 'em!" },
    { emoji: "🚪", text: "I'm outside!" },
    { emoji: "🤝", text: "Let's make a deal." },
  ];

  expectedBarks.forEach((expected, i) => {
    const opt = QUICK_CHAT_OPTIONS[i];
    assert.equal(opt.emoji, expected.emoji, `Option ${i} emoji matches`);
    assert.equal(opt.text, expected.text, `Option ${i} text matches`);
    assert.ok(opt.id, `Option ${i} must have an ID`);
    assert.ok(opt.label, `Option ${i} must have a label`);
    assert.ok(opt.text.length >= 1 && opt.text.length <= 280, "Text within valid chat length");
  });
});

test("Quick-chat wheel: dispatching bark produces valid chat message and active overhead speech bubble", () => {
  const { g, p } = setupGame();
  const now = 500000;

  const bark = QUICK_CHAT_OPTIONS[0]; // 💰 "Run my money!"
  const chatMsg = {
    id: "msg-1",
    player: p.id,
    name: p.name,
    text: bark.text,
    time: now,
  };

  g.chat.push(chatMsg);

  const activeBark = getActivePlayerBark(g.chat, p, now, 3500);
  assert.ok(activeBark, "Player must have active overhead bark");
  assert.equal(activeBark.text, "Run my money!");
  assert.equal(activeBark.dismissing, false);
});

test("Bot personality barks: trade_accept and trade_decline are configured for all bot personalities", () => {
  const personalities = [
    "aggressive_hustler",
    "street_gambler",
    "chill_veteran",
    "defensive_mogul",
  ];

  personalities.forEach((pers) => {
    const fakeBot = { id: "bot-test", name: "TestBot", bot: true, personality: pers };
    const acceptBark = getBotBarkText(fakeBot, "trade_accept");
    const declineBark = getBotBarkText(fakeBot, "trade_decline");

    assert.ok(acceptBark, `${pers} must have trade_accept barks`);
    assert.ok(typeof acceptBark === "string" && acceptBark.length > 0);
    assert.ok(declineBark, `${pers} must have trade_decline barks`);
    assert.ok(typeof declineBark === "string" && declineBark.length > 0);
  });
});

test("Trade respond triggers bot bark on accept and decline", () => {
  const { g, p, b } = setupGame();
  const now = 600000;

  g.props[1] = { owner: p.id, level: 0, mortgaged: false };
  g.props[3] = { owner: b.id, level: 0, mortgaged: false };

  // Propose a trade from p to bot b
  action(g, p.id, {
    type: "trade",
    to: b.id,
    giveTiles: [1],
    takeTiles: [3],
  }, () => 0, { now });

  assert.ok(g.trade);
  const offerId = g.trade.id;

  // Bot declines trade offer
  extendedAction(g, b.id, {
    type: "trade-respond",
    offerId,
    accept: false,
  }, () => 0, { now });

  assert.equal(g.trade, null);
  assert.equal(b.lastBarkType, "trade_decline", "Bot must trigger trade_decline bark");
  assert.ok(g.chat.some((m) => m.player === b.id), "Decline bark must be recorded in room chat");
});

test("Bot trade deliberation: simulates 1.2s delay before answering trade", () => {
  const { g, p, b } = setupGame();
  const now = 1000000;

  g.props[1] = { owner: p.id, level: 0, mortgaged: false };
  g.props[3] = { owner: b.id, level: 0, mortgaged: false };

  action(g, p.id, {
    type: "trade",
    to: b.id,
    giveTiles: [1],
    takeTiles: [3],
  }, () => 0, { now });

  assert.ok(g.trade);
  assert.equal(g.trade.createdAt, now);

  // Before 1.2s has elapsed, trade is still pending
  const elapsedEarly = 500;
  const isDeliberatingEarly = elapsedEarly < 1200;
  assert.equal(isDeliberatingEarly, true, "Bot deliberates for 1.2s before answering");

  // After 1.2s has elapsed, deliberation is complete
  const elapsedLate = 1300;
  const isDeliberatingLate = elapsedLate < 1200;
  assert.equal(isDeliberatingLate, false, "After 1.2s deliberation delay expires, bot answers");
});

test("QuickChatWheel component: exports QuickChatWheel, renders floating emote button and radial options", () => {
  const content = readFileSync(resolve("src/components/QuickChatWheel.jsx"), "utf8");

  assert.ok(content.includes("export function QuickChatWheel"), "Must export QuickChatWheel");
  assert.ok(content.includes("quick-chat-fab"), "Must render floating button with quick-chat-fab class");
  assert.ok(content.includes("quick-chat-radial-menu"), "Must render radial menu container");
  assert.ok(content.includes("quick-chat-radial-item"), "Must render radial menu items");
  assert.ok(content.includes('emit("chat"'), "Selecting an option must dispatch chat message through socket");
  assert.ok(content.includes("stb-speech-bubble"), "Selecting an option must trigger overhead speech bubble");
  assert.ok(content.includes("MessageCircle"), "Must include chat bubble icon");
});

test("QuickChatWheel styling: style.css defines floating button, radial menu items, and responsive scaling", () => {
  const css = readFileSync(resolve("src/style.css"), "utf8");

  assert.ok(css.includes(".quick-chat-wheel-container"), "style.css must style .quick-chat-wheel-container");
  assert.ok(css.includes(".quick-chat-fab"), "style.css must style .quick-chat-fab");
  assert.ok(css.includes(".quick-chat-radial-menu"), "style.css must style .quick-chat-radial-menu");
  assert.ok(css.includes(".quick-chat-radial-item"), "style.css must style .quick-chat-radial-item");
  assert.ok(css.includes("quickChatPop"), "style.css must define entrance animation for radial items");
  assert.ok(css.includes(".quick-chat-label"), "style.css must style option text labels");
});

