const BLOCK = { RELATIVE: 0, LITERAL: 1, OUTLIER: 2, RAW: 3 };

const OUTLIER_STATS = new Set([
  "Bullets Per Shot",
  "Bullets Per Burst",
  "Time Between Bursted Bullets (s)",
  "Rounds Per Second At Max Spin",
  "Spin Acceleration",
  "Spin Deceleration",
]);

function detectCollapsedStats(statCols, heroNames, baseMap, scaledMap) {
  const collapsed = new Set();
  statCols.forEach((stat, i) => {
    const colIdx  = i + 1;
    const allSame = heroNames.every(hero => {
      const baseVal   = cleanValue((baseMap[hero]   || [])[colIdx] || "");
      const scaledVal = cleanValue((scaledMap[hero] || [])[colIdx] || "");
      return baseVal === scaledVal;
    });
    if (allSame) collapsed.add(stat);
  });
  console.log("Collapsed stats:", [...collapsed].join(", "));
  return collapsed;
}

function classifyLevel(stat, vals) {
  const unique = new Set(vals).size;
  if (unique <= 1) return BLOCK.RAW;
  if (OUTLIER_STATS.has(stat)) return BLOCK.OUTLIER;
  if (unique <= 8) return BLOCK.LITERAL;
  return BLOCK.RELATIVE;
}

function buildStatBlockMap(statCols, heroNames, baseMap, scaledMap, collapsedStats) {
  const statBlockMap = {};
  statCols.forEach((stat, i) => {
    const colIdx     = i + 1;
    const baseVals   = heroNames.map(h => toNumber((baseMap[h]   || [])[colIdx]));
    const scaledVals = heroNames.map(h => toNumber((scaledMap[h] || [])[colIdx]));
    if (collapsedStats.has(stat)) {
      statBlockMap[stat] = classifyLevel(stat, baseVals);
    } else {
      statBlockMap[stat] = Math.min(
        classifyLevel(stat, baseVals),
        classifyLevel(stat, scaledVals)
      );
    }
  });
  return statBlockMap;
}

function classifyStats(statCols, heroNames, baseMap, scaledMap) {
  const collapsedStats             = detectCollapsedStats(statCols, heroNames, baseMap, scaledMap);
  const statBlockMap               = buildStatBlockMap(statCols, heroNames, baseMap, scaledMap, collapsedStats);
  const { allSameBase, allSameScaled } = detectAllSameLevels(statCols, heroNames, baseMap, scaledMap, statBlockMap, collapsedStats);
  return {
    collapsedStats,
    relativeStats: statCols.filter(s => statBlockMap[s] === BLOCK.RELATIVE),
    literalStats:  statCols.filter(s => statBlockMap[s] === BLOCK.LITERAL),
    outlierStats:  statCols.filter(s => statBlockMap[s] === BLOCK.OUTLIER),
    allSameBase,
    allSameScaled,
  };
}

function detectAllSameLevels(statCols, heroNames, baseMap, scaledMap, statBlockMap, collapsedStats) {
  const allSameBase   = new Set();
  const allSameScaled = new Set();
  statCols.forEach((stat, i) => {
    if (statBlockMap[stat] !== BLOCK.RELATIVE) return;
    if (collapsedStats.has(stat)) return;
    const colIdx     = i + 1;
    const baseVals   = heroNames.map(h => toNumber((baseMap[h]   || [])[colIdx]));
    const scaledVals = heroNames.map(h => toNumber((scaledMap[h] || [])[colIdx]));
    if (new Set(baseVals).size   <= 1) allSameBase.add(stat);
    if (new Set(scaledVals).size <= 1) allSameScaled.add(stat);
  });
  return { allSameBase, allSameScaled };
}