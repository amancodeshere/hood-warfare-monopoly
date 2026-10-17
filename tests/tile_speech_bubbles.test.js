import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  getActivePlayerBark,
  sortTokenPlayersByBark,
  BARK_DURATION_MS,
  BARK_FADE_MS,
} from "../shared/barks.js";

test("getActivePlayerBark: retrieves latest chat message for a seated player with timestamp", () => {
  assert.equal(BARK_DURATION_MS, 3500, "Bark duration must be 3.5 seconds");
  assert.equal(BARK_FADE_MS, 500, "Bark fade duration must be 500ms");

  const now = 1000000;
  const p1 = { id: "p1", name: "Hustler" };
  const p2 = { id: "p2", name: "Kingpin" };

  const chat = [
    { id: "m1", player: "p1", name: "Hustler", text: "First message", time: now - 3200 },
    { id: "m2", player: "p2", name: "Kingpin", text: "Kingpin bark", time: now - 1000 },
    { id: "m3", player: "p1", name: "Hustler", text: "Latest Hustler bark", time: now - 500 },
  ];

  const barkP1 = getActivePlayerBark(chat, p1, now, 3500);
  assert.ok(barkP1, "Should find active bark for p1");
  assert.equal(barkP1.text, "Latest Hustler bark");
  assert.equal(barkP1.time, now - 500);
  assert.equal(barkP1.age, 500);
  assert.equal(barkP1.dismissing, false);

  const barkP2 = getActivePlayerBark(chat, p2, now, 3500);
  assert.ok(barkP2, "Should find active bark for p2");
  assert.equal(barkP2.text, "Kingpin bark");
  assert.equal(barkP2.age, 1000);
  assert.equal(barkP2.dismissing, false);
});

test("getActivePlayerBark: enters dismissing phase during the final 500ms of the 3.5s lifecycle", () => {
  const now = 2000000;
  const p1 = { id: "p1", name: "Hustler" };

  // Message sent 3100ms ago (within the final 500ms of 3500ms duration)
  const chat = [
    { id: "m1", player: "p1", name: "Hustler", text: "Fading out soon!", time: now - 3100 },
  ];

  const bark = getActivePlayerBark(chat, p1, now, 3500);
  assert.ok(bark, "Bark should still be active");
  assert.equal(bark.dismissing, true, "Bark must be marked dismissing in final 500ms");
  assert.equal(bark.age, 3100);
});

test("getActivePlayerBark: auto-dismisses after 3.5s (returns null when expired)", () => {
  const now = 3000000;
  const p1 = { id: "p1", name: "Hustler" };

  const chat = [
    { id: "m1", player: "p1", name: "Hustler", text: "Old message", time: now - 3501 },
  ];

  const bark = getActivePlayerBark(chat, p1, now, 3500);
  assert.equal(bark, null, "Should return null for messages older than 3500ms");
});

test("getActivePlayerBark: handles bot barks formatted with id/player and name matching", () => {
  const now = 4000000;
  const botPlayer = { id: "bot-1", name: "OG Bot", bot: true };

  // Bot barks created via server/botBarks.js format
  const botChat = [
    {
      type: "chat",
      id: "bot-1",
      player: "bot-1",
      name: "OG Bot",
      text: "Step off my block, rookie!",
      time: now - 1200,
    },
  ];

  const bark = getActivePlayerBark(botChat, botPlayer, now, 3500);
  assert.ok(bark, "Bot bark should be recognized");
  assert.equal(bark.text, "Step off my block, rookie!");
  assert.equal(bark.dismissing, false);
});

test("getActivePlayerBark: returns null for players without messages or invalid inputs", () => {
  const now = 5000000;
  const p1 = { id: "p1", name: "Hustler" };
  const pSilent = { id: "silent", name: "Quiet Crew" };

  const chat = [
    { id: "m1", player: "p1", text: "Hello", time: now - 500 },
  ];

  assert.equal(getActivePlayerBark(chat, pSilent, now), null);
  assert.equal(getActivePlayerBark([], p1, now), null);
  assert.equal(getActivePlayerBark(null, p1, now), null);
  assert.equal(getActivePlayerBark(chat, null, now), null);
});

test("Dynamic Monopoly Board Tile GUI: GameBoard.jsx implements perimeter tiles, content wrapper, and owner bar", () => {
  const content = readFileSync(resolve("src/components/GameBoard.jsx"), "utf8");

  assert.ok(content.includes('className="tile-content"'), "Perimeter tiles must render .tile-content wrapper");
  assert.ok(content.includes('className="tile-name"'), "Perimeter tiles must render .tile-name");
  assert.ok(content.includes('className="tile-price"'), "Perimeter tiles must render .tile-price");
  assert.ok(content.includes("tile-owner-bar"), "Perimeter tiles must include .tile-owner-bar class on owner badge");
  assert.ok(content.includes("token-bark-bubble"), "GameBoard must render .token-bark-bubble above walking tokens");
  assert.ok(content.includes("token-bark-tail"), "GameBoard must render .token-bark-tail pointer tail");
  assert.ok(content.includes('role="status"'), "Speech bubble must have role=status for accessibility");
  assert.ok(content.includes('aria-live="polite"'), "Speech bubble must have aria-live=polite");
});

test("Dynamic Monopoly Board Tile GUI: style.css defines container queries, clamp typography, and square corner tiles", () => {
  const css = readFileSync(resolve("src/style.css"), "utf8");

  // Tile container query and dynamic sizing
  assert.ok(css.includes("container-type: size"), ".tile must declare container-type: size");
  assert.ok(css.includes("container-name: tile"), ".tile must declare container-name: tile");
  assert.ok(css.includes("aspect-ratio: 1 / 1"), ".tile and corner tiles must declare aspect-ratio: 1 / 1");
  assert.ok(css.includes(".tile-content"), "style.css must style .tile-content");

  // Clamp typography and container query units (cqw/cqh)
  assert.ok(css.includes("cqw"), "Typography must use cqw container query width units");
  assert.ok(css.includes("cqh"), "Typography and spacing must use cqh container query height units");
  assert.ok(css.includes("clamp("), "Typography must use clamp() scaling");

  // Corner tiles maintain clean square aspect ratios and legible icons
  assert.ok(css.includes(".tile.corner"), "style.css must style .tile.corner");
  assert.ok(css.includes(".tile.corner > svg") || css.includes(".tile.corner .tile-content > svg"), "style.css must scale corner tile icons");

  // Owner bar styling
  assert.ok(css.includes(".tile-owner-bar"), "style.css must style .tile-owner-bar");

  // Overhead Speech Bubble styling, auto-dismiss, pointer tail, and reduced motion
  assert.ok(css.includes(".token-bark-bubble"), "style.css must style .token-bark-bubble");
  assert.ok(css.includes(".token-bark-bubble.dismissing"), "style.css must style .token-bark-bubble.dismissing fade state");
  assert.ok(css.includes("tokenBarkPopIn"), "style.css must animate .token-bark-bubble entrance");
  assert.ok(css.includes("overflow: visible !important"), ".tile:has(.token-bark-bubble) must unclip overflow for speech bubbles");
  assert.ok(css.includes("prefers-reduced-motion: reduce"), "style.css must respect prefers-reduced-motion: reduce");
});

test("sortTokenPlayersByBark: prioritizes players with active barks to front of stack", () => {
  const p1 = { id: "p1", name: "Player 1" };
  const p2 = { id: "p2", name: "Player 2" };
  const p3 = { id: "p3", name: "Player 3" };

  const players = [p1, p2, p3];
  const barks = {
    p3: { text: "I have a bark!", time: Date.now() },
  };

  const sorted = sortTokenPlayersByBark(players, barks, "p1");
  assert.equal(sorted[0].id, "p3", "Player with bark must be first in stack");
  assert.equal(sorted[1].id, "p1", "Local player 'me' follows after barkers");
  assert.equal(sorted[2].id, "p2", "Remaining players follow");
});

