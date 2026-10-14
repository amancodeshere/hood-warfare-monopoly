import { ARENA, angle } from "../shared/arena.js";
const FOV = 1.16;
const INK = "#161616";
const fighterSprites = new Map();
let weaponLayer;
function cast(x, y, dx, dy) {
  let mx = Math.floor(x),
    my = Math.floor(y),
    side = 0;
  const ddx = Math.abs(1 / dx),
    ddy = Math.abs(1 / dy),
    sx = dx < 0 ? -1 : 1,
    sy = dy < 0 ? -1 : 1;
  let tx = (dx < 0 ? x - mx : mx + 1 - x) * ddx,
    ty = (dy < 0 ? y - my : my + 1 - y) * ddy;
  for (let n = 0; n < 40; n++) {
    if (tx < ty) {
      tx += ddx;
      mx += sx;
      side = 0;
    } else {
      ty += ddy;
      my += sy;
      side = 1;
    }
    if (ARENA[my]?.[mx] !== "0") break;
  }
  return { distance: Math.max(0.01, side ? ty - ddy : tx - ddx), side, mx, my };
}
export function renderArena(ctx, camera, d, viewer, now, effects) {
  const w = ctx.canvas.width,
    h = ctx.canvas.height,
    focal = w / (2 * Math.tan(FOV / 2));
  const horizon = h * 0.5 + Math.tan(camera.pitch) * focal;
  ctx.fillStyle = "#bcbcbc";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#747474";
  ctx.fillRect(0, horizon, w, h - horizon);
  // A floor grid gives movement a readable, stable frame of reference.
  ctx.strokeStyle = "#636363";
  ctx.lineWidth = 1;
  for (let z = 1; z < 15; z++) {
    const y = horizon + (0.8 * focal) / z;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  const depth = new Float32Array(w);
  let previous = "";
  for (let x = 0; x < w; x += 2) {
    const offset = Math.atan((x - w / 2) / focal),
      ray = camera.yaw + offset;
    const hit = cast(camera.x, camera.y, Math.cos(ray), Math.sin(ray));
    const distance = hit.distance * Math.cos(offset),
      scale = focal / distance;
    depth[x] = depth[x + 1] = distance;
    const top = horizon - (1.6 - 0.8) * scale,
      bottom = horizon + 0.8 * scale;
    const shade = Math.max(
      83,
      Math.round((hit.side ? 166 : 193) - distance * 3),
    );
    ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
    ctx.fillRect(x, top, 2, bottom - top);
    ctx.fillStyle = INK;
    ctx.fillRect(x, top, 2, 4);
    ctx.fillRect(x, bottom - 4, 2, 4);
    // Outline geometry rather than blurring it; panels remain anchored to walls.
    const key = hit.mx + "," + hit.my + "," + hit.side;
    if (key !== previous) {
      ctx.fillRect(x, top, 4, bottom - top);
      previous = key;
    }
    ctx.fillStyle = "#535353";
    ctx.fillRect(x, horizon + 0.38 * scale, 2, Math.max(1, scale * 0.015));
  }
  const objects = Object.entries(d.fighters)
    .filter(([id]) => id !== viewer)
    .map(([id, f]) => ({ kind: "fighter", id, ...f }));
  for (const b of d.projectiles || []) objects.push({ kind: "bullet", ...b });
  objects.sort(
    (a, b) =>
      Math.hypot(b.x - camera.x, b.y - camera.y) -
      Math.hypot(a.x - camera.x, a.y - camera.y),
  );
  for (const o of objects) {
    const dx = o.x - camera.x,
      dy = o.y - camera.y,
      offset = angle(Math.atan2(dy, dx) - camera.yaw);
    const distance = Math.hypot(dx, dy) * Math.cos(offset);
    if (distance < 0.08 || Math.abs(offset) > FOV * 0.7) continue;
    const scale = focal / distance,
      cx = w / 2 + Math.tan(offset) * focal;
    if (o.kind === "bullet") {
      const cy = horizon + (0.8 - o.z) * scale,
        r = Math.max(2, 0.045 * scale);
      if (cx >= 0 && cx < w && distance < (depth[Math.floor(cx)] || Infinity)) {
        ctx.fillStyle = "#fa302a";
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
        ctx.fillStyle = "#fff";
        ctx.fillRect(cx - r / 3, cy - r / 3, r * 0.6, r * 0.6);
      }
      continue;
    }
    const bodyW = 0.58 * scale,
      top = horizon - (1.08 - 0.8) * scale,
      bottom = horizon + 0.8 * scale;
    ctx.save();
    ctx.beginPath();
    // Column clipping prevents silhouettes showing through solid cover.
    for (
      let x = Math.max(0, Math.floor(cx - bodyW / 2));
      x < Math.min(w, cx + bodyW / 2);
      x += 2
    ) {
      if (distance < depth[x]) ctx.rect(x, top, 2, bottom - top + 2);
    }
    ctx.clip();
    ctx.translate(cx - bodyW / 2, top);
    ctx.scale(bodyW / 64, (bottom - top) / 120);
    drawFighter(ctx, o.hp <= 0, now - o.lastShot < 100);
    ctx.restore();
  }
  drawWeapon(ctx, w, h, now, effects);
  if (now - effects.hurt < 170) {
    ctx.fillStyle = "#e5252530";
    ctx.fillRect(0, 0, w, h);
  }
  ctx.strokeStyle = now - effects.hit < 180 ? "#fff" : "#f02f2b";
  ctx.lineWidth = 2;
  const x = w / 2,
    y = h / 2;
  ctx.beginPath();
  ctx.moveTo(x - 7, y);
  ctx.lineTo(x - 3, y);
  ctx.moveTo(x + 3, y);
  ctx.lineTo(x + 7, y);
  ctx.moveTo(x, y - 7);
  ctx.lineTo(x, y - 3);
  ctx.moveTo(x, y + 3);
  ctx.lineTo(x, y + 7);
  ctx.stroke();
}
function drawFighter(ctx, dead, firing) {
  const key = `${dead}:${firing}`;
  if (!fighterSprites.has(key)) {
    const sprite = document.createElement("canvas");
    sprite.width = 32;
    sprite.height = 60;
    const ink = sprite.getContext("2d");
    ink.scale(0.5, 0.5);
    paintFighter(ink, dead, firing);
    fighterSprites.set(key, sprite);
  }
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(fighterSprites.get(key), 0, 0, 64, 120);
}
function paintFighter(ctx, dead, firing) {
  ctx.fillStyle = "#ececec";
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(44, 0);
  ctx.lineTo(51, 11);
  ctx.lineTo(51, 29);
  ctx.lineTo(60, 37);
  ctx.lineTo(64, 74);
  ctx.lineTo(52, 82);
  ctx.lineTo(48, 72);
  ctx.lineTo(47, 120);
  ctx.lineTo(32, 120);
  ctx.lineTo(29, 87);
  ctx.lineTo(25, 120);
  ctx.lineTo(9, 120);
  ctx.lineTo(12, 70);
  ctx.lineTo(0, 70);
  ctx.lineTo(3, 38);
  ctx.lineTo(14, 28);
  ctx.lineTo(11, 13);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.fillRect(15, 3, 34, 27);
  ctx.fillStyle = "#ececec";
  ctx.fillRect(20, 14, 25, 14);
  ctx.fillStyle = INK;
  ctx.fillRect(24, 19, 6, 3);
  ctx.fillRect(35, 19, 6, 3);
  ctx.fillRect(25, 25, 14, 3);
  ctx.fillStyle = INK;
  ctx.fillRect(29, 34, 5, 39);
  ctx.fillRect(10, 65, 10, 7);
  ctx.fillRect(14, 76, 32, 4);
  ctx.fillRect(12, 80, 13, 38);
  ctx.fillRect(34, 80, 11, 38);
  ctx.fillStyle = "#f0322c";
  ctx.fillRect(33, 44, 29, 10);
  ctx.fillRect(40, 53, 10, 14);
  if (firing) {
    ctx.fillStyle = "#fff";
    ctx.fillRect(60, 42, 6, 14);
  }
  if (dead) {
    ctx.fillStyle = "#ef302b";
    ctx.fillRect(21, 17, 24, 4);
  }
}
function drawWeapon(ctx, w, h, now, fx) {
  weaponLayer ||= document.createElement("canvas");
  const width = Math.ceil(w / 3),
    height = Math.ceil(h / 3);
  if (weaponLayer.width !== width || weaponLayer.height !== height) {
    weaponLayer.width = width;
    weaponLayer.height = height;
  }
  const ink = weaponLayer.getContext("2d");
  ink.clearRect(0, 0, width, height);
  paintWeapon(ink, width, height, now, fx);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(weaponLayer, 0, 0, w, h);
}
function paintWeapon(ctx, w, h, now, fx) {
  const recoil = fx.reduced ? 0 : Math.max(0, 1 - (now - fx.shot) / 150),
    kick = Math.max(0, 1 - (now - fx.kick) / 280);
  const reload =
    fx.reloadUntil > now
      ? Math.sin(Math.PI * Math.min(1, (fx.reloadUntil - now) / 1100))
      : 0;
  const bob = fx.reduced
    ? 0
    : Math.sin(fx.steps * 9) * Math.min(4, fx.speed * 2);
  ctx.save();
  ctx.translate(w * 0.68, h + (recoil * 20 + reload * 95 + bob) * (h / 360));
  ctx.scale(h / 360, h / 360);
  if (kick) {
    ctx.fillStyle = "#eee";
    ctx.fillRect(-65, -100 * kick, 53, 110);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6;
    ctx.strokeRect(-65, -100 * kick, 53, 110);
    ctx.fillStyle = INK;
    ctx.fillRect(-78, -130 * kick, 77, 44);
    ctx.restore();
    return;
  }
  ctx.fillStyle = "#ededed";
  ctx.beginPath();
  ctx.moveTo(-35, 0);
  ctx.lineTo(-22, -97);
  ctx.lineTo(28, -101);
  ctx.lineTo(69, 0);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.fillStyle = "#e92925";
  ctx.beginPath();
  ctx.moveTo(-26, -160);
  ctx.lineTo(24, -160);
  ctx.lineTo(43, -127);
  ctx.lineTo(27, -107);
  ctx.lineTo(29, -52);
  ctx.lineTo(-6, -52);
  ctx.lineTo(-14, -112);
  ctx.lineTo(-33, -120);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#9a1717";
  ctx.fillRect(-24, -145, 50, 14);
  ctx.fillStyle = INK;
  ctx.fillRect(-6, -166, 19, 7);
  ctx.fillRect(2, -96, 14, 32);
  ctx.fillStyle = "#fff";
  ctx.fillRect(-19, -155, 34, 4);
  if (now - fx.shot < 65) {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(-20, -167);
    ctx.lineTo(-45, -193);
    ctx.lineTo(-12, -181);
    ctx.lineTo(0, -218);
    ctx.lineTo(13, -181);
    ctx.lineTo(37, -196);
    ctx.lineTo(18, -166);
    ctx.fill();
  }
  ctx.restore();
}
