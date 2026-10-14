import React, { useEffect, useId, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

const project = (u, v, height = 0) => [
  300 + (u - v) * 0.63,
  92 + (u + v) * 0.315 - height,
];
const polygon = (points) => points.map((p) => p.join(",")).join(" ");
const lots = [
  { u: 22, v: 22, w: 70, d: 64, h: 46, label: "DELI", tone: 0 },
  { u: 168, v: 20, w: 42, d: 70, h: 83, tone: 1 },
  { u: 220, v: 22, w: 34, d: 72, h: 106, tone: 2 },
  { u: 314, v: 20, w: 72, d: 72, h: 68, tone: 0 },
  { u: 20, v: 168, w: 72, d: 66, h: 62, tone: 2 },
  { u: 168, v: 168, w: 42, d: 70, h: 110, tone: 1 },
  { u: 220, v: 170, w: 32, d: 76, h: 78, tone: 0 },
  { u: 314, v: 168, w: 72, d: 68, h: 50, label: "808", tone: 2 },
  { u: 22, v: 312, w: 72, d: 72, h: 40, label: "GROVE", tone: 0 },
  { u: 314, v: 312, w: 38, d: 72, h: 62, tone: 1 },
  { u: 362, v: 314, w: 30, d: 72, h: 80, label: "ARCADE", tone: 2 },
];
const trees = [
  [108, 30],
  [108, 88],
  [30, 108],
  [190, 108],
  [380, 108],
  [108, 190],
  [108, 242],
  [258, 198],
  [394, 236],
  [30, 394],
  [100, 390],
  [260, 338],
  [260, 388],
  [394, 394],
];
function Building({ u, v, w, d, h, label, tone }) {
  const a = project(u, v),
    b = project(u + w, v),
    c = project(u + w, v + d),
    e = project(u, v + d);
  const roof = [a, b, c, e].map(([x, y]) => [x, y - h]);
  const color = `var(--city-${["one", "two", "three"][tone]}, ${["#a6957c", "#85978e", "#94a9a4"][tone]})`;
  const floors = Math.max(1, Math.floor((h - 8) / 17));
  return (
    <g className="city-building" data-lot={`${u},${v}`}>
      <polygon
        points={polygon([a, b, c, e].map(([x, y]) => [x + 9, y + 5]))}
        fill="#111917"
        opacity=".35"
      />
      <polygon
        points={polygon([roof[1], roof[2], c, b])}
        fill={color}
        style={{ filter: "brightness(.72)" }}
      />
      <polygon points={polygon([roof[3], roof[2], c, e])} fill={color} />
      <polygon points={polygon(roof)} fill="var(--city-roof, #b6c5b7)" />
      <polygon
        points={polygon([
          project(u + 4, v + 4, h + 1),
          project(u + w - 4, v + 4, h + 1),
          project(u + w - 4, v + d - 4, h + 1),
          project(u + 4, v + d - 4, h + 1),
        ])}
        fill={color}
        opacity=".35"
      />
      {Array.from({ length: floors }, (_, floor) =>
        Array.from({ length: Math.max(1, Math.floor(w / 15)) }, (_, col) => {
          const x = u + 8 + col * 15,
            level = 12 + floor * 17;
          return (
            <polygon
              key={`${floor}-${col}`}
              points={polygon([
                project(x, v + d, level + 7),
                project(x + 7, v + d, level + 7),
                project(x + 7, v + d, level),
                project(x, v + d, level),
              ])}
              fill={(floor + col) % 3 === 0 ? "#e7d592" : "#31443b"}
            />
          );
        }),
      )}
      {label && (
        <g
          transform={`translate(${project(u + w / 2, v + d, 12).join(" ")}) rotate(26.565)`}
        >
          <rect
            x={-w * 0.29}
            y="-7"
            width={w * 0.58}
            height="11"
            fill="#d9c784"
          />
          <text
            textAnchor="middle"
            y="1"
            fill="#222c25"
            fontSize={label.length > 5 ? "4" : "5"}
            fontWeight="800"
          >
            {label}
          </text>
        </g>
      )}
    </g>
  );
}
function Tree({ u, v }) {
  const [x, y] = project(u, v);
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse rx="10" ry="4" cy="2" fill="#101b15" opacity=".35" />
      <path d="M0 0v-15" stroke="#756c51" strokeWidth="3" />
      <path d="M-10-11L0-34l10 23Z" fill="#64815c" />
      <path d="M-8-21L0-39l8 18Z" fill="#81966a" />
    </g>
  );
}
function Car({ from, to, rest, duration, delay, color, vertical, reverse }) {
  return (
    <g
      className="city-car"
      style={{
        "--car-from": `translate(${from[0]}px, ${from[1]}px)`,
        "--car-to": `translate(${to[0]}px, ${to[1]}px)`,
        "--car-rest": `translate(${rest[0]}px, ${rest[1]}px)`,
        "--car-duration": `${duration}s`,
        "--car-delay": `${delay}s`,
      }}
    >
      <g
        transform={
          vertical ? "rotate(90)" : reverse ? "rotate(180)" : undefined
        }
      >
        <rect
          x="-10"
          y="-4"
          width="21"
          height="10"
          rx="2"
          fill="#111917"
          opacity=".4"
        />
        <rect x="-10" y="-5" width="20" height="9" rx="2" fill={color} />
        <rect x="-4" y="-4" width="9" height="7" rx="1" fill="#364d45" />
        <path d="M-1-4v7" stroke={color} strokeWidth="2" />
        <path d="M8-3v2M8 1v2" stroke="#eddda1" strokeWidth="1.5" />
      </g>
    </g>
  );
}
export default function City({ palette, theme }) {
  const id = useId().replaceAll(":", ""),
    ref = useRef(null);
  const [paused, setPaused] = useState(false),
    [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.05 },
    );
    if (ref.current) observer.observe(ref.current);
    const visibility = () => {
      if (document.hidden) setVisible(false);
      else if (ref.current) {
        const r = ref.current.getBoundingClientRect();
        setVisible(r.bottom > 0 && r.top < innerHeight);
      }
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  const objects = [
    ...lots.map((lot) => ({
      depth: lot.u + lot.v + lot.w + lot.d,
      kind: "building",
      ...lot,
    })),
    ...trees.map(([u, v]) => ({ depth: u + v, kind: "tree", u, v })),
  ].sort((a, b) => a.depth - b.depth);
  return (
    <div
      ref={ref}
      className={`city-art city-theme-${theme || "trenches"}${paused || !visible ? " traffic-paused" : ""}`}
      style={
        palette
          ? {
              "--city-one": palette[0],
              "--city-two": palette[2],
              "--city-three": palette[4],
              "--city-roof": palette[6],
            }
          : undefined
      }
    >
      <svg
        className="city-drawing"
        viewBox="0 0 600 400"
        role="img"
        aria-label="An isometric neighborhood with buildings on city blocks, sidewalks, a basketball court, and cars following the streets"
      >
        <defs>
          <pattern
            id={`${id}-grain`}
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1" cy="2" r=".45" fill="#d1dec5" opacity=".1" />
          </pattern>
        </defs>
        <polygon
          points={polygon([
            project(0, 0),
            project(420, 0),
            project(420, 420),
            project(0, 420),
          ])}
          fill="#465348"
        />
        <polygon
          points={polygon([
            project(0, 420),
            project(420, 420),
            project(420, 420, -9),
            project(0, 420, -9),
          ])}
          fill="#29362c"
        />
        <polygon
          points={polygon([
            project(420, 0),
            project(420, 420),
            project(420, 420, -9),
            project(420, 0, -9),
          ])}
          fill="#202d26"
        />
        <g transform="matrix(.63 .315 -.63 .315 300 92)">
          <rect width="420" height="420" fill={`url(#${id}-grain)`} />
          {[140, 280].map((n) => (
            <g key={n}>
              <path
                d={`M0 ${n}H420M${n} 0V420`}
                stroke="#91a18a"
                strokeWidth="38"
              />
              <path
                d={`M0 ${n}H420M${n} 0V420`}
                stroke="#25322c"
                strokeWidth="26"
              />
              <path
                d={`M0 ${n}H420M${n} 0V420`}
                stroke="#71816b"
                strokeWidth="1.5"
                strokeDasharray="9 11"
              />
            </g>
          ))}
          <rect x="170" y="314" width="80" height="78" fill="#759272" />
          <path
            d="M174 318h72v70h-72ZM174 353h72"
            fill="none"
            stroke="#e9dfbb"
            strokeWidth="2"
          />
          <circle
            cx="210"
            cy="353"
            r="10"
            fill="none"
            stroke="#e9dfbb"
            strokeWidth="2"
          />
          {[140, 280].map((n) => (
            <g
              key={`cross-${n}`}
              stroke="#b6c5b7"
              strokeWidth="3"
              opacity=".75"
            >
              {[129, 136, 143, 150].map((x) => (
                <path key={x} d={`M${x} ${n - 25}v12M${n + 21} ${x}h12`} />
              ))}
            </g>
          ))}
          <Car
            from={[8, 134]}
            to={[412, 134]}
            rest={[70, 134]}
            duration={20}
            delay={-6}
            color="#dfb770"
          />
          <Car
            from={[412, 286]}
            to={[8, 286]}
            rest={[350, 286]}
            duration={24}
            delay={-15}
            color="#bda6cc"
            reverse
          />
          <Car
            from={[274, 8]}
            to={[274, 412]}
            rest={[274, 220]}
            duration={26}
            delay={-12}
            color="#a9ad84"
            vertical
          />
        </g>
        {objects.map((object, i) =>
          object.kind === "building" ? (
            <Building key={i} {...object} />
          ) : (
            <Tree key={i} {...object} />
          ),
        )}
      </svg>
      <button
        className="city-traffic-toggle"
        onClick={() => setPaused((p) => !p)}
        aria-label={paused ? "Resume city traffic" : "Pause city traffic"}
      >
        {paused ? <Play size={12} /> : <Pause size={12} />}
        <span>{paused ? "Resume traffic" : "Pause traffic"}</span>
      </button>
    </div>
  );
}
