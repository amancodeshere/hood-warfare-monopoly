import React from "react";
import {
  Crown,
  Diamond,
  Flame,
  Anchor,
  Crosshair,
  CircleDollarSign,
  TrainFront,
  Car,
  KeyRound,
  Siren,
  Store,
  Shield,
  Sparkles,
  Home,
  Landmark,
  Circle,
} from "lucide-react";
import { CREWS } from "../../shared/board.js";
import { COSMETICS } from "../../shared/cosmetics.js";

export const icons = {
  crown: Crown,
  diamond: Diamond,
  flame: Flame,
  anchor: Anchor,
  start: Home,
  jail: Landmark,
  card: Sparkles,
  roulette: CircleDollarSign,
  transit: TrainFront,
  tax: CircleDollarSign,
  parking: Car,
  raid: Siren,
  property: Store,
  stoppa: Shield,
  utility: Sparkles,
  key: KeyRound,
  crosshair: Crosshair,
  car: Car,
  sparkles: Sparkles,
};

export function Icon({ name, ...props }) {
  const I = icons[name] || Circle;
  return <I size={18} strokeWidth={1.7} {...props} />;
}

export function CrewMark({ crew = 0, size = "normal", appearance }) {
  const item = COSMETICS.find((x) => x.id === appearance);
  return (
    <span
      className={`crew-mark ${size}`}
      style={{ "--crew": item?.color || CREWS[crew].color }}
    >
      <Icon name={item?.icon || CREWS[crew].symbol} />
    </span>
  );
}

export function Die({ value }) {
  const sets = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };
  return (
    <span className="die" role="img" aria-label={`Die showing ${value}`}>
      {Array.from({ length: 9 }, (_, i) => (
        <i key={i} className={sets[value].includes(i) ? "dot" : ""} />
      ))}
    </span>
  );
}

export function Button({
  children,
  secondary = false,
  danger = false,
  className = "",
  ...props
}) {
  return (
    <button
      className={`button ${secondary ? "secondary" : ""} ${danger ? "danger" : ""} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
