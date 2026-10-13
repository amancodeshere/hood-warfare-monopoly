export const CREWS = [
  {
    name: "Grove Collective",
    short: "GROVE",
    color: "#c6ed72",
    symbol: "crown",
  },
  {
    name: "Eastside Royals",
    short: "ROYALS",
    color: "#b7a2ed",
    symbol: "diamond",
  },
  {
    name: "Sunset Syndicate",
    short: "SUNSET",
    color: "#ecaa7c",
    symbol: "flame",
  },
  { name: "Harbor Union", short: "HARBOR", color: "#83c9d3", symbol: "anchor" },
  { name: "Night Owls", short: "OWLS", color: "#e5d58c", symbol: "key" },
  {
    name: "Northside Motion",
    short: "MOTION",
    color: "#d791ae",
    symbol: "crosshair",
  },
  { name: "Lowrider League", short: "RIDERS", color: "#97c7a3", symbol: "car" },
  { name: "After Hours", short: "AFTER", color: "#94a7ed", symbol: "sparkles" },
];
export const DISTRICTS = [
  { name: "The Bodega Belt", color: "#a3ba86" },
  { name: "Caught Lackin", color: "#95bdd2" },
  { name: "The Trenches", color: "#d8a580" },
  { name: "Hit a Lick", color: "#b3a0cc" },
  { name: "Drip District", color: "#d399b2" },
  { name: "Big Steppers", color: "#d9c784" },
  { name: "Motion Mansion", color: "#86bfa4" },
  { name: "Final Boss Row", color: "#c4ad80" },
];
const p = (name, group, price, rent) => ({
  name,
  type: "property",
  group,
  price,
  rent,
  build: Math.round((price * 0.55) / 10) * 10,
});
export const BOARD = [
  { name: "Home Base", type: "start" },
  p("Auntie’s Bodega", 0, 60, 12),
  { name: "Street Luck", type: "card" },
  p("Broke Boy Blvd", 0, 80, 16),
  { name: "Flex Tax", type: "tax" },
  { name: "Spin the Bus", type: "transit", price: 200, rent: 25 },
  p("No Cap Cuts", 1, 100, 22),
  { name: "Oppa Stoppa", type: "stoppa" },
  p("Caught Lackin Lane", 1, 120, 26),
  p("Backdoor Alley", 1, 140, 30),
  { name: "County Jail", type: "jail" },
  p("The Trenches", 2, 160, 34),
  { name: "The Power Plug", type: "utility", price: 150, rent: 4 },
  p("Trap House Towers", 2, 180, 38),
  p("Rent Due Lil Bro", 2, 200, 42),
  { name: "Slide Thru Station", type: "transit", price: 200, rent: 25 },
  p("Cookout Corner", 3, 220, 46),
  { name: "Street Luck", type: "card" },
  p("Hit a Lick Heights", 3, 240, 50),
  p("Chain Snatch City", 3, 260, 54),
  { name: "Community Plot", type: "parking" },
  p("Studio 808", 4, 280, 58),
  { name: "Oppa Stoppa", type: "stoppa" },
  p("Main Character Mall", 4, 300, 62),
  p("Drip Check Drive", 4, 320, 66),
  { name: "Lowrider Line", type: "transit", price: 200, rent: 25 },
  p("No Snitch Studios", 5, 340, 70),
  p("Side Quest Square", 5, 360, 74),
  { name: "Street Roulette", type: "roulette" },
  p("Big Stepper Block", 5, 380, 78),
  { name: "Police Raid", type: "raid" },
  p("Get Money Gardens", 6, 400, 82),
  p("Don’t Fold Flats", 6, 420, 86),
  { name: "The Water Plug", type: "utility", price: 150, rent: 4 },
  p("Motion Mansion", 6, 440, 90),
  { name: "Escape Route Express", type: "transit", price: 200, rent: 25 },
  { name: "Oppa Stoppa", type: "stoppa" },
  p("Rich Auntie Row", 7, 460, 96),
  { name: "Street Roulette", type: "roulette" },
  p("Final Boss Estate", 7, 500, 110),
].map((t, id) => ({ ...t, id }));
export const MAPS = [
  {
    id: "trenches",
    name: "The Trenches",
    description: "40 blocks. Three Oppa Stoppas. No quiet corners.",
  },
  {
    id: "night-shift",
    name: "Night Shift",
    description: "After-hours stores, arcade luck, and lowrider routes.",
  },
  {
    id: "boardwalk",
    name: "Lackin’ by the Beach",
    description: "Beach bags, overpriced drip, and a very suspicious pier.",
    verified: true,
    colors: [
      "#b6d9bd",
      "#92cbd3",
      "#e6bb85",
      "#d7a3b5",
      "#a5badc",
      "#e1cf8b",
      "#a5cdb7",
      "#d7b7dd",
    ],
  },
  {
    id: "snow-day",
    name: "Cold Streets",
    description: "Frozen pipes. Heated beef. Snow-day hustles.",
    verified: true,
    colors: [
      "#a8ced4",
      "#c0cde4",
      "#b8bad8",
      "#a6c5bd",
      "#cfb8d2",
      "#d2d1b2",
      "#b2c8d5",
      "#d4bed0",
    ],
  },
  {
    id: "neon",
    name: "Neon Problems",
    description: "Arcade scams and main-character money after midnight.",
    verified: true,
    colors: [
      "#d69dc5",
      "#9ccbc5",
      "#b0a1db",
      "#dfad91",
      "#a2bcdf",
      "#d0cf92",
      "#bd9dcf",
      "#8fc9ad",
    ],
  },
  {
    id: "festival",
    name: "Cookout County",
    description: "Uncle’s grill, auntie’s side-eye, and rent at the cookout.",
    verified: true,
    colors: [
      "#d6b18b",
      "#bac68b",
      "#dd9e91",
      "#d3bb82",
      "#a6c7b3",
      "#d4a7c5",
      "#9db9d4",
      "#c7b2d3",
    ],
  },
];
const THEME_WORDS = {
  boardwalk: [
    "Sand in the Jordans",
    "Pier Pressure",
    "Beach Bag Bandit",
    "Sunburn Side Hustle",
    "Boardwalk Beef",
    "Flip Flop Flex",
    "Seagull Stole My Chips",
    "Lifeguard Lackin’",
  ],
  "snow-day": [
    "Frozen Drip",
    "Black Ice Boulevard",
    "Cold Shoulder",
    "Snowball Scheme",
    "Puffer Jacket Palace",
    "Heated Beef",
    "Slush Fund",
    "Icebox Uncle",
  ],
  neon: [
    "RGB Rent",
    "Arcade Opps",
    "NPC Boulevard",
    "Lag Switch Lane",
    "Neon No Cap",
    "Respawn Row",
    "Pixel Paper",
    "Final Boss Energy",
  ],
  festival: [
    "Auntie’s Side Eye",
    "Uncle Burnt the Ribs",
    "Plate Tax",
    "Cookout Credentials",
    "Extra Sauce Estate",
    "DJ No Requests",
    "Leftovers Lick",
    "Foldout Chair Flex",
  ],
};
const NIGHT_NAMES = [
  "Midnight Bodega",
  "Last Slice Lane",
  "After Hours Cuts",
  "Seen at 3AM",
  "Backseat Boulevard",
  "Night Shift Flats",
  "Trap Nap Towers",
  "Rent at Midnight",
  "Late Plate Corner",
  "Sneaky Link Heights",
  "Chain Reaction City",
  "Basement Beats",
  "Parking Lot Mall",
  "Drip After Dark",
  "No Sleep Studios",
  "Side Mission Square",
  "Night Owl Block",
  "Neon Money Gardens",
  "Don’t Snooze Flats",
  "Moonlight Mansion",
  "Rich Uncle Row",
  "Afterparty Estate",
];
export function makeBoard(map = "trenches") {
  let i = 0;
  return BOARD.map((t) => {
    const tile = {
      ...t,
      name:
        map === "night-shift" && t.type === "property"
          ? NIGHT_NAMES[i++]
          : t.name,
    };
    if (THEME_WORDS[map] && t.type === "property")
      tile.name =
        THEME_WORDS[map][t.group] +
        (t.id % 3 === 0 ? " Heights" : t.id % 3 === 1 ? " Row" : " Corner");
    if (["neon", "festival"].includes(map) && [2, 17].includes(t.id)) {
      tile.type = "roulette";
      tile.name = map === "neon" ? "Arcade Jackpot" : "Uncle’s Lucky Draw";
    }
    if (map === "boardwalk" && t.id === 28) {
      tile.type = "stoppa";
      tile.name = "Seagull Stoppa";
    }
    if (map === "snow-day" && t.id === 22) {
      tile.type = "card";
      tile.name = "Cold Street Luck";
    }
    if (map === "night-shift" && t.id === 17) {
      tile.type = "roulette";
      tile.name = "After Hours Roulette";
    }
    if (map === "night-shift" && t.id === 28) {
      tile.type = "card";
      tile.name = "Night Shift Luck";
    }
    return tile;
  });
}
export const CARDS = [
  {
    id: "jackpot",
    title: "Big bag energy",
    text: "Your side hustle just went viral. Collect $600.",
    amount: 600,
    icon: "money",
    tone: "good",
  },
  {
    id: "raid",
    title: "Wrong place. Wrong time.",
    text: "The block gets raided. Go straight to County Jail.",
    jail: true,
    icon: "jail",
    tone: "bad",
  },
  {
    id: "escape",
    title: "A friend on the inside",
    text: "Keep this Get Out of Jail card for a rainy day.",
    escape: true,
    icon: "key",
    tone: "good",
  },
  {
    id: "windfall",
    title: "The block pays back",
    text: "Your pop-up sold out. Collect $250.",
    amount: 250,
    icon: "money",
    tone: "good",
  },
  {
    id: "fine",
    title: "Noise complaint",
    text: "The neighbors called. Pay a $100 fine.",
    amount: -100,
    icon: "alert",
    tone: "bad",
  },
  {
    id: "home",
    title: "Back to your roots",
    text: "Head to Home Base and collect $200.",
    home: true,
    icon: "home",
    tone: "good",
  },
  {
    id: "gift",
    title: "Community love",
    text: "Your crew has your back. Collect $150.",
    amount: 150,
    icon: "heart",
    tone: "good",
  },
  {
    id: "repair",
    title: "Busted storefront",
    text: "Repairs cost $50 per business upgrade, up to $200.",
    repair: true,
    icon: "tool",
    tone: "bad",
  },
];
export const ROULETTE = [
  {
    title: "JACKPOT",
    amount: 900,
    weight: 1,
    tone: "good",
    color: "#c6ed72",
    text: "The wheel loves you. Collect $900.",
  },
  {
    title: "JAIL",
    jail: true,
    weight: 2,
    tone: "bad",
    color: "#b7a2ed",
    text: "Caught on camera. Go straight to County Jail.",
  },
  {
    title: "PAYDAY",
    amount: 300,
    weight: 3,
    tone: "good",
    color: "#83c9d3",
    text: "A clean payday. Collect $300.",
  },
  {
    title: "ESCAPE",
    escape: true,
    weight: 2,
    tone: "good",
    color: "#d9c784",
    text: "Keep a Get Out of Jail card.",
  },
  {
    title: "BUST",
    amount: -150,
    weight: 2,
    tone: "bad",
    color: "#ecaa7c",
    text: "House wins this one. Pay $150.",
  },
  {
    title: "BIG BAG",
    amount: 500,
    weight: 2,
    tone: "good",
    color: "#d399b2",
    text: "Now that’s a bag. Collect $500.",
  },
];
export const money = (n) => "$" + Math.round(n).toLocaleString("en-US");
export function coordinates(id, length = BOARD.length) {
  const side = length / 4,
    size = side + 1;
  if (id <= side) return { row: size, col: size - id };
  if (id <= side * 2) return { row: side * 2 + 1 - id, col: 1 };
  if (id <= side * 3) return { row: 1, col: id - side * 2 + 1 };
  return { row: id - side * 3 + 1, col: size };
}
