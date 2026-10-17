import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, X } from "lucide-react";

import { QUICK_CHAT_OPTIONS } from "../../shared/quickChat.js";

export { QUICK_CHAT_OPTIONS };

export function QuickChatWheel({
  game,
  me,
  emit,
  disabled = false,
  onSelect,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleSelect = (option) => {
    if (disabled) return;
    setOpen(false);

    if (typeof onSelect === "function") {
      onSelect(option);
    }

    const myId = typeof me === "object" ? me?.id : me;
    if (myId && typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("stb-speech-bubble", {
          detail: { player: myId, text: option.text },
        }),
      );
    }

    if (typeof emit === "function") {
      emit("chat", { text: option.text });
    }
  };

  const mePlayer =
    typeof me === "object"
      ? me
      : game?.players?.find((p) => p.id === (me || game?.me));
  if (!game || !mePlayer) return null;

  const total = QUICK_CHAT_OPTIONS.length;
  const radius = 95; // px

  return (
    <div
      ref={containerRef}
      className={`quick-chat-wheel-container ${open ? "open" : ""} ${className}`.trim()}
      aria-label="Quick street barks menu"
    >
      {open && (
        <div
          className="quick-chat-radial-menu"
          role="menu"
          aria-label="Quick-chat options"
        >
          {QUICK_CHAT_OPTIONS.map((opt, index) => {
            const angleDeg = 180 + index * (90 / (total - 1));
            const angleRad = (angleDeg * Math.PI) / 180;
            const x = Math.round(Math.cos(angleRad) * radius);
            const y = Math.round(Math.sin(angleRad) * radius);

            return (
              <button
                key={opt.id}
                type="button"
                className="quick-chat-radial-item"
                style={{
                  "--x": `${x}px`,
                  "--y": `${y}px`,
                  "--delay": `${index * 30}ms`,
                }}
                role="menuitem"
                title={opt.text}
                aria-label={`${opt.emoji} ${opt.text}`}
                onClick={() => handleSelect(opt)}
                disabled={disabled}
              >
                <span className="quick-chat-emoji" aria-hidden="true">
                  {opt.emoji}
                </span>
                <span className="quick-chat-label">{opt.text}</span>
              </button>
            );
          })}
        </div>
      )}

      <button
        type="button"
        className={`quick-chat-fab ${open ? "active" : ""}`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={open ? "Close quick barks" : "Open quick barks wheel"}
        onClick={() => setOpen((prev) => !prev)}
        disabled={disabled}
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </div>
  );
}

export default QuickChatWheel;
