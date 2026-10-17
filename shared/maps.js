import { BOARD, DISTRICTS, makeBoard, MAPS } from "./board.js";
const clean = (value, max) => {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.length > max ||
    /[<>]/.test(value) ||
    [...value].some((c) => c.charCodeAt(0) < 32)
  )
    throw new Error("Use a name without markup, up to " + max + " characters.");
  return value.trim();
};
export function mapDefinition(input) {
  if (!input || !MAPS.some((m) => m.id === input.base))
    throw new Error("Choose a base city.");
  if (
    !Array.isArray(input.names) ||
    input.names.length !== BOARD.length ||
    !Array.isArray(input.districts) ||
    input.districts.length !== 8
  )
    throw new Error("A city needs 40 blocks and eight districts.");
  const names = input.names.map((n) => clean(n, 32));
  const districts = input.districts.map((d) => {
    if (!/^#[0-9a-f]{6}$/i.test(d?.color))
      throw new Error("Choose a valid district color.");
    return { name: clean(d.name, 24), color: d.color.toLowerCase() };
  });
  const events = {};
  for (const [id, type] of Object.entries(input.events || {})) {
    if (
      !["card", "roulette", "stoppa"].includes(BOARD[Number(id)]?.type) ||
      !["card", "roulette", "stoppa"].includes(type) ||
      String(Number(id)) !== id
    )
      throw new Error("Only surprise spaces can change their event.");
    events[id] = type;
  }
  return {
    name: clean(input.name, 32),
    base: input.base,
    names,
    districts,
    events,
  };
}
export function presetMap(id, mapSize = "standard") {
  const m = MAPS.find((m) => m.id === id);
  if (!m) throw new Error("Choose a city map.");
  const board = makeBoard(id, mapSize);
  const count = Math.max(...board.filter(t => t.type === "property").map(t => t.group)) + 1;
  const districts = DISTRICTS.slice(0, count).map((d, i) => ({
    ...d,
    color: m.colors?.[i] || d.color,
  }));
  return { board, districts, mapName: m.name, mapTheme: id };
}
export function customMap(definition) {
  const d = mapDefinition(definition);
  return {
    ...presetMap(d.base),
    mapName: d.name,
    board: makeBoard(d.base).map((t) => ({
      ...t,
      name: d.names[t.id],
      type: d.events[t.id] || t.type,
    })),
    districts: d.districts,
  };
}
export function draftMap(base = "trenches") {
  const m = presetMap(base);
  return {
    name: "My block, my rules",
    base,
    names: m.board.map((t) => t.name),
    districts: m.districts,
    events: {},
  };
}
