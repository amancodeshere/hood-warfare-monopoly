import React from "react";
export function HoodFigure({
  color = "#c6ed72",
  variant = 0,
  className = "",
  label,
  armed = false,
  stretch = false,
}) {
  return (
    <svg
      className={"hood-figure " + className}
      viewBox="0 0 100 220"
      preserveAspectRatio={stretch ? "none" : "xMidYMid meet"}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <ellipse cx="50" cy="210" rx="38" ry="7" fill="#101814" opacity=".45" />
      <path
        d="M30 138L29 198 45 199 51 153 57 199 74 198 70 138Z"
        fill="#26342c"
        stroke="#101814"
        strokeWidth="4"
      />
      <path
        d="M25 194H45L47 208H19Q17 197 25 194M57 194H77L84 206Q69 212 56 207Z"
        fill="#ece8d8"
        stroke="#101814"
        strokeWidth="4"
      />
      <path
        d="M27 73Q50 61 73 73L86 103 75 145H25L14 103Z"
        fill={color}
        stroke="#101814"
        strokeWidth="4"
      />
      <path
        d="M32 73L23 104 31 120M68 73L78 104 69 123"
        fill="none"
        stroke="#101814"
        strokeWidth="5"
      />
      <path
        d="M28 47Q24 11 50 8Q80 10 73 48L67 73H33Z"
        fill={color}
        stroke="#101814"
        strokeWidth="4"
      />
      <path
        d="M33 34Q49 15 68 34L65 57Q50 71 36 57Z"
        fill="#a67857"
        stroke="#101814"
        strokeWidth="3"
      />
      <path d="M35 40H64L63 49H53L50 43 47 49H36Z" fill="#101814" />
      {variant % 2 === 0 ? (
        <path
          d="M34 52H66L61 66H40Z"
          fill={color}
          stroke="#101814"
          strokeWidth="2"
        />
      ) : (
        <path
          d="M43 57Q51 61 58 56"
          fill="none"
          stroke="#101814"
          strokeWidth="3"
        />
      )}
      {variant % 3 === 1 && (
        <path
          d="M23 29Q49 0 77 29L72 36H28Z"
          fill="#ece8d8"
          stroke="#101814"
          strokeWidth="4"
        />
      )}
      <path
        d="M37 74L42 95H58L64 74"
        fill="none"
        stroke="#e2c76e"
        strokeWidth="5"
      />
      <path
        d="M46 94H55V105H46Z"
        fill="#e2c76e"
        stroke="#101814"
        strokeWidth="2"
      />
      <path d="M26 132H43M58 132H74" stroke="#101814" strokeWidth="4" />
      {armed && (
        <g transform="translate(23 104)">
          <path
            d="M0 0H55V12H39L33 32H21L18 12H0Z"
            fill="#36443a"
            stroke="#101814"
            strokeWidth="4"
          />
          <path d="M1 3H54" stroke="#d9c784" strokeWidth="4" />
        </g>
      )}
    </svg>
  );
}
export function StreetBuilding({ hotel = false }) {
  return (
    <svg
      className={hotel ? "street-hotel" : "street-house"}
      viewBox="0 0 30 32"
      aria-hidden="true"
    >
      {hotel ? (
        <>
          <path
            d="M5 5H24V29H5Z"
            fill="#d9c784"
            stroke="#263326"
            strokeWidth="2"
          />
          <path
            d="M2 3H27V8H2Z"
            fill="#a67857"
            stroke="#263326"
            strokeWidth="2"
          />
          <path d="M10 29V22H18V29" fill="#263326" />
          {[11, 17].map((y) =>
            [9, 17].map((x) => (
              <rect
                key={x + ":" + y}
                x={x}
                y={y}
                width="4"
                height="4"
                fill="#263326"
              />
            )),
          )}
          <path d="M9 0V3M21 0V3" stroke="#263326" strokeWidth="2" />
        </>
      ) : (
        <>
          <path
            d="M5 14H25V29H5Z"
            fill="#86bfa4"
            stroke="#263326"
            strokeWidth="2"
          />
          <path
            d="M2 14L15 3 28 14Z"
            fill="#354630"
            stroke="#263326"
            strokeWidth="2"
          />
          <path
            d="M19 6V2H23V10"
            fill="#a67857"
            stroke="#263326"
            strokeWidth="2"
          />
          <path d="M13 29V20H19V29" fill="#263326" />
          <rect x="8" y="17" width="4" height="5" fill="#ece8d8" />
        </>
      )}
    </svg>
  );
}
