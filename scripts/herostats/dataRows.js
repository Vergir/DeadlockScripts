function getSpiritNote(parsedCell, isLvl35, actualSP) {
  if (!parsedCell || parsedCell.spiritScalings.length === 0) return null;
  const scalingStr = parsedCell.spiritScalings[0];
  if (isLvl35) {
    return `Has ${scalingStr} Spirit Scaling. Assumes ${actualSP} innate Spirit Power.`;
  }
  return `Has ${scalingStr} Spirit Scaling.`;
}

function buildDataRows(heroNames, baseHeaders, baseMap, scaledMap, baseParsedMap, scaledParsedMap,
                       relativeHeaders, literalStats, outlierStats, relativeStats, collapsedStats) {
  const spiritNoteMap = {};

  const spColIdx = baseHeaders.indexOf("Spirit Power");
  const spiritPowerMap = {};
  heroNames.forEach(hero => {
    spiritPowerMap[hero] = toNumber((scaledMap[hero] || [])[spColIdx] || "0");
  });

  function recordNote(fullColName, hero, note) {
    if (!note) return;
    if (!spiritNoteMap[fullColName]) spiritNoteMap[fullColName] = {};
    const existing = spiritNoteMap[fullColName][hero];
    spiritNoteMap[fullColName][hero] = existing ? `${existing}\n${note}` : note;
  }

  function recordNoteForStat(stat, hero, note) {
    const dn = displayName(stat);
    [`${dn} (Collapsed)`, `${dn} (Lvl1)`, `${dn} (Lvl35)`].forEach(key => recordNote(key, hero, note));
  }

  const dataRows = heroNames.map(hero => {
    const baseRow      = baseMap[hero]        || [];
    const scaledRow    = scaledMap[hero]       || [];
    const baseParsed   = baseParsedMap[hero]   || [];
    const scaledParsed = scaledParsedMap[hero] || [];
    const actualSP     = spiritPowerMap[hero]  || 0;
    const row          = [hero];

    function processStats(stats) {
      stats.forEach(stat => {
        const colIdx = baseHeaders.indexOf(stat);
        const dn     = displayName(stat);
        if (collapsedStats.has(stat)) {
          recordNote(`${dn} (Collapsed)`, hero, getSpiritNote(baseParsed[colIdx], false, actualSP));
          row.push(cleanValue(baseRow[colIdx] || ""));
        } else {
          recordNote(`${dn} (Lvl1)`,  hero, getSpiritNote(baseParsed[colIdx], false, actualSP));
          recordNote(`${dn} (Lvl35)`, hero, getLvl35SpiritNote(baseParsed, scaledParsed, colIdx, actualSP));
          row.push(cleanValue(baseRow[colIdx]   || ""));
          row.push(cleanValue(scaledRow[colIdx] || ""));
        }
      });
    }

    relativeHeaders.forEach(() => row.push(""));
    processStats(literalStats);
    processStats(outlierStats);
    row.push("");
    processStats(relativeStats);

    return row;
  });

  const maxSpinColIdx = baseHeaders.indexOf("Rounds Per Second At Max Spin");
  if (maxSpinColIdx !== -1) {
    heroNames.forEach(hero => {
      const maxSpin = toNumber((baseMap[hero] || [])[maxSpinColIdx] || "0");
      if (maxSpin !== 0) recordNoteForStat("DPS", hero, "Assuming max spin");
    });
  }

  const bulletsPerShotColIdx = baseHeaders.indexOf("Bullets Per Shot");
  if (bulletsPerShotColIdx !== -1) {
    heroNames.forEach(hero => {
      const bps = toNumber((baseMap[hero] || [])[bulletsPerShotColIdx] || "1");
      if (bps !== 1) recordNoteForStat("Bullets per sec", hero, `Each shot has ${bps} bullets`);
    });
  }

  const bulletsPerBurstColIdx = baseHeaders.indexOf("Bullets Per Burst");
  if (bulletsPerBurstColIdx !== -1) {
    heroNames.forEach(hero => {
      const bpb = toNumber((baseMap[hero] || [])[bulletsPerBurstColIdx] || "1");
      if (bpb !== 1) recordNoteForStat("Bullets per sec", hero, `Fires in bursts of ${bpb} shots; SPS is averaged over the full burst cycle`);
    });
  }

  const reloadSingleColIdx = baseHeaders.indexOf("Reload Single");
  const ammoColIdx         = baseHeaders.indexOf("Ammo");
  if (reloadSingleColIdx !== -1 && ammoColIdx !== -1) {
    heroNames.forEach(hero => {
      const reloadsSingle = (baseMap[hero] || [])[reloadSingleColIdx];
      if ((reloadsSingle || "").toLowerCase() !== "true") return;
      const ammo = toNumber((baseMap[hero] || [])[ammoColIdx] || "0");
      recordNoteForStat("Reload Time (s)", hero, `Calculated: Reload Delay + (single bullet reload × ${ammo})`);
    });
  }

  return { dataRows, spiritNoteMap };
}

function getLvl35SpiritNote(baseParsed, scaledParsed, colIdx, actualSP) {
  const fromScaled = getSpiritNote(scaledParsed[colIdx], true, actualSP);
  if (fromScaled) return fromScaled;

  const lvl1SpiritScaling = baseParsed[colIdx]?.spiritScalings?.[0];
  if (lvl1SpiritScaling) {
    return `Has ${lvl1SpiritScaling} Spirit Scaling. Assumes ${actualSP} innate Spirit Power.`;
  }

  return null;
}
