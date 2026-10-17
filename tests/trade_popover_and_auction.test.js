import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test("CrewRoster: exports CrewRow and CrewRoster with rival Trade action button", () => {
  const content = readFileSync(resolve("src/components/CrewRoster.jsx"), "utf8");

  // Prop signatures
  assert.ok(content.includes("onTrade,"), "CrewRow and CrewRoster must accept onTrade prop");

  // Rival check logic
  assert.ok(
    content.includes('game?.status === "playing" && p.id !== game?.me && !p.out'),
    "Must verify rival is playing, active, and not the current player",
  );

  // Trade action button
  assert.ok(content.includes('className="crew-trade-btn"'), "Must render crew-trade-btn");
  assert.ok(content.includes("🤝 Trade"), "Must render 🤝 Trade button label");
  assert.ok(
    content.includes("aria-label={`Trade with ${p.name}`}"),
    "Must have accessible aria-label on trade button",
  );
  assert.ok(content.includes("onTrade(p)"), "Must invoke onTrade callback with target rival player");
  assert.ok(content.includes("onTrade={onTrade}"), "CrewRoster must forward onTrade prop to CrewRow");
});

test("VisualTrade & TradeModal: exports an exclusive accessible trade overlay", () => {
  const content = readFileSync(resolve("src/components/VisualTrade.jsx"), "utf8");

  // Component exports
  assert.ok(content.includes("export function TradeModal("), "VisualTrade.jsx must export TradeModal");
  assert.ok(content.includes("export function VisualTrade("), "VisualTrade.jsx must export VisualTrade");
  assert.ok(content.includes("export const ExchangePanel = VisualTrade;"), "Must export ExchangePanel alias");

  // TradeModal modal attributes & backdrop blur
  assert.ok(content.includes('className="trade-overlay-backdrop"'), "Must use elevated deed-popover-backdrop class");
  assert.ok(content.includes('className="trade-modal"'), "Must use trade-card-popover class");
  assert.ok(content.includes('role="dialog"'), "Must have role=dialog");
  assert.ok(content.includes('aria-modal="true"'), "Must declare aria-modal=true");
  assert.ok(content.includes('aria-label="Trade negotiation"'), "Must have aria-label Trade negotiation");
  assert.ok(content.includes("Trade negotiation"), "Must render Trade Negotiation heading");

  // 1-click close button & Escape key dismissal
  assert.ok(content.includes('className="icon-button trade-close-btn"'), "Must provide 1-click close button");
  assert.ok(content.includes('aria-label="Close trade negotiation"'), "Close button must have aria-label");
  assert.ok(content.includes('e.key === "Escape"'), "Must handle Escape key dismissal");
  assert.ok(content.includes("onClose?.()"), "Escape key and close button must invoke onClose");

  // initialPartnerId support
  assert.ok(content.includes("initialPartnerId"), "Must support initialPartnerId in VisualTrade and TradeModal");
  assert.ok(content.includes("initialPartnerId ||"), "Must initialize selected partner from initialPartnerId");
});

test("Auction: smooth bidding UI with stable input, quick-bid chips, and exact Playwright compatibility", () => {
  const content = readFileSync(resolve("src/Extras.jsx"), "utf8");

  // Component export
  assert.ok(content.includes("export function Auction({ game, act, disabled, now })"), "Extras.jsx must export Auction");

  // Stable input clamping & state
  assert.ok(content.includes("const minBid = (a?.highBid || 0) + 10;"), "Must calculate minBid as highBid + 10");
  assert.ok(content.includes("const maxBid = me?.cash || 0;"), "Must calculate maxBid based on player cash");
  assert.ok(content.includes("const [rawInput, setRawInput] = useState("), "Must manage smooth bid input via rawInput state");
  assert.ok(content.includes("applyQuickBid"), "Must support quick-bid adjustment helper");

  // Clamping in applyQuickBid
  assert.ok(
    content.includes("Math.max(minBid, Math.min(maxBid,"),
    "Quick bid helper must clamp between minBid and maxBid",
  );

  // Exact Playwright elements: input id, label, and exact button names
  assert.ok(content.includes('id="auction-bid"'), "Bid input must have id auction-bid for Playwright getByLabel");
  assert.ok(content.includes('min={minBid}'), "Input min must be bound to minBid");
  assert.ok(content.includes('max={maxBid}'), "Input max must be bound to maxBid");
  assert.ok(content.includes("Your bid ·"), "Label must contain Your bid ·");
  assert.ok(content.includes("Bid {money(numericBid)}"), "Bid button must match exact label format Bid $X");
  assert.ok(content.includes("Pass"), "Pass button must match exact label Pass");

  // Quick-bid chip buttons
  assert.ok(content.includes('className="auction-quick-chips"'), "Must render auction-quick-chips container");
  assert.ok(content.includes("+$10"), "Must render +$10 chip");
  assert.ok(content.includes("+$25"), "Must render +$25 chip");
  assert.ok(content.includes("+$50"), "Must render +$50 chip");
  assert.ok(content.includes("+$100"), "Must render +$100 chip");
  assert.ok(content.includes("Match + $10"), "Must render Match + $10 chip");

  // Quick-bid chip accessible aria-labels
  assert.ok(content.includes('aria-label="Add $10 to bid"'), "Must have +$10 aria-label");
  assert.ok(content.includes('aria-label="Add $25 to bid"'), "Must have +$25 aria-label");
  assert.ok(content.includes('aria-label="Add $50 to bid"'), "Must have +$50 aria-label");
  assert.ok(content.includes('aria-label="Add $100 to bid"'), "Must have +$100 aria-label");
  assert.ok(content.includes('aria-label="Match high bid plus $10"'), "Must have Match + $10 aria-label");
});

test("main.jsx: integrates TradeModal, passes onTrade to CrewRoster, and removes the embedded trade composer", () => {
  const mainContent = readFileSync(resolve("src/main.jsx"), "utf8");

  // Imports
  assert.ok(mainContent.includes('import { TradeModal, VisualTrade } from "./components/VisualTrade.jsx";'), "Must import TradeModal from VisualTrade.jsx");

  // State hooks
  assert.ok(mainContent.includes("tradeModalOpen"), "Must have tradeModalOpen state in main.jsx");
  assert.ok(mainContent.includes("tradePartnerId"), "Must have tradePartnerId state in main.jsx");

  // CrewRoster integration
  assert.ok(
    mainContent.includes("setTradePartnerId(rival?.id || null)"),
    "Must set trade partner when onTrade is called from CrewRoster",
  );
  assert.ok(
    mainContent.includes("setTradeModalOpen(true)"),
    "Must open trade modal on onTrade",
  );

  // TradeModal rendered directly over board
  assert.ok(mainContent.includes("<TradeModal"), "Must render TradeModal in main component tree");
  assert.ok(mainContent.includes("tradeModalOpen && game"), "Must conditionally render TradeModal");

  // Backward compatibility: embedded Trade tab preserved
  assert.ok(!mainContent.includes("<ExchangePanel"), "Trade composer must only render inside its overlay");

  // Re-exports
  assert.ok(
    mainContent.includes("export { DeedCardPopover, CrewRoster, GameBoard, Board }"),
    "Must preserve DeedCardPopover, CrewRoster, GameBoard, Board re-export",
  );
  assert.ok(
    mainContent.includes("export { Auction, TradeModal, VisualTrade }") ||
      (/export\s*\{[^}]*\bAuction\b[^}]*\bTradeModal\b[^}]*\bVisualTrade\b[^}]*\}/.test(mainContent)),
    "Must re-export Auction, TradeModal, VisualTrade from main.jsx",
  );
});

test("style.css: includes glassmorphic modal styles, rival trade button, and quick-bid chips", () => {
  const css = readFileSync(resolve("src/style.css"), "utf8");

  assert.ok(css.includes(".crew-trade-btn"), "Must style .crew-trade-btn");
  assert.ok(css.includes(".trade-modal-backdrop"), "Must style .trade-modal-backdrop");
  assert.ok(css.includes(".trade-card-popover"), "Must style .trade-card-popover");
  assert.ok(css.includes(".trade-modal-header"), "Must style .trade-modal-header");
  assert.ok(css.includes(".trade-close-btn"), "Must style .trade-close-btn");
  assert.ok(css.includes(".auction-quick-chips"), "Must style .auction-quick-chips");
  assert.ok(css.includes(".auction-chip-btn"), "Must style .auction-chip-btn");
  assert.ok(css.includes(".match-chip-btn"), "Must style .match-chip-btn");
});
