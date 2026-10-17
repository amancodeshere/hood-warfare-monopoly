/**
 * Pure functions and constants for player overhead speech bubbles / barks.
 */
export const BARK_DURATION_MS = 3500;
export const BARK_FADE_MS = 500;
export { QUICK_CHAT_OPTIONS } from "./quickChat.js";

/**
 * Returns the active bark / chat message for a seated player if sent within maxAgeMs.
 * Returns null if no matching message exists or the latest message has expired.
 *
 * @param {Array} chat Array of chat messages
 * @param {Object} player Player object { id, name }
 * @param {number} [now=Date.now()] Current timestamp in milliseconds
 * @param {number} [maxAgeMs=3500] Maximum age of a message before dismissal
 * @returns {Object|null}
 */
export function getActivePlayerBark(
  chat,
  player,
  now = Date.now(),
  maxAgeMs = BARK_DURATION_MS,
) {
  if (!chat || !player) return null;
  for (let i = chat.length - 1; i >= 0; i--) {
    const m = chat[i];
    if (!m || !m.text) continue;
    const isMatch =
      m.player === player.id ||
      (m.id && m.id === player.id) ||
      (!m.player && m.name && m.name === player.name);
    if (isMatch) {
      const msgTime = Number(m.time || m.timestamp || now);
      const age = now - msgTime;
      if (age >= 0 && age < maxAgeMs) {
        return {
          id: m.id || `${player.id}-${msgTime}`,
          text: m.text,
          time: msgTime,
          age,
          dismissing: age >= maxAgeMs - BARK_FADE_MS,
        };
      }
      return null;
    }
  }
  return null;
}

/**
 * Sorts players on a tile so players with active speech bubbles / barks appear
 * at the front of the token stack and are never hidden behind the stack count.
 *
 * @param {Array} players
 * @param {Object} barks Map of playerId -> bark object
 * @param {string} [meId] ID of the local client player
 * @returns {Array} Sorted shallow copy of players
 */
export function sortTokenPlayersByBark(players, barks = {}, meId = null) {
  if (!Array.isArray(players)) return [];
  return players.slice().sort((a, b) => {
    const barkA = barks && barks[a.id] ? 1 : 0;
    const barkB = barks && barks[b.id] ? 1 : 0;
    if (barkB !== barkA) return barkB - barkA;
    return Number(b.id === meId) - Number(a.id === meId);
  });
}
