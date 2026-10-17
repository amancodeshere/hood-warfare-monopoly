import { MAPS } from "./board.js";
export const DEFAULT_SETTINGS = {
  maxPlayers: 4,
  startingCash: 1500,
  map: "trenches",
  mapSize: "standard",
  visibility: "private",
  autoFill: true,
  teams: false,
  killerTakesAll: false,
  doubleRent: true,
  communityCash: true,
  auctions: true,
  prisonRent: true,
  mortgage: true,
  evenBuild: true,
  randomOrder: false,
  doubles: true,
  diceMode: "balanced",
  turnSeconds: 90,
  registeredOnly: false,
};
export const RULE_OPTIONS = [
  [
    "autoFill",
    "Fill empty seats with bots",
    "Start alone or with friends; bots take every spare seat.",
  ],
  [
    "teams",
    "Teams mode",
    "No teammate rent. Share sets with your crew.",
  ],
  [
    "killerTakesAll",
    "Killer Takes All",
    "When a landlord wins a rent shootout, they inherit the debtor’s properties.",
  ],
  [
    "doubleRent",
    "Double rent on complete districts",
    "Reward crews that own an entire neighborhood.",
  ],
  [
    "communityCash",
    "Community Plot payouts",
    "Landing on the Plot collects taxes, fines, and stolen cash.",
  ],
  [
    "auctions",
    "Auction unclaimed blocks",
    "Pass on a property and every crew can bid.",
  ],
  [
    "prisonRent",
    "Collect rent while jailed",
    "Switch off to freeze a jailed landlord’s rent.",
  ],
  [
    "mortgage",
    "Allow mortgages",
    "Raise half a block’s value and pause its rent.",
  ],
  [
    "evenBuild",
    "Build and sell evenly",
    "Keep business levels balanced across a district.",
  ],
  [
    "randomOrder",
    "Shuffle starting order",
    "The server draws a fair starting order.",
  ],
  [
    "doubles",
    "Doubles grant another roll",
    "Three consecutive doubles send you to County.",
  ],
  [
    "registeredOnly",
    "Registered players only",
    "Require a saved account for public or private seats.",
  ],
];
export function settings(input = {}, previous = DEFAULT_SETTINGS) {
  const out = { ...previous };
  for (const [key, value] of Object.entries(input)) {
    if (!Object.hasOwn(DEFAULT_SETTINGS, key))
      throw new Error("Unknown room setting.");
    if (typeof DEFAULT_SETTINGS[key] === "boolean") {
      if (typeof value !== "boolean")
        throw new Error("Choose an on/off setting.");
    } else if (
      key === "diceMode" &&
      !["balanced", "regular"].includes(value)
    )
      throw new Error("Choose a valid dice mode.");
    else if (
      key === "maxPlayers" &&
      (!Number.isInteger(value) || value < 2 || value > 8)
    )
      throw new Error("Choose 2–8 seats.");
    else if (
      key === "startingCash" &&
      ![500, 1000, 1500, 2000, 2500, 3000].includes(value)
    )
      throw new Error("Choose a valid starting cash amount.");
    else if (key === "turnSeconds" && ![60, 90, 120].includes(value))
      throw new Error("Choose a valid turn clock.");
    else if (
      key === "map" &&
      !MAPS.some((m) => m.id === value) &&
      !(typeof value === "string" && /^custom:[a-f0-9-]{36}$/.test(value))
    )
      throw new Error("Choose a city map.");
    else if (
      key === "mapSize" &&
      !["standard", "quick", "blitz"].includes(value)
    )
      throw new Error("Choose a valid map size.");
    else if (key === "visibility" && !["private", "public"].includes(value))
      throw new Error("Choose a room visibility.");
    out[key] = value;
  }
  return out;
}
export function matchLimit(value) {
  if (value === null || value === undefined || value === 0) return null;
  if ([10, 20, 30].includes(value)) return value;
  throw new Error("Choose winner takes all or a round limit.");
}
