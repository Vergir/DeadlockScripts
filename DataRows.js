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

  function recordSpiritNote(fullColName, hero, note) {
    if (!spiritNoteMap[fullColName]) spiritNoteMap[fullColName] = {};
    spiritNoteMap[fullColName][hero] = note;
  }

  const dataRows = heroNames.map(hero => {
    const baseRow      = baseMap[hero]        || [];
    const scaledRow    = scaledMap[hero]       || [];
    const baseParsed   = baseParsedMap[hero]   || [];
    const scaledParsed = scaledParsedMap[hero] || [];
    const actualSP     = spiritPowerMap[hero]  || 0;
    const row          = [hero];

    // Relative comparison placeholders — filled in by Formatting.gs
    relativeHeaders.forEach(() => row.push(""));

    // Literal comparison raw values
    literalStats.forEach(stat => {
      const colIdx = baseHeaders.indexOf(stat);
      if (collapsedStats.has(stat)) {
        const note = getSpiritNote(baseParsed[colIdx], false, actualSP);
        recordSpiritNote(`${stat} (Collapsed)`, hero, note);
        row.push(cleanValue(baseRow[colIdx] || ""));
      } else {
        const note1  = getSpiritNote(baseParsed[colIdx],  false, actualSP);
        const note35 = getLvl35SpiritNote(baseParsed, scaledParsed, colIdx, actualSP);
        recordSpiritNote(`${stat} (Lvl1)`,  hero, note1);
        recordSpiritNote(`${stat} (Lvl35)`, hero, note35);
        row.push(cleanValue(baseRow[colIdx]   || ""));
        row.push(cleanValue(scaledRow[colIdx] || ""));
      }
    });

    // Outlier raw values
    outlierStats.forEach(stat => {
      const colIdx = baseHeaders.indexOf(stat);
      if (collapsedStats.has(stat)) {
        const note = getSpiritNote(baseParsed[colIdx], false, actualSP);
        recordSpiritNote(`${stat} (Collapsed)`, hero, note);
        row.push(cleanValue(baseRow[colIdx] || ""));
      } else {
        const note1  = getSpiritNote(baseParsed[colIdx],  false, actualSP);
        const note35 = getLvl35SpiritNote(baseParsed, scaledParsed, colIdx, actualSP);
        recordSpiritNote(`${stat} (Lvl1)`,  hero, note1);
        recordSpiritNote(`${stat} (Lvl35)`, hero, note35);
        row.push(cleanValue(baseRow[colIdx]   || ""));
        row.push(cleanValue(scaledRow[colIdx] || ""));
      }
    });

    // Spacer column before raw block
    row.push("");

    // Raw backing values for Relative columns
    relativeStats.forEach(stat => {
      const colIdx = baseHeaders.indexOf(stat);
      if (collapsedStats.has(stat)) {
        const note = getSpiritNote(baseParsed[colIdx], false, actualSP);
        recordSpiritNote(`${stat} (Collapsed)`, hero, note);
        row.push(cleanValue(baseRow[colIdx] || ""));
      } else {
        const note1  = getSpiritNote(baseParsed[colIdx],  false, actualSP);
        const note35 = getLvl35SpiritNote(baseParsed, scaledParsed, colIdx, actualSP);
        recordSpiritNote(`${stat} (Lvl1)`,  hero, note1);
        recordSpiritNote(`${stat} (Lvl35)`, hero, note35);
        row.push(cleanValue(baseRow[colIdx]   || ""));
        row.push(cleanValue(scaledRow[colIdx] || ""));
      }
    });

    return row;
  });

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