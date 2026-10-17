import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test("Single-Screen Viewport Lock: body:has(.game-layout.in-play) zero-scroll parity", () => {
  const css = readFileSync(resolve("src/style.css"), "utf8");
  const mainJsx = readFileSync(resolve("src/main.jsx"), "utf8");

  // Viewport lock on body when match is in-play
  assert.ok(
    css.includes("body:has(.game-layout.in-play)"),
    "Must target body:has(.game-layout.in-play) for viewport locking",
  );
  assert.match(
    css,
    /body:has\(\.game-layout\.in-play\)\s*\{[^}]*overflow:\s*hidden;/s,
    "body:has(.game-layout.in-play) must declare overflow: hidden",
  );
  assert.match(
    css,
    /body:has\(\.game-layout\.in-play\)\s*\{[^}]*height:\s*100vh;/s,
    "body:has(.game-layout.in-play) must declare height: 100vh",
  );
  assert.match(
    css,
    /body:has\(\.game-layout\.in-play\)\s*\{[^}]*max-height:\s*100dvh;/s,
    "body:has(.game-layout.in-play) must declare max-height: 100dvh",
  );

  // 3-column in-play grid layout locked to viewport height
  assert.ok(
    css.includes(".game-layout.in-play"),
    "Must style .game-layout.in-play",
  );
  assert.match(
    css,
    /\.game-layout\.in-play\s*\{[^}]*grid-template-columns:\s*220px\s+1fr\s+290px;/s,
    ".game-layout.in-play must define 3-column grid (220px 1fr 290px)",
  );
  assert.match(
    css,
    /\.game-layout\.in-play\s*\{[^}]*height:\s*calc\(100vh\s*-\s*64px\);/s,
    ".game-layout.in-play must set height: calc(100vh - 64px)",
  );
  assert.match(
    css,
    /\.game-layout\.in-play\s*\{[^}]*max-height:\s*calc\(100vh\s*-\s*64px\);/s,
    ".game-layout.in-play must set max-height: calc(100vh - 64px)",
  );
  assert.match(
    css,
    /\.game-layout\.in-play\s*\{[^}]*overflow:\s*hidden;/s,
    ".game-layout.in-play must set overflow: hidden",
  );
  assert.match(
    css,
    /\.game-layout\.in-play\s*\{[^}]*align-items:\s*center;/s,
    ".game-layout.in-play must set align-items: center",
  );

  // main.jsx applies in-play conditionally
  assert.ok(
    mainJsx.includes('game?.status === "playing" ? " in-play" : ""'),
    "main.jsx must conditionally apply in-play class when game is playing",
  );
});

test("Dynamic Board Sizing: .table-area and .board-shell fit on screen with 1/1 aspect ratio", () => {
  const css = readFileSync(resolve("src/style.css"), "utf8");

  // Dynamic board sizing properties
  assert.ok(
    css.includes(".table-area") && css.includes(".board-shell"),
    "CSS must target both .table-area and .board-shell",
  );
  assert.ok(
    css.includes("max-height: min(calc(100vh - 90px), calc(100vw - 540px));"),
    "Must declare max-height: min(calc(100vh - 90px), calc(100vw - 540px))",
  );
  assert.ok(
    css.includes("aspect-ratio: 1 / 1;"),
    "Must declare aspect-ratio: 1 / 1",
  );
  assert.ok(
    css.includes("width: auto;"),
    "Must declare width: auto",
  );
  assert.ok(
    css.includes("margin: auto;"),
    "Must declare margin: auto",
  );

  // Tiles and centerpiece scaling without overflow
  assert.ok(
    css.includes(".tile"),
    "Must define .tile rules for responsive board grid",
  );
  assert.ok(
    css.includes(".city-art"),
    "Must define .city-art rules for responsive centerpiece",
  );
  assert.match(
    css,
    /\.city-art\s*\{[^}]*object-fit:\s*contain;/s,
    "city-art must contain object-fit: contain to prevent centerpiece overflow",
  );
});

test("Independent Sidebar Scroll: .crew-sidebar and .action-sidebar independent scrolling and 5px scrollbars", () => {
  const css = readFileSync(resolve("src/style.css"), "utf8");

  // Independent sidebar height and scroll
  assert.ok(
    css.includes(".crew-sidebar") && css.includes(".action-sidebar"),
    "Must target .crew-sidebar and .action-sidebar",
  );
  assert.ok(
    css.includes("max-height: calc(100vh - 84px);"),
    "Sidebars must declare max-height: calc(100vh - 84px)",
  );
  assert.ok(
    css.includes("overflow-y: auto;"),
    "Sidebars must declare overflow-y: auto",
  );
  assert.ok(
    css.includes("overflow-x: hidden;"),
    "Sidebars must declare overflow-x: hidden",
  );

  // Custom slim 5px scrollbars
  assert.ok(
    css.includes(".crew-sidebar::-webkit-scrollbar") &&
      css.includes(".action-sidebar::-webkit-scrollbar"),
    "Must define ::-webkit-scrollbar on sidebars",
  );
  assert.ok(
    css.includes("width: 5px;"),
    "Sidebar scrollbars must specify width: 5px",
  );
});

test("Chat tab: fits inside right sidebar tabs cleanly without scroll jumping", () => {
  const mainJsx = readFileSync(resolve("src/main.jsx"), "utf8");
  const css = readFileSync(resolve("src/style.css"), "utf8");

  // Tab switching without scroll jumping
  assert.ok(
    !mainJsx.includes("scrollIntoView"),
    "Chat tab activation must not call scrollIntoView which causes scroll jumping",
  );
  assert.ok(
    mainJsx.includes('preventScroll: true'),
    "Chat input focus must specify preventScroll: true",
  );

  // Sidebar chat tab rendering
  assert.ok(
    mainJsx.includes('tab === "chat"'),
    "main.jsx must handle tab === 'chat'",
  );
  assert.ok(
    mainJsx.includes('className="sidebar-chat-tab"'),
    "main.jsx must render .sidebar-chat-tab",
  );
  assert.ok(
    css.includes(".sidebar-chat-tab"),
    "style.css must style .sidebar-chat-tab",
  );
});

test("Mobile uses the complete existing turn panel without a duplicate action dock", () => {
  const main = readFileSync(resolve("src/main.jsx"), "utf8");
  assert.ok(main.includes('<div className="turn-panel">{turnPanel()}</div>'));
  assert.ok(!main.includes("function MobileActionDock("));
});
