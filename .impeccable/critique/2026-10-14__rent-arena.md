# Arena finish review

Disposition: **ship** (final verdict; initial review required fixes)

## persistence

The arena contract exists in the body of `index.html` and survives in `dist/index.html` with seed `user-red-handed`. It names the reference, original geometry, health/timer, reticle, red weapons/projectiles, free movement, and server settlement. The prior board contract remains present. `PRODUCT.md` preserves the property-game purpose and authoritative online constraint. The current `DESIGN.md` still describes the previous SVG alley and dodge/duck interaction; the required documenter must replace that arena subsection with the built canvas/free-movement behavior while preserving the board identity. Detector input is an empty array; no detector rerun was made.

## fidelity

The desktop and mobile captures both establish the intended first-person scene immediately: gray outlined room geometry, a black/white armed rival, a foreground red weapon, center reticle, ammo, health and timer. The implementation supplies actual collision movement and perspective rendering rather than a static screenshot. WASD/ZQSD, arrows, captured or dragged mouse aim, kick/reload, and held touch movement are present. Server simulation owns health, bullets and ammo.

The strongest remaining visual gap is the reference's chunky black pixel silhouette language. In the reference, wall junctions use substantial black contours and fighters are broad white forms bounded by stepped black silhouettes. In this build the walls are thin ruled panels and the narrow rival has smooth sloping vector edges with a prominent white outside stroke. The red foreground pistol also uses smooth sloped polygons. These differences change the visible art grammar rather than merely swapping original characters. The adaptation need not copy the reference's room, character shapes or three-enemy composition, but it should carry its unmistakable contour and pixel treatment.

The supplied captures show live play only. Code inspection exposes a mobile ready-state issue: `.arena-message` is absolutely confined to the 4:3 stage, whose `overflow:hidden` clips excess content. At the supplied mobile width the stage is roughly 308 × 231 px, while the two-line 42px title, two 14px paragraphs, margins, 44px ready action and vertical padding require materially more height. The initial decision can therefore hide its essential action or stakes even though the live state fits.

## ceiling

This is a viable implementation with the right scene, controls and composition; a wholesale rebuild would discard working mechanism without addressing either gap more directly. The remaining work is one art-language batch and one state-layout batch. Static screenshots and code cannot certify frame pacing, network latency or real multi-touch ergonomics; those remain the build thread's behavioral verification responsibility. The current live captures are sufficient for this visual assessment, but a final mobile ready capture is needed for the clipping finding.

## material_fixes

| ID | Priority | Finding | Concrete fix | Resolution criterion |
| --- | --- | --- | --- | --- |
| F1 | P1 | Arena art only partially carries the pinned reference's defining pixel/black-contour grammar. | In `src/arenaRenderer.js`, author original stepped raster-style fighter and weapon shapes with substantial black outlines, predominantly white fighter bodies, and red weapons. Replace the rival's white exterior stroke as the defining silhouette boundary with black pixel edges. Strengthen major wall junctions/ceiling/floor boundaries proportionally at both viewport sizes while keeping secondary panel lines subordinate. Render sprite assets with deliberate nearest-neighbor treatment or integer stepped paths; do not reuse reference art. | Desktop and mobile crops visibly read as chunky black-outlined, black/white/red sprite combat rather than thin ruled walls plus smooth vector characters. Rival and weapon silhouettes retain legibility at distance. |
| F2 | P1 | Mobile Ready up and rent stakes can be clipped by the fixed 4:3 stage. | Give ready/result content an in-flow region or a state-specific stage height sufficient for all copy and its action. Preserve live-stage proportions and keep health, stakes and the Ready up action reachable together without hiding content under the stage's overflow. Prefer concise preflight copy over shrinking the action or stakes text. | At the supplied 390px mobile width, and a narrow 320px width, a ready-state screenshot shows all consequences and the complete enabled/waiting Ready up action. No text or action is cropped by the arena. Recheck finished-state copy in the same layout. |

Initial review: both findings were unresolved. The build thread applied them in one batch and returned desktop/mobile live, desktop/mobile ready, and narrow mobile ready captures for this verdict.

## keep

Keep the first-person camera, original map/collision model, server-owned combat and existing rent outcomes. Keep prediction/reconciliation and remote smoothing. Keep the health/ammo/timer arrangement, explicit kick/reload actions, center reticle, optional audio, keyboard alternatives, and touch movement controls. Keep the incumbent asphalt/olive dialog, typography and board outside the arena: the reference commitment belongs to the combat scene and must not erase the property's established visual identity.

## Final verdict pass

Disposition: **ship**. Both material findings are resolved. This verdict considers only F1/F2 and does not reopen a polish hunt.

| Finding | Score | Evidence |
| --- | --- | --- |
| F1 — pinned pixel/black-contour art grammar | Resolved | Latest desktop and mobile live captures show predominantly white fighter bodies, black stepped exterior silhouettes, red weapons, and a visibly pixel-stepped foreground gun. Major wall/ceiling/floor boundaries are now substantially stronger than secondary panel rules. Original characters and geometry remain distinct from the reference. |
| F2 — clipped mobile ready action/stakes | Resolved | Latest 390px and 320px ready captures show both consequence paragraphs and the complete Ready up action inside the stage, with clear lower clearance. Desktop ready also preserves the full content. The stage-specific height fixes the demonstrated initial-state clipping. |

The build thread reports behavioral checks for held mobile movement, reload, and Ready up fitting at both widths. This reviewer has no browser and makes no independent runtime-performance claim. Finish the regression verification and required design documentation handoff; no additional material visual fix remains on this review's list.
