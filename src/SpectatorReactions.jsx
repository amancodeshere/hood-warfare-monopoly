import React, { useState, useEffect, useRef, useCallback } from "react";
import { REACTION_EMOJIS } from "./audio.js";
export { REACTION_EMOJIS };

/**
 * Floating Spectator Reaction Bar with emoji reaction pills.
 * Rate-limited to prevent reaction spam.
 */
export function SpectatorReactionPills({ onReact, disabled = false, className = "" }) {
  const [cooldown, setCooldown] = useState(false);
  const [pressedEmoji, setPressedEmoji] = useState(null);
  const lastPressRef = useRef(0);
  const pressCountRef = useRef(0);

  const handlePress = (emoji) => {
    if (disabled || cooldown) return;
    const now = Date.now();

    // Reset spam burst window every 2.5s
    if (now - lastPressRef.current > 2500) {
      pressCountRef.current = 0;
    }
    pressCountRef.current++;
    lastPressRef.current = now;

    // Trigger visual pop
    setPressedEmoji(emoji);
    setTimeout(() => setPressedEmoji(null), 180);

    // Apply 320ms cooldown between taps; extend to 1.2s if tapping fast (> 5 in 2.5s)
    const lockTime = pressCountRef.current >= 5 ? 1200 : 320;
    setCooldown(true);
    setTimeout(() => setCooldown(false), lockTime);

    if (onReact) {
      onReact(emoji);
    }
  };

  return (
    <div
      className={`spectator-reaction-bar ${className}`}
      role="toolbar"
      aria-label="Spectator hype reactions"
    >
      <span className="spectator-reaction-label">HYPE</span>
      {REACTION_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          className={`spectator-reaction-pill ${pressedEmoji === emoji ? "popped" : ""}`}
          onClick={() => handlePress(emoji)}
          disabled={disabled || cooldown}
          aria-label={`Send reaction ${emoji}`}
          title={`Send ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

/**
 * Renders floating reaction particles with particle physics over 1.8s.
 */
export function FloatingReactions({ reactions = [] }) {
  return (
    <div className="spectator-reactions-container" aria-hidden="true">
      {reactions.map((r) => (
        <span
          key={r.id}
          className="spectator-reaction-particle"
          style={{
            left: r.x,
            bottom: r.bottom || "80px",
            "--drift-x": `${r.driftX}px`,
            "--rot-start": `${r.rotStart}deg`,
            "--rot-mid": `${r.rotMid}deg`,
            "--rot-end": `${r.rotEnd}deg`,
          }}
        >
          {r.emoji}
        </span>
      ))}
    </div>
  );
}

/**
 * Hook to manage room & local spectator reactions with particle physics and rate limiting.
 */
export function useSpectatorReactions(socket) {
  const [reactions, setReactions] = useState([]);
  const lastSentRef = useRef(0);
  const sentCountRef = useRef(0);

  const spawnParticle = useCallback((emoji) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const x = `${15 + Math.random() * 70}%`;
    const driftX = Math.round((Math.random() - 0.5) * 90);
    const rotStart = Math.round((Math.random() - 0.5) * 18);
    const rotMid = Math.round((Math.random() - 0.5) * 28);
    const rotEnd = Math.round((Math.random() - 0.5) * 40);

    const newReaction = {
      id,
      emoji,
      x,
      bottom: "70px",
      driftX,
      rotStart,
      rotMid,
      rotEnd,
    };

    setReactions((prev) => [...prev.slice(-24), newReaction]);

    // Particles fade over 1.8s
    setTimeout(() => {
      setReactions((prev) => prev.filter((item) => item.id !== id));
    }, 1800);
  }, []);

  useEffect(() => {
    if (!socket) return;
    function onReaction(data) {
      if (data?.emoji && REACTION_EMOJIS.includes(data.emoji)) {
        spawnParticle(data.emoji);
      }
    }
    socket.on("reaction", onReaction);
    return () => {
      socket.off("reaction", onReaction);
    };
  }, [socket, spawnParticle]);

  const sendReaction = useCallback(
    (emoji) => {
      if (!REACTION_EMOJIS.includes(emoji)) return;
      const now = Date.now();
      if (now - lastSentRef.current > 3000) {
        sentCountRef.current = 0;
      }
      if (sentCountRef.current >= 8 && now - lastSentRef.current < 3000) {
        return; // Client rate-limit
      }
      sentCountRef.current++;
      lastSentRef.current = now;

      // Spawn local particle immediately
      spawnParticle(emoji);

      // Emit room reaction to other players / spectators
      if (socket && socket.connected) {
        socket.emit("reaction", { emoji });
      }
    },
    [socket, spawnParticle],
  );

  return {
    reactions,
    sendReaction,
    spawnParticle,
  };
}
