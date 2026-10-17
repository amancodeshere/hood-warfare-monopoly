import React, { useEffect, useId, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { CITY_SCENES } from "../shared/city-scenes.js";

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
function Building({ u, v, w, d, h, label, tone, theme, elevation = 0 }) {
  const height = theme === "trenches" ? Math.min(h, 58)
    : theme === "night-shift" ? Math.min(h, 72)
    : theme === "boardwalk" ? Math.min(h + 18, 126)
    : theme === "snow-day" ? Math.min(h, 76)
    : theme === "neon" ? Math.min(h, 48)
    : theme === "festival" ? Math.min(h + Math.floor((420 - v) / 45) * 3, 82) : h;
  const a = project(u, v, elevation),
    b = project(u + w, v, elevation),
    c = project(u + w, v + d, elevation),
    e = project(u, v + d, elevation);
  const roof = [a, b, c, e].map(([x, y]) => [x, y - height]);
  const color = `var(--city-${["one", "two", "three"][tone]}, ${["#a6957c", "#85978e", "#94a9a4"][tone]})`;
  const floors = Math.max(1, Math.floor((height - 8) / 17));
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
      {theme === "snow-day" && <g transform={`translate(${project(u + w / 2, v + d / 2, height + elevation).join(" ")})`}>
        <path d="M-19 0L0-12 19 0 15 3 0-6-15 3Z" fill="#a94d3e" stroke="#5d4337" strokeWidth="1" />
        <path d="M0-11v-7h4v9" fill="#754e42" />
      </g>}
      {theme === "boardwalk" && <g transform={`translate(${project(u + w / 2, v + d / 2, height + elevation).join(" ")})`}>
        <path d="M-16 1q16-16 32 0M-19 2h38" fill="none" stroke="#b8473c" strokeWidth="2.4" />
        <path d="M-12 3h24" stroke="#e1c17a" strokeWidth="1.3" />
      </g>}
      {(theme === "night-shift" || theme === "festival") && <g transform={`translate(${project(u + w / 2, v + d / 2, height + elevation).join(" ")})`}>
        <ellipse cx="0" cy="-3" rx="7" ry="3" fill="#6b7770" stroke="#344039" strokeWidth="1" />
        <path d="M-7-3v8q7 4 14 0v-8" fill="#829087" stroke="#344039" strokeWidth="1" />
        <ellipse cx="0" cy="5" rx="7" ry="2.5" fill="#69776c" stroke="#344039" strokeWidth="1" />
      </g>}
      {theme === "neon" && <g transform={`translate(${project(u + w / 2, v + d / 2, height + elevation).join(" ")})`}>
        <path d="M-15 0h30M-11-3h22" stroke="#e7c57b" strokeWidth="2" />
        <path d="M-13-4v6m6-8v8m6-8v8m6-6v6" stroke="#4e9076" strokeWidth="1.5" />
      </g>}
      <polygon
        points={polygon([
          project(u + 4, v + 4, height + elevation + 1),
          project(u + w - 4, v + 4, height + elevation + 1),
          project(u + w - 4, v + d - 4, height + elevation + 1),
          project(u + 4, v + d - 4, height + elevation + 1),
        ])}
        fill={color}
        opacity=".35"
      />
      {Array.from({ length: floors }, (_, floor) =>
        Array.from({ length: Math.max(1, Math.floor(w / 15)) }, (_, col) => {
          const x = u + 8 + col * 15,
            level = 12 + floor * 17 + elevation;
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
          transform={`translate(${project(u + w / 2, v + d, 12 + elevation).join(" ")}) rotate(26.565)`}
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
function RegionalDetails({ theme }) {
  if (theme === "custom") return null;
  const point = (u, v) => project(u, v);
  if (theme === "night-shift") {
    const cowFrom = point(170, 277);
    const cowTo = point(232, 277);
    const cowRest = point(201, 277);
    const [rx, ry] = point(115, 140);
    const [tx, ty] = point(285, 142);
    return <g className="city-details city-details-india" aria-hidden="true">
      <g className="city-car city-cow" style={{
        "--car-from": `translate(${cowFrom[0]}px, ${cowFrom[1]}px)`,
        "--car-to": `translate(${cowTo[0]}px, ${cowTo[1]}px)`,
        "--car-rest": `translate(${cowRest[0]}px, ${cowRest[1]}px)`,
        "--car-duration": "28s",
        "--car-delay": "-11s",
      }}>
        <ellipse cx="0" cy="0" rx="15" ry="7" fill="#eee0c1" stroke="#6a5541" strokeWidth="1.5" />
        <ellipse cx="11" cy="-3" rx="5" ry="5" fill="#f2e6ce" stroke="#6a5541" strokeWidth="1.4" />
        <path d="M13-7l2-3 2 3m-7-1-2-2-2 3M-9 5v7m5-7v7m8-7v7m5-7v7M-15 0l-4-4" fill="none" stroke="#6a5541" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M9-2h2" stroke="#8c5649" strokeWidth="2" />
      </g>
      <g transform={`translate(${rx} ${ry})`}>
        <path d="M-14-4l14-10 14 10v11h-28Z" fill="#d7a05d" stroke="#684638" strokeWidth="1.5" />
        <path d="M-17-4H17M-11-3v10m7-10v10m8-10v10m7-10v10" stroke="#f2d88e" strokeWidth="2" />
        <text x="0" y="4" textAnchor="middle" fontSize="4" fontWeight="800" fill="#443329">CHAI</text>
      </g>
      <g transform={`translate(${tx} ${ty})`}>
        <path d="M-12 2h24l-3-10h-13z" fill="#d8a744" stroke="#493d2f" strokeWidth="1.5" />
        <path d="M-6-8q2-9 9-7l4 7" fill="#407a62" stroke="#493d2f" strokeWidth="1.5" />
        <circle cx="-7" cy="4" r="3" fill="#28322d" /><circle cx="8" cy="4" r="3" fill="#28322d" />
        <circle cx="16" cy="-2" r="2" fill="#28322d" /><path d="M12-3l5-4" stroke="#493d2f" strokeWidth="1.4" />
      </g>
    </g>;
  }
  if (theme === "boardwalk") {
    const [x, y] = point(111, 143);
    const [sx, sy] = point(280, 290);
    return <g className="city-details city-details-china" aria-hidden="true">
      <path d={`M${x-22} ${y-12}l45 22`} stroke="#ddd0a4" strokeWidth="1" />
      {[-16, -7, 3, 13].map((n, i) => <g key={n} transform={`translate(${x+n} ${y + n*.5})`}>
        <path d="M0 0v8" stroke="#ddd0a4" strokeWidth=".8" />
        <path d="M-2 1h5v4h-5z" fill={["#c94e45", "#729b87", "#d5a84b", "#8c6b9d"][i]} />
      </g>)}
      <g transform={`translate(${x+39} ${y+36})`}>
        <path d="M-15-2Q0-15 15-2Z" fill="#b8473c" /><path d="M-17-2h34" stroke="#f1cf80" strokeWidth="2" />
        <rect x="-13" y="-2" width="26" height="10" fill="#e6c681" /><path d="M-7 0v8m7-8v8m7-8v8" stroke="#725346" strokeWidth="1" />
        <text x="0" y="6" textAnchor="middle" fontSize="4" fontWeight="800" fill="#49352c">NOODLES</text>
      </g>
      <g transform={`translate(${sx} ${sy})`}>
        <circle cx="-9" cy="3" r="4" fill="#27332d" /><circle cx="9" cy="3" r="4" fill="#27332d" />
        <path d="M-12 0h15l5-5h6l4 7H-7z" fill="#cb594b" stroke="#49352f" strokeWidth="1.4" />
        <path d="M4-5l3-6h5l3 6" fill="none" stroke="#49352f" strokeWidth="1.5" />
        <path d="M-1-4h7v4h-7z" fill="#e7cf94" />
      </g>
    </g>;
  }
  if (theme === "snow-day") {
    const [x, y] = point(267, 138);
    return <g className="city-details city-details-europe" aria-hidden="true">
      <path d={`M${x-48} ${y}h95m-95 5h95`} stroke="#aa9b78" strokeWidth="1.3" />
      <g transform={`translate(${x} ${y-8})`}>
        <rect x="-25" y="-9" width="50" height="12" rx="2" fill="#315e69" stroke="#192b30" strokeWidth="1.5" />
        <rect x="-17" y="-7" width="8" height="5" fill="#cfe2cb" /><rect x="-5" y="-7" width="8" height="5" fill="#cfe2cb" /><rect x="7" y="-7" width="8" height="5" fill="#cfe2cb" />
        <circle cx="-15" cy="5" r="3" fill="#253137" /><circle cx="15" cy="5" r="3" fill="#253137" />
      </g>
      <path d={`M${x-10} ${y+25}h20v13h-20z`} fill="#222d31" /><path d={`M${x-6} ${y+29}h12`} stroke="#d0be8e" strokeWidth="1.3" />
      <g transform={`translate(${x+39} ${y+26})`}>
        <path d="M-9 0h18l-3-7H-6z" fill="#b45e47" />
        <path d="M-8 0v8m16-8v8" stroke="#514b40" strokeWidth="1.4" />
        <path d="M-12 9h24" stroke="#514b40" strokeWidth="1.8" />
        <circle cx="-4" cy="10" r="2" fill="#d9c28c" /><circle cx="4" cy="10" r="2" fill="#d9c28c" />
      </g>
    </g>;
  }
  if (theme === "neon") {
    const [x, y] = point(110, 144);
    const [lx, ly] = point(283, 292);
    return <g className="city-details city-details-mexico" aria-hidden="true">
      <path d={`M${x-22} ${y-3}l22-13 22 13v4h-44z`} fill="#d35a4c" />
      <path d={`M${x-19} ${y+1}h38v11h-38z`} fill="#e7b86f" />
      <path d={`M${x-10} ${y+1}v11m20-11v11`} stroke="#498675" strokeWidth="2" />
      <path d={`M${x-25} ${y-3}h50`} stroke="#f1d780" strokeWidth="2" />
      <path d={`M${x-8} ${y-5}q8-8 16 0`} fill="none" stroke="#579373" strokeWidth="2" />
      <g transform={`translate(${x+40} ${y+12})`}>
        <rect x="-9" y="-8" width="18" height="12" fill="#c85b4c" stroke="#744b3d" strokeWidth="1" />
        <path d="M-8-7h16M-8 3h16" stroke="#f1cf80" strokeWidth="1.4" />
        <circle cx="-4" cy="-2" r="2" fill="#74a17e" /><circle cx="3" cy="-3" r="2.4" fill="#e3bf5f" />
        <path d="M-5-1l-2 3m9-3 2 3" stroke="#f0d8a5" strokeWidth="1.4" />
      </g>
      <g transform={`translate(${lx} ${ly})`}>
        <ellipse cx="-10" cy="4" rx="5" ry="4" fill="#1f2928" /><ellipse cx="12" cy="4" rx="5" ry="4" fill="#1f2928" />
        <path d="M-17 1l3-6h20l7 4 5 2v4h-35z" fill="#d95348" stroke="#533c37" strokeWidth="1.4" />
        <path d="M-10-5l4-6h9l4 6" fill="#d6ac60" stroke="#533c37" strokeWidth="1.3" />
        <path d="M-4-10h6" stroke="#b5dad3" strokeWidth="2" />
      </g>
    </g>;
  }
  if (theme === "festival") {
    const [x, y] = point(264, 142);
    const [mx, my] = point(115, 287);
    return <g className="city-details city-details-brazil" aria-hidden="true">
      <g transform={`translate(${x} ${y})`}>
        <ellipse cx="0" cy="-4" rx="12" ry="5" fill="#485c42" stroke="#26382c" strokeWidth="1.5" />
        <rect x="-12" y="-4" width="24" height="6" fill="#566b48" /><path d="M-11-5v-5m22 5v-5" stroke="#26382c" strokeWidth="1.4" />
        <path d="M-3-9v-5h6v5" fill="#749d73" stroke="#26382c" strokeWidth="1" />
      </g>
      <g transform={`translate(${x+48} ${y+36})`}>
        <path d="M-18 0h36v12h-36z" fill="#72a264" stroke="#304935" strokeWidth="1" />
        <path d="M0 0v12m-18-6h36" stroke="#e9e1bd" strokeWidth="1" />
        <circle cx="0" cy="6" r="3" fill="none" stroke="#e9e1bd" strokeWidth=".8" />
      </g>
      <g transform={`translate(${mx} ${my})`}>
        <circle cx="-11" cy="4" r="4" fill="#26332c" /><circle cx="11" cy="4" r="4" fill="#26332c" />
        <path d="M-14 0h23l5-7h5l4 8h-3v4h-34z" fill="#df994e" stroke="#493e34" strokeWidth="1.4" />
        <path d="M-5 0v-6h10v6m7-7v-4h4" fill="none" stroke="#493e34" strokeWidth="1.4" />
        <path d="M-4-5h8" stroke="#cfe2b2" strokeWidth="2" />
      </g>
    </g>;
  }
  return <g className="city-details city-details-america" aria-hidden="true">
    {[[48, 132], [352, 275], [150, 378]].map(([u,v]) => {
      const [x,y] = point(u,v);
      return <g key={`${u}-${v}`} transform={`translate(${x} ${y})`}>
        <path d="M-11 0h22v9h-22z" fill="#b29272" /><path d="M-13-1l13-9 13 9" fill="#614b3d" />
        <path d="M-7 4h5v5h-5zm10 0h5v5H3z" fill="#dfc98f" />
      </g>;
    })}
  </g>;
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
export default function City({ palette, theme = "trenches", scale = 1, style }) {
  const scene = CITY_SCENES[theme];
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
    ...(scene?.lots || lots).map((lot) => ({
      depth: lot.u + lot.v + lot.w + lot.d,
      kind: "building",
      ...lot,
    })),
    ...(scene?.trees || trees).map(([u, v]) => ({ depth: u + v, kind: "tree", u, v })),
  ].sort((a, b) => a.depth - b.depth);
  return (
    <div
      ref={ref}
      className={`city-art city-theme-${theme || "custom"}${paused || !visible ? " traffic-paused" : ""}`}
      data-scale={scale}
      data-scene={theme}
      data-building-count={scene?.lots.length || lots.length}
      style={{
        ...((scene?.colors || palette)
          ? {
              "--city-one": (scene ? scene.colors[0] : palette[0]),
              "--city-two": (scene ? scene.colors[1] : palette[2]),
              "--city-three": (scene ? scene.colors[2] : palette[4]),
              "--city-roof": (scene ? scene.colors[3] : palette[6]),
            }
          : {}),
        "--city-scale": scale,
        ...(scale !== 1
          ? { transform: `scale(${scale})`, transformOrigin: "center center" }
          : {}),
        ...style,
      }}
    >
      <svg
        className="city-drawing"
        viewBox="0 0 600 400"
        role="img"
        aria-label={theme === "custom"
          ? "A custom neighborhood with buildings, sidewalks, a court, and moving traffic"
          : theme === "night-shift"
          ? "India neighborhood with market stalls, a rickshaw lane, a cow crossing, and moving traffic"
          : theme === "boardwalk"
            ? "China neighborhood with crowded alley blocks, hanging laundry, a noodle stall, scooters, and traffic"
              : theme === "snow-day"
              ? "European neighborhood with brick estate homes, tram rails, an underpass, and a courtyard pitch"
              : theme === "neon"
                ? "Mexican barrio with colorful homes, a tiendita, painted mural wall, and a lowrider"
                : theme === "festival"
                  ? "Brazilian hillside neighborhood with homes, rooftop water tanks, a football court, and traffic"
                  : "American neighborhood with brownstone stoops, a corner deli, a basketball court, and traffic"}
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
          fill={theme === "night-shift" ? "#876a4b" : theme === "boardwalk" ? "#48524b" : theme === "snow-day" ? "#66655e" : theme === "neon" ? "#80604b" : theme === "festival" ? "#66815a" : "#465348"}
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
                stroke={theme === "night-shift" ? "#c49e65" : theme === "boardwalk" ? "#89928b" : theme === "snow-day" ? "#aaa396" : theme === "neon" ? "#ce956b" : theme === "festival" ? "#95a877" : "#91a18a"}
                strokeWidth="38"
              />
              <path
                d={`M0 ${n}H420M${n} 0V420`}
                stroke={theme === "snow-day" ? "#333a3b" : "#25322c"}
                strokeWidth="26"
              />
              <path
                d={`M0 ${n}H420M${n} 0V420`}
                stroke={theme === "night-shift" ? "#947b50" : theme === "snow-day" ? "#8d8879" : "#71816b"}
                strokeWidth="1.5"
                strokeDasharray="9 11"
              />
            </g>
          ))}
          <rect x="170" y="314" width="80" height="78" fill={theme === "festival" ? "#56844f" : "#759272"} />
          <path
            d={theme === "festival" ? "M174 318h72v70h-72ZM210 318v70M174 353h72" : "M174 318h72v70h-72ZM174 353h72"}
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
        <RegionalDetails theme={theme} />
        {objects.map((object, i) =>
          object.kind === "building" ? (
            <Building key={i} {...object} theme={theme} />
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
