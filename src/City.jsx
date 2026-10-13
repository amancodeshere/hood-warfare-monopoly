import React from "react";
function Building({
  x,
  y,
  w = 40,
  d = 26,
  h = 60,
  color = "#8da89a",
  roof = "#b6c5b7",
  label,
  windows = true,
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path
        d={`M0 0L${w} ${-w * 0.5}L${w + d} ${(-w + d) * 0.5}L${d} ${d * 0.5}Z`}
        fill="#111917"
        opacity=".5"
        transform="translate(13 10)"
      />
      <path d={`M0 ${-h}L${d} ${d * 0.5 - h}V${d * 0.5}L0 0Z`} fill={color} />
      <path
        d={`M${d} ${d * 0.5 - h}L${w + d} ${(-w + d) * 0.5 - h}V${(-w + d) * 0.5}L${d} ${d * 0.5}Z`}
        fill={color}
        style={{ filter: "brightness(.65)" }}
      />
      <path
        d={`M0 ${-h}L${w} ${-w * 0.5 - h}L${w + d} ${(-w + d) * 0.5 - h}L${d} ${d * 0.5 - h}Z`}
        fill={roof}
      />
      <path
        d={`M5 ${-h}L${w} ${-w * 0.5 - h + 3}L${w + d - 5} ${(-w + d) * 0.5 - h}L${d} ${d * 0.5 - h - 3}Z`}
        fill={color}
        opacity=".3"
      />
      {windows &&
        Array.from({ length: Math.floor(h / 16) }, (_, i) => (
          <g key={i} opacity=".8">
            {[0, 1, 2].map((j) => (
              <path
                key={j}
                d={`M${d + 7 + j * 10} ${d * 0.5 - h + 11 + i * 16 - j * 5}l5 -2.5v7l-5 2.5Z`}
                fill={(i + j) % 3 === 0 ? "#e7d592" : "#31443b"}
              />
            ))}
          </g>
        ))}
      {label && (
        <g transform={`translate(${d + 3} ${d * 0.5 - 20}) rotate(-26.5)`}>
          <rect width={w - 6} height="13" fill="#d9c784" />
          <text
            x={(w - 6) / 2}
            y="9"
            textAnchor="middle"
            fill="#222c25"
            fontSize="7"
            fontWeight="800"
          >
            {label}
          </text>
        </g>
      )}
    </g>
  );
}
function Tree({ x, y }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="4" cy="4" rx="13" ry="6" fill="#101b15" opacity=".4" />
      <path d="M0 0v-18" stroke="#756c51" strokeWidth="4" />
      <path d="M-12-13L0-40l13 27Z" fill="#64815c" />
      <path d="M-9-23L0-45l10 22Z" fill="#81966a" />
    </g>
  );
}
export default function City() {
  return (
    <svg
      className="city-art"
      viewBox="0 0 600 400"
      role="img"
      aria-label="An original isometric city with storefronts, towers, a basketball court, and tree-lined streets"
    >
      <defs>
        <pattern
          id="city-grain"
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="1" cy="2" r=".45" fill="#d1dec5" opacity=".1" />
        </pattern>
      </defs>
      <path d="M35 235L305 100L568 231L298 367Z" fill="#465348" />
      <path d="M35 235L298 367V377L35 245Z" fill="#29362c" />
      <path d="M298 367L568 231V241L298 377Z" fill="#202d26" />
      <path d="M35 235L305 100L568 231L298 367Z" fill="url(#city-grain)" />
      <path
        d="M84 259L354 125M190 313L462 178M148 179L410 311M250 128L511 259"
        stroke="#25322c"
        strokeWidth="28"
      />
      <path
        d="M84 259L354 125M190 313L462 178M148 179L410 311M250 128L511 259"
        stroke="#71816b"
        strokeWidth="1.5"
        strokeDasharray="8 12"
      />
      <path
        d="M83 247L353 113M178 315L450 179M137 188L397 319M259 119L519 251"
        stroke="#91a18a"
        strokeWidth="2"
        opacity=".5"
      />
      <g>
        <path d="M230 280l67-33 57 28-67 34Z" fill="#759272" />
        <path d="M241 279l54-27 47 23-54 27Z" fill="#aab78e" />
        <path
          d="M268 264l46 23M243 279l54-27 47 23-54 27Z"
          fill="none"
          stroke="#e9dfbb"
          strokeWidth="1.2"
        />
        <ellipse
          cx="292"
          cy="278"
          rx="9"
          ry="4.5"
          fill="none"
          stroke="#e9dfbb"
          strokeWidth="1.2"
        />
        <path
          d="M247 278v-17m-6 0h12m73 16v-18m-6 0h12"
          fill="none"
          stroke="#ddd6b5"
          strokeWidth="2"
        />
      </g>
      <Building
        x={193}
        y={157}
        w={40}
        d={25}
        h={68}
        color="#929b7d"
        roof="#b5b996"
      />
      <Building
        x={234}
        y={136}
        w={35}
        d={24}
        h={104}
        color="#85978e"
        roof="#abb7a0"
      />
      <Building
        x={293}
        y={168}
        w={42}
        d={34}
        h={128}
        color="#94a9a4"
        roof="#bac5b7"
      />
      <Building
        x={342}
        y={190}
        w={40}
        d={25}
        h={86}
        color="#8c918e"
        roof="#b5b5a3"
      />
      <Building
        x={396}
        y={162}
        w={31}
        d={24}
        h={71}
        color="#b49b8a"
        roof="#d2bca0"
      />
      <Building
        x={91}
        y={239}
        w={42}
        d={28}
        h={45}
        color="#a9ad84"
        roof="#c5c5a0"
        label="DELI"
      />
      <Building
        x={139}
        y={215}
        w={37}
        d={27}
        h={62}
        color="#b59d8c"
        roof="#cdb5a1"
      />
      <Building
        x={223}
        y={237}
        w={42}
        d={28}
        h={45}
        color="#9baa92"
        roof="#b3c0a6"
        label="808"
      />
      <Building
        x={270}
        y={213}
        w={34}
        d={24}
        h={72}
        color="#b0a498"
        roof="#cebfad"
      />
      <Building
        x={408}
        y={247}
        w={41}
        d={28}
        h={51}
        color="#a89e8e"
        roof="#c7b99f"
        label="ARCADE"
      />
      <Building
        x={455}
        y={224}
        w={36}
        d={22}
        h={75}
        color="#92a498"
        roof="#bac6ac"
      />
      <Building
        x={139}
        y={287}
        w={43}
        d={31}
        h={45}
        color="#a6957c"
        roof="#bdb296"
        label="GROVE"
      />
      <Building
        x={349}
        y={324}
        w={45}
        d={29}
        h={58}
        color="#9ca58a"
        roof="#bec4a6"
      />
      <Building
        x={400}
        y={299}
        w={30}
        d={22}
        h={79}
        color="#b2a5a0"
        roof="#cec0b1"
      />
      {[
        { x: 59, y: 232 },
        { x: 76, y: 224 },
        { x: 184, y: 263 },
        { x: 210, y: 249 },
        { x: 313, y: 334 },
        { x: 336, y: 322 },
        { x: 491, y: 257 },
        { x: 511, y: 247 },
        { x: 362, y: 223 },
        { x: 382, y: 212 },
      ].map((p, i) => (
        <Tree key={i} {...p} />
      ))}
      <g transform="translate(350 145)">
        <path d="M0 0l18-9 8 4-18 9Z" fill="#dfb770" />
        <path d="M0 0v6l8 4V4Z" fill="#9d7d4b" />
        <path d="M8 4l18-9v6l-18 9Z" fill="#bf975a" />
        <path d="M5-2l9-4 4 2-9 4Z" fill="#364d45" />
      </g>
      <g transform="translate(171 299)">
        <path d="M0 0l14-7 8 4-14 7Z" fill="#bda6cc" />
        <path d="M0 0v5l8 4V4Z" fill="#8b7497" />
        <path d="M8 4l14-7v5l-14 7Z" fill="#a589b0" />
      </g>
      <path
        d="M114 252v-28m-4 0h10m307 48v-32m-4 0h10m-89-139V80m-4 0h10"
        stroke="#bbb79b"
        strokeWidth="2"
      />
      <circle cx="116" cy="224" r="3" fill="#eddda1" />
      <circle cx="429" cy="240" r="3" fill="#eddda1" />
    </svg>
  );
}
