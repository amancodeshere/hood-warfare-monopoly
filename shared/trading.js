import { BOARD, DISTRICTS, money } from "./board.js";
import { DISTRICTS as _LEGACY_DISTRICTS } from "./legacy-board.js";

/**
 * Resolves the visual district color swatch for a board space.
 * Follows the game board color conventions:
 * - District properties: group color from map/legacy districts
 * - Transits: #486253
 * - Utilities: #5f5c40
 * - Other spaces: #2f3d33
 */
export function getDistrictColor(tile, districts = DISTRICTS) {
  if (!tile) return "#2f3d33";
  if (tile.group !== undefined && districts[tile.group]) {
    return districts[tile.group].color;
  }
  if (tile.type === "transit") return "#486253";
  if (tile.type === "utility") return "#5f5c40";
  return "#2f3d33";
}

/**
 * Calculates stepper adjustments for cash values.
 * Clamps result between 0 and maxVal.
 */
export function stepCash(currentVal, delta, maxVal = 0) {
  const current = parseInt(String(currentVal).trim(), 10) || 0;
  const max = Math.max(0, parseInt(String(maxVal).trim(), 10) || 0);
  const next = current + delta;
  return String(Math.min(max, Math.max(0, next)));
}

/**
 * Computes estimated asset values and trade parity for both sides.
 *
 * Valuation Rules:
 * - Unmortgaged property: 100% list price
 * - Mortgaged property: 50% list price (server standard in server/features.js)
 * - Cash: dollar-for-dollar
 * - Escape cards: $50 estimated value each (standard jail bail equivalent)
 *
 * Parity Status:
 * - "fair": difference is within $50 OR within 18% of the larger total value
 * - "generous": offering crew gives significantly more value than they receive
 * - "one-sided": offering crew requests significantly more value than they give
 */
export function calculateTradeValues(
  board = BOARD,
  props = {},
  {
    giveTiles = [],
    takeTiles = [],
    cash = 0,
    requestCash = 0,
    escapes = 0,
    requestEscapes = 0,
  } = {},
) {
  const giveCashVal = Math.max(0, parseInt(String(cash).trim(), 10) || 0);
  const takeCashVal = Math.max(0, parseInt(String(requestCash).trim(), 10) || 0);
  const giveCardsVal = Math.max(0, parseInt(String(escapes).trim(), 10) || 0) * 50;
  const takeCardsVal =
    Math.max(0, parseInt(String(requestEscapes).trim(), 10) || 0) * 50;

  const givePropsVal = (giveTiles || []).reduce((sum, id) => {
    const tile = board[id];
    if (!tile?.price) return sum;
    const isMortgaged = Boolean(props[id]?.mortgaged);
    return sum + tile.price * (isMortgaged ? 0.5 : 1);
  }, 0);

  const takePropsVal = (takeTiles || []).reduce((sum, id) => {
    const tile = board[id];
    if (!tile?.price) return sum;
    const isMortgaged = Boolean(props[id]?.mortgaged);
    return sum + tile.price * (isMortgaged ? 0.5 : 1);
  }, 0);

  const giveTotal = givePropsVal + giveCashVal + giveCardsVal;
  const takeTotal = takePropsVal + takeCashVal + takeCardsVal;
  const grandTotal = giveTotal + takeTotal;
  const diff = giveTotal - takeTotal;

  let status = "fair";
  let label = "Fair";
  let description = "Both sides are exchanging roughly equal value.";

  if (grandTotal === 0) {
    status = "fair";
    label = "Fair";
    description = "Add properties or cash to see the trade value comparison.";
  } else {
    const maxVal = Math.max(giveTotal, takeTotal);
    const diffAbs = Math.abs(diff);

    // Balanced deal if difference is <= $50 or within 18% parity
    if (diffAbs <= 50 || (maxVal > 0 && diffAbs / maxVal <= 0.18)) {
      status = "fair";
      label = "Fair";
      description =
        diff === 0
          ? `Even split: ${money(giveTotal)} on both sides.`
          : `Balanced exchange within ${money(diffAbs)} parity.`;
    } else if (giveTotal > takeTotal) {
      status = "generous";
      label = "Generous";
      description = `Your offer provides ${money(diff)} more estimated value to your rival.`;
    } else {
      status = "one-sided";
      label = "One-Sided";
      description = `Your offer asks for ${money(diffAbs)} more estimated value than you provide.`;
    }
  }

  const ratio = grandTotal > 0 ? giveTotal / grandTotal : 0.5;

  return {
    givePropsVal,
    takePropsVal,
    giveCashVal,
    takeCashVal,
    giveCardsVal,
    takeCardsVal,
    giveTotal,
    takeTotal,
    grandTotal,
    diff,
    ratio,
    status,
    label,
    description,
  };
}
