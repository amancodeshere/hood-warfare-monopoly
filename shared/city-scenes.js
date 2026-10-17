// Original, deterministic city-builder scenes. Road corridors stay clear at 140/280.
const lot = (u, v, w, d, h, tone = 0, label, elevation = 0) => ({u,v,w,d,h,tone,label,elevation});
const homes = (u,v,cols,rows,w,d,h) => Array.from({length:cols*rows},(_,i)=>
  lot(u+(i%cols)*(w+5),v+Math.floor(i/cols)*(d+5),w,d,h+(i%3)*7,i%3));
export const CITY_SCENES = {
  trenches: { name: "America Blocks", colors:["#9c6551","#ba8261","#697d71","#66594e"], trees:[[110,95],[305,305],[385,390]], lots:[
    ...homes(16,18,3,1,29,82,39),...homes(170,18,2,1,38,80,48),lot(314,20,80,85,30,2,"DELI"),
    ...homes(16,173,3,1,29,78,40),lot(174,174,77,78,38,0,"BLOCK"),lot(316,170,76,86,25,2,"GARAGE"),
    lot(20,315,84,74,24,1,"GROVE"),...homes(315,318,2,1,38,72,35)] },
  "night-shift": {name:"India Gully",colors:["#ba8d62","#9d6c50","#828e75","#846b50"],trees:[[110,388],[392,100]],lots:[
    ...homes(15,16,3,3,28,28,17),...homes(170,18,3,2,25,40,24),...homes(315,18,2,2,37,40,30),
    ...homes(16,171,3,2,28,37,21),...homes(170,174,3,3,25,25,19),...homes(315,173,2,2,38,37,25),
    ...homes(18,318,3,2,27,36,18),...homes(317,317,2,2,37,35,23)]},
  boardwalk: {name:"China Backstreets",colors:["#83928b","#a68b6f","#666f76","#7b7161"],trees:[[111,385],[389,110]],lots:[
    lot(18,18,94,24,67),lot(18,49,28,69,77,1),lot(79,49,33,69,88,2),...homes(170,18,2,2,38,40,64),
    lot(316,18,82,34,93,2),lot(316,63,82,48,61,1),lot(18,171,94,30,68),lot(18,211,94,43,78,2),
    ...homes(171,173,2,2,38,37,71),lot(315,171,82,83,96,2),lot(18,317,93,70,44,1,"NOODLES"),...homes(316,318,2,2,36,33,56)]},
  "snow-day": {name:"Europe Estates",colors:["#aa795c","#8c8270","#858e83","#a2523d"],trees:[[107,105],[304,103],[108,304],[390,390]],lots:[
    lot(18,18,95,34,49),lot(18,63,95,35,55,1),lot(170,18,35,96,65,2),lot(217,18,35,96,65,2),
    lot(317,19,80,82,42),lot(18,171,94,31,47),lot(18,215,94,32,47),lot(173,173,78,29,51,1),
    lot(173,213,29,40,51,1),lot(317,172,80,80,46,0,"CAFE"),lot(18,317,84,72,35),lot(317,318,80,69,44)]},
  neon: {name:"Mexico Barrios",colors:["#ca7954","#bb9c61","#739086","#ac654a"],trees:[[111,110],[390,104],[110,390]],lots:[
    ...homes(16,18,2,2,41,38,23),...homes(172,18,2,2,37,37,22),lot(315,18,81,38,22,1,"TIENDA"),lot(315,70,81,39,28,2),
    ...homes(16,173,2,2,40,37,26),lot(173,173,78,29,28),lot(173,214,29,40,28,1),...homes(315,173,2,2,38,36,25),
    lot(18,317,91,70,22,1,"MERCADO"),...homes(315,318,2,2,37,34,24)]},
  festival: {name:"Brazil Favelas",colors:["#b97b55","#c5a16e","#72988b","#93775e"],trees:[[109,389],[389,108]],lots:[
    ...homes(14,16,3,3,29,27,22).map((p,i)=>({...p,elevation:24-Math.floor(i/3)*6})),
    ...homes(170,17,3,3,25,27,28).map((p,i)=>({...p,elevation:18-Math.floor(i/3)*5})),
    ...homes(315,17,2,3,38,27,31).map(p=>({...p,elevation:12})),...homes(15,173,3,2,28,36,24),
    ...homes(170,173,2,2,38,37,30),...homes(316,172,2,2,37,37,27),...homes(17,317,3,2,27,35,20),...homes(316,318,2,2,36,34,24)]},
};
export function resolveCityTheme(game) {
  const selected=game?.settings?.map;
  if (selected?.startsWith("custom:")) return "custom";
  if (CITY_SCENES[selected]) return selected;
  if (game?.mapTheme === "custom") return "custom";
  return CITY_SCENES[selected] ? selected : CITY_SCENES[game?.mapTheme] ? game.mapTheme : "trenches";
}
