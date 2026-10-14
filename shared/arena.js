// One collision model for authoritative simulation and immediate client prediction.
export const ARENA = [
  "111111111111",
  "100000000001",
  "100000000001",
  "100110011001",
  "100000000001",
  "100000000001",
  "100000000001",
  "100000000001",
  "100110011001",
  "100000000001",
  "100000000001",
  "111111111111",
];
export const SPEED = 3.4;
export const BULLET_SPEED = 15;
export const SHOT_DELAY = 280;
export const RELOAD_MS = 1100;
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const angle = (v) => Math.atan2(Math.sin(v), Math.cos(v));
export function wall(x, y) {
  return ARENA[Math.floor(y)]?.[Math.floor(x)] !== "0";
}
export function clear(x, y, radius = 0.24) {
  return ![
    [-radius, -radius],
    [-radius, radius],
    [radius, -radius],
    [radius, radius],
  ].some(([a, b]) => wall(x + a, y + b));
}
export function move(f, input, seconds) {
  const length = Math.max(1, Math.hypot(input.forward, input.strafe));
  const speed = (SPEED * seconds) / length;
  const dx =
    (Math.cos(f.yaw) * input.forward - Math.sin(f.yaw) * input.strafe) * speed;
  const dy =
    (Math.sin(f.yaw) * input.forward + Math.cos(f.yaw) * input.strafe) * speed;
  if (clear(f.x + dx, f.y)) f.x += dx;
  if (clear(f.x, f.y + dy)) f.y += dy;
}
export function sight(ax, ay, bx, by) {
  const length = Math.hypot(bx - ax, by - ay);
  for (let i = 0; i <= length; i += 0.06)
    if (wall(ax + ((bx - ax) * i) / length, ay + ((by - ay) * i) / length))
      return false;
  return true;
}
