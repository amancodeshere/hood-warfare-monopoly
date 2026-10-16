import { BOARD } from "./board.js";

/**
 * Checks if two player IDs are allied (same player or same team).
 */
export function isAllied(game, idA, idB) {
  if (!idA || !idB) return false;
  if (idA === idB) return true;
  if (!game?.settings?.teams) return false;
  const pA = game.players?.find((p) => p.id === idA);
  const pB = game.players?.find((p) => p.id === idB);
  return pA?.team != null && pA.team === pB?.team;
}

/**
 * Computes circular turn timer ring parameters.
 * Calculates progress percentage from (turnDeadline - now) / totalTurnTime.
 * Stroke color shifts:
 * - Electric Lime (#c4f53c) during normal thinking time
 * - Amber (#f59e0b) when under 15 seconds remaining
 * - Pulsing Crimson (#ff4336) when under 5 seconds remaining
 */
export function getTimerState(turnDeadline, now, totalTurnTime, radius = 19) {
  const deadline = turnDeadline || 0;
  const total = totalTurnTime && totalTurnTime > 0 ? totalTurnTime : 90000;
  const remainingMs = Math.max(0, deadline - now);
  const remainingSec = remainingMs / 1000;
  const progress = Math.max(0, Math.min(1, (deadline - now) / total));
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  let color = "#c4f53c";
  let urgency = "normal";
  let className = "normal";

  if (remainingSec < 5) {
    color = "#ff4336";
    urgency = "critical";
    className = "pulsing crimson";
  } else if (remainingSec < 15) {
    color = "#f59e0b";
    urgency = "warning";
    className = "amber";
  }

  return {
    remainingMs,
    remainingSec,
    progress,
    circumference,
    strokeDashoffset,
    color,
    urgency,
    className,
  };
}

/**
 * Checks if active player (or team) holds both utilities unmortgaged.
 */
export function holdsBothUtilities(game, playerId) {
  if (!game || !playerId) return false;
  const board = game?.board || BOARD;
  const utilities = board.filter((x) => x.type === "utility");
  if (utilities.length < 2) return false;
  return utilities.every((u) => {
    const q = game.props?.[u.id];
    return q && !q.mortgaged && isAllied(game, q.owner, playerId);
  });
}

/**
 * Checks if Grid Lockdown is disabled (already used this round or player lacks $100).
 */
export function getGridLockdownDisabled(game, playerId) {
  if (!game || !playerId) return true;
  const player = game.players?.find((p) => p.id === playerId);
  const lockdownUsedThisRound = game.lockdownUsedRound === game.round;
  const lacksFunds = (player?.cash || 0) < 100;
  return lockdownUsedThisRound || lacksFunds;
}

/**
 * Returns enemy districts (0-7) eligible for Grid Lockdown targeting.
 * Any district that is not completely owned by player's team is an enemy district.
 */
export function getEnemyDistricts(game, playerId) {
  const board = game?.board || BOARD;
  const enemyDistricts = [];
  for (let d = 0; d <= 7; d++) {
    const districtTiles = board.filter((x) => x.group === d);
    if (districtTiles.length === 0) continue;
    const ownedByTeam = districtTiles.every(
      (x) => game?.props?.[x.id] && isAllied(game, game.props[x.id].owner, playerId),
    );
    if (!ownedByTeam) {
      enemyDistricts.push(d);
    }
  }
  return enemyDistricts;
}

/**
 * Returns City Heat HUD Badge data when heatLevel > 0 (Round 15+).
 * Format: 🔥 CITY HEAT LVL [X] · HOME $[AMOUNT] · TAX +[Y]%
 */
export function getCityHeatBadge(game) {
  if (!game) return null;
  const heatLevel =
    game.heatLevel != null
      ? game.heatLevel
      : game.round >= 15
        ? Math.min(4, Math.floor((game.round - 15) / 5) + 1)
        : 0;

  if (heatLevel <= 0) return null;

  const homeBonus = Math.max(100, 200 - heatLevel * 25);
  const taxPercent = heatLevel * 20;
  const text = `🔥 CITY HEAT LVL ${heatLevel} · HOME $${homeBonus} · TAX +${taxPercent}%`;

  return {
    heatLevel,
    homeBonus,
    taxPercent,
    text,
  };
}
