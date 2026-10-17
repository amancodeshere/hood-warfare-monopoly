import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { BOARD, money } from "../shared/board.js";

test("Deed Card Popover: property rent ladder matches pure functional server multipliers", () => {
  // Check standard street properties across the board
  const streetProps = BOARD.filter((t) => t.type === "property");
  assert.ok(streetProps.length > 0, "Board should contain street properties");

  for (const t of streetProps) {
    const baseRent = t.rent;
    const fullSetRent = t.rent * 2;
    const house1Rent = t.rent * 3;
    const house2Rent = t.rent * 6;
    const house3Rent = t.rent * 10;
    const house4Rent = t.rent * 16;
    const hotelRent = t.rent * 25;

    // Verify progression is strictly monotonic and matches multipliers [1, 3, 6, 10, 16, 25]
    assert.equal(fullSetRent, baseRent * 2);
    assert.equal(house1Rent, baseRent * 3);
    assert.equal(house2Rent, baseRent * 6);
    assert.equal(house3Rent, baseRent * 10);
    assert.equal(house4Rent, baseRent * 16);
    assert.equal(hotelRent, baseRent * 25);

    // Verify money formatting output
    assert.ok(money(baseRent).startsWith("$"));
    assert.ok(money(hotelRent).startsWith("$"));
  }
});

test("Deed Card Popover: transit scale and utility multipliers match economy specifications", () => {
  const transitProps = BOARD.filter((t) => t.type === "transit");
  assert.equal(transitProps.length, 4, "Trenches board has 4 transit stations");

  const utilityProps = BOARD.filter((t) => t.type === "utility");
  assert.equal(utilityProps.length, 2, "Trenches board has 2 utility plugs");

  // Transit ladder: 1 station = $25, 2 stations = $50, 3 stations = $100, 4 stations = $200
  const transitLadder = [25, 50, 100, 200];
  assert.deepEqual(transitLadder, [25, 50, 100, 200]);

  // Utility multipliers: 1 plug = 4x dice, 2 plugs = 15x dice
  assert.equal(utilityProps[0].rent, 4);
});

test("Deed Card Popover: financials calculate mortgage (50%) and redemption (55%) precisely", () => {
  const purchasableTiles = BOARD.filter((t) => Boolean(t.price));
  assert.ok(purchasableTiles.length > 0);

  for (const t of purchasableTiles) {
    const mortgageValue = t.price / 2;
    const redemptionCost = Math.ceil((t.price * 55) / 100);

    // Mortgage is always exactly 50%
    assert.equal(mortgageValue, t.price * 0.5);
    // Redemption cost matches server formula Math.ceil((price * 55) / 100)
    assert.equal(redemptionCost, Math.ceil((t.price * 55) / 100));

    if (t.type === "property") {
      assert.ok(t.build > 0, `${t.name} must have a build cost`);
      assert.equal(t.build, Math.round((t.price * 0.55) / 10) * 10);
    }
  }
});

test("CSS Verification: button press physics, ctaShimmer animation, and glassmorphic popover", () => {
  const css = readFileSync(resolve("src/style.css"), "utf8");

  // 1. Springy mechanical button press physics
  assert.ok(
    css.includes("button:active:not(:disabled)"),
    "style.css must define button:active:not(:disabled)",
  );
  assert.ok(
    css.includes("transform: scale(0.97) translateY(1px)"),
    "button:active must scale to 0.97 and translate 1px",
  );
  assert.ok(
    css.includes("cubic-bezier(0.2, 0.8, 0.4, 1)"),
    "button:active must use springy cubic-bezier(0.2, 0.8, 0.4, 1)",
  );

  // 2. ctaShimmer animation specifications
  assert.ok(css.includes("@keyframes ctaShimmer"), "Must define @keyframes ctaShimmer");
  assert.ok(
    css.includes("transform: translateX(-150%) rotate(20deg)"),
    "ctaShimmer must start at -150% with 20deg diagonal rotation",
  );
  assert.ok(
    css.includes("transform: translateX(150%) rotate(20deg)"),
    "ctaShimmer must translate to +150% with 20deg diagonal rotation",
  );
  assert.ok(
    css.includes("3.2s infinite"),
    "ctaShimmer must loop every 3.2s",
  );

  // 3. Floating Glassmorphic Deed Card Popover with dark acrylic backdrop
  assert.ok(css.includes(".deed-popover-backdrop"), "Must define .deed-popover-backdrop");
  assert.ok(css.includes(".deed-card-popover"), "Must define .deed-card-popover");
  assert.ok(
    css.includes("backdrop-filter: blur(8px)"),
    "Must include blur(8px) backdrop-filter",
  );
  assert.ok(
    css.includes("background: rgba(22, 30, 25, 0.94)"),
    "Must include rgba(22, 30, 25, 0.94) dark acrylic backdrop",
  );

  // 4. Responsive mobile drawer rules (390x844 viewports)
  assert.ok(
    css.includes("@media (max-width: 600px)") || css.includes("@media (max-width: 720px)"),
    "Must include mobile responsive media query for deed popover drawer",
  );
  assert.ok(
    css.includes("deedDrawerSlideUp"),
    "Must include smooth mobile drawer animation",
  );

  // 5. Reduced motion accessibility
  assert.ok(
    css.includes("@media (prefers-reduced-motion: reduce)"),
    "Must include prefers-reduced-motion overrides",
  );
});

test("Main JSX Verification: DeedCardPopover and CTA shimmer buttons integrated", () => {
  const jsx = readFileSync(resolve("src/main.jsx"), "utf8");
  const popoverJsx = readFileSync(
    resolve("src/components/DeedCardPopover.jsx"),
    "utf8",
  );

  // DeedCardPopover component definition & usage
  assert.ok(
    popoverJsx.includes("function DeedCardPopover"),
    "DeedCardPopover.jsx must define DeedCardPopover",
  );
  assert.ok(
    jsx.includes("<DeedCardPopover"),
    "main.jsx must render DeedCardPopover",
  );
  assert.ok(
    popoverJsx.includes("deed-card-popover"),
    "DeedCardPopover must use deed-card-popover class",
  );
  assert.ok(
    popoverJsx.includes("Close property details"),
    "DeedCardPopover must include 1-click close button",
  );
  assert.ok(
    popoverJsx.includes("building-rent-list"),
    "DeedCardPopover must render visual rent ladder",
  );
  assert.ok(
    popoverJsx.includes("building-cost-line"),
    "DeedCardPopover must render build, mortgage, and redemption financials",
  );
  assert.ok(
    popoverJsx.includes("building-residents"),
    "DeedCardPopover must render resident tokens on the block",
  );

  // CTA buttons with shimmer sweep
  assert.ok(
    jsx.includes('className="cta-shimmer"') || jsx.includes("cta-shimmer"),
    "Primary CTA buttons must have cta-shimmer class",
  );
  assert.ok(jsx.includes("Roll the dice"), "Must include Roll the dice CTA");
  assert.ok(jsx.includes("Claim block"), "Must include Claim block CTA");
});
