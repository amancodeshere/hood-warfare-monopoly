const STREET_ENDINGS = new Set([
  "avenue", "block", "blvd", "boulevard", "city", "corner", "drive",
  "estate", "express", "flats", "gardens", "heights", "lane", "line",
  "mall", "mansion", "plaza", "row", "square", "station", "studios",
  "towers",
]);
const FILLER_WORDS = new Set(["a", "an", "by", "in", "of", "the"]);

// Intentional board copy for long standard and night-shift property names.
const AUTHORED_LABELS = new Map([
  ["Caught Lackin Lane", "Lackin Lane"],
  ["Broke Boy Blvd", "Broke Boy"],
  ["Trap House Towers", "Trap House"],
  ["Rent Due Lil Bro", "Rent Due"],
  ["Hit a Lick Heights", "Lick Heights"],
  ["Chain Snatch City", "Snatch City"],
  ["Main Character Mall", "Main Mall"],
  ["Drip Check Drive", "Drip Check"],
  ["No Snitch Studios", "No Snitch"],
  ["Side Quest Square", "Side Quest"],
  ["Big Stepper Block", "Big Stepper"],
  ["Get Money Gardens", "Money Gardens"],
  ["Don’t Fold Flats", "Don’t Fold"],
  ["Rich Auntie Row", "Auntie Row"],
  ["Final Boss Estate", "Final Boss"],
  ["Last Slice Lane", "Slice Lane"],
  ["After Hours Cuts", "After Hours"],
  ["Night Shift Flats", "Night Flats"],
  ["Trap Nap Towers", "Trap Nap"],
  ["Rent at Midnight", "Rent Midnight"],
  ["Late Plate Corner", "Late Plate"],
  ["Sneaky Link Heights", "Sneaky Link"],
  ["Chain Reaction City", "Chain Reaction"],
  ["Parking Lot Mall", "Parking Mall"],
  ["Drip After Dark", "After Dark"],
  ["Side Mission Square", "Side Mission"],
  ["Night Owl Block", "Night Owl"],
  ["Neon Money Gardens", "Neon Money"],
  ["Don’t Snooze Flats", "Snooze Flats"],
  ["Rich Uncle Row", "Uncle Row"],
]);

// These are the signature words for the authored roots used by themed maps.
// Keeping the street type gives related blocks distinct, easy-to-scan labels.
const THEME_ROOT_LABELS = new Map([
  ["Sand in the Jordans", "Jordans"],
  ["Pier Pressure", "Pier"],
  ["Beach Bag Bandit", "Bandit"],
  ["Sunburn Side Hustle", "Hustle"],
  ["Boardwalk Beef", "Beef"],
  ["Flip Flop Flex", "Flex"],
  ["Seagull Stole My Chips", "Chips"],
  ["Lifeguard Lackin’", "Lackin’"],
  ["Frozen Drip", "Frozen"],
  ["Black Ice Boulevard", "Black"],
  ["Cold Shoulder", "Cold"],
  ["Snowball Scheme", "Snowball"],
  ["Puffer Jacket Palace", "Puffer"],
  ["Heated Beef", "Heated"],
  ["Slush Fund", "Slush"],
  ["Icebox Uncle", "Icebox"],
  ["RGB Rent", "RGB"],
  ["Arcade Opps", "Arcade"],
  ["NPC Boulevard", "NPC"],
  ["Lag Switch Lane", "Lag"],
  ["Neon No Cap", "Neon"],
  ["Respawn Row", "Respawn"],
  ["Pixel Paper", "Pixel"],
  ["Final Boss Energy", "Energy"],
  ["Auntie’s Side Eye", "Auntie"],
  ["Uncle Burnt the Ribs", "Burnt"],
  ["Plate Tax", "Plate"],
  ["Cookout Credentials", "Cookout"],
  ["Extra Sauce Estate", "Sauce"],
  ["DJ No Requests", "DJ"],
  ["Leftovers Lick", "Leftovers"],
  ["Foldout Chair Flex", "Foldout"],
]);

/** Return a concise, display-only board label; canonical names remain intact. */
export function getBoardDisplayName(name = "") {
  const canonical = String(name).trim();
  if (AUTHORED_LABELS.has(canonical)) return AUTHORED_LABELS.get(canonical);
  if (canonical.length <= 14) return canonical;

  const words = canonical.split(/\s+/).filter(Boolean);
  if (words.length <= 2) return canonical;

  const last = words.at(-1);
  const ending = last.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  if (STREET_ENDINGS.has(ending)) {
    const root = words.slice(0, -1).join(" ");
    if (THEME_ROOT_LABELS.has(root))
      return `${THEME_ROOT_LABELS.get(root)} ${last}`;

    const meaningful = words.slice(0, -1).filter(
      (word) =>
        !FILLER_WORDS.has(word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "")),
    );
    return meaningful.length > 1
      ? `${meaningful.at(-1)} ${last}`
      : `${meaningful[0] || last}`;
  }

  const meaningful = words.filter(
    (word) =>
      !FILLER_WORDS.has(word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "")),
  );
  if (meaningful.length <= 2) return meaningful.join(" ") || canonical;
  return `${meaningful[0]} ${meaningful.at(-1)}`;
}
