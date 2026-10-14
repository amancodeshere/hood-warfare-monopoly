---
version: 1
slug: "src-arenaduel-jsx"
primary_target: "src/ArenaDuel.jsx"
related_targets: ["src/arenaRenderer.js","server/arena.js"]
---

# Rent arena

Scope: the optional rent-debt shootout in `src/ArenaDuel.jsx`; an Experience surface for two competing crews, with spectators watching the challenger view. Preserve the surrounding board, city, login, and map identities and persisted lane FPS/tactic duel compatibility.

Job and action: understand the rent and elimination stakes, ready up, move and aim through cover, fire or kick, reload, then return to the block after the server settles the result. Proof belongs in visible names, numeric health, ammunition, timer, projectile travel, shot feedback, and explicit result copy. Account/provider setup is outside this surface.

Direction: the user pinned Red Handed (`user-red-handed` in the body direction contract). Gray outlined corridors, original black-and-white pixel fighters, a red weapon, visible bullets, and a center reticle make the first-person space readable. The memorable moment is freely moving around cover while red shots cross the gray corridor. This is implemented as a 2.5D canvas raycaster, with original runtime sprite caches rather than borrowed game artwork.

Interaction constraints: free WASD/ZQSD movement; captured mouse aim with drag and arrows as fallbacks; touch drag aim and initially visible movement buttons on narrow/coarse-pointer devices; Fire, Kick, Reload and optional sound with visible labels. Sound starts off. Ready/result text and action must fit narrow screens. Preserve dialog focus behavior, keyboard access, reduced-motion recoil/bob behavior, and authoritative rent consequences.

Closed finish review: SHIP, recorded in `.impeccable/critique/2026-10-14__rent-arena.md`. Pixel contour smoothness and ready-overlay clipping were resolved. No visual direction decisions remain open. Keep future changes within the scoped arena contract and verify ready, live, result, spectator, and narrow-screen states.
