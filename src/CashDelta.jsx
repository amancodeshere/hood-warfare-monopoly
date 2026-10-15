import React, { useState, useEffect, useRef } from "react";
import { money } from "../shared/board.js";

export function CashDeltaBadge({ cash }) {
  const prev = useRef(cash);
  const [delta, setDelta] = useState(null);
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (prev.current !== undefined && prev.current !== cash) {
      const diff = cash - prev.current;
      if (diff !== 0) {
        setDelta(diff);
        setKey((k) => k + 1);
        const t = setTimeout(() => setDelta(null), 1400);
        prev.current = cash;
        return () => clearTimeout(t);
      }
    }
    prev.current = cash;
  }, [cash]);

  if (!delta) return null;
  return (
    <span
      key={key}
      className={`cash-delta ${delta > 0 ? "gain" : "loss"}`}
      aria-hidden="true"
    >
      {delta > 0 ? `+${money(delta)}` : `-${money(Math.abs(delta))}`}
    </span>
  );
}
