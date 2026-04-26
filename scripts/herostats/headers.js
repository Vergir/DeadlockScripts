
function displayName(stat) {
  return DISPLAY_NAMES[stat] || stat;
}

function abbrWithLevel(stat, level) {
  return `${level}|${ABBREVIATIONS[stat] || stat}`;
}

function abbrNoLevel(stat) {
  return ABBREVIATIONS[stat] || stat;
}

function fullNote(stat, level) {
  return `${displayName(stat)} at level ${level}`;
}

function fullNoteNoLevel(stat) {
  return displayName(stat);
}

function buildHeaders(relativeStats, literalStats, outlierStats, rawStats,
                      collapsedStats, allSameBase, allSameScaled) {
  const relativeHeaders = [];
  const literalHeaders  = [];
  const outlierHeaders  = [];
  const rawHeaders      = [];

  relativeStats.forEach(stat => {
    const dn = displayName(stat);
    if (collapsedStats.has(stat)) {
      relativeHeaders.push({
        label: abbrNoLevel(stat), note: fullNoteNoLevel(stat),
        fullName: `${dn} (Collapsed) %`, collapsed: true, stat,
      });
    } else {
      if (!allSameBase.has(stat))
        relativeHeaders.push({ label: abbrWithLevel(stat, 1),  note: fullNote(stat, 1),  fullName: `${dn} (Lvl1) %`,  collapsed: false, stat });
      if (!allSameScaled.has(stat))
        relativeHeaders.push({ label: abbrWithLevel(stat, 35), note: fullNote(stat, 35), fullName: `${dn} (Lvl35) %`, collapsed: false, stat });
    }
  });

  literalStats.forEach(stat => {
    const dn = displayName(stat);
    if (collapsedStats.has(stat)) {
      literalHeaders.push({ label: abbrNoLevel(stat), note: fullNoteNoLevel(stat), fullName: `${dn} (Collapsed)`, collapsed: true, stat });
    } else {
      literalHeaders.push({ label: abbrWithLevel(stat, 1),  note: fullNote(stat, 1),  fullName: `${dn} (Lvl1)`,  collapsed: false, stat });
      literalHeaders.push({ label: abbrWithLevel(stat, 35), note: fullNote(stat, 35), fullName: `${dn} (Lvl35)`, collapsed: false, stat });
    }
  });

  outlierStats.forEach(stat => {
    const dn = displayName(stat);
    if (collapsedStats.has(stat)) {
      outlierHeaders.push({ label: abbrNoLevel(stat), note: fullNoteNoLevel(stat), fullName: `${dn} (Collapsed)`, collapsed: true, stat });
    } else {
      outlierHeaders.push({ label: abbrWithLevel(stat, 1),  note: fullNote(stat, 1),  fullName: `${dn} (Lvl1)`,  collapsed: false, stat });
      outlierHeaders.push({ label: abbrWithLevel(stat, 35), note: fullNote(stat, 35), fullName: `${dn} (Lvl35)`, collapsed: false, stat });
    }
  });

  rawStats.forEach(stat => {
    const dn = displayName(stat);
    if (collapsedStats.has(stat)) {
      rawHeaders.push(`${dn} (Collapsed)`);
    } else {
      rawHeaders.push(`${dn} (Lvl1)`);
      rawHeaders.push(`${dn} (Lvl35)`);
    }
  });

  const outputHeaderLabels = [
    "Hero",
    ...relativeHeaders.map(h => h.label),
    ...literalHeaders.map(h => h.label),
    ...outlierHeaders.map(h => h.label),
    "",
    ...rawHeaders,
  ];

  const outputHeaderFullNames = [
    "Hero",
    ...relativeHeaders.map(h => h.fullName),
    ...literalHeaders.map(h => h.fullName),
    ...outlierHeaders.map(h => h.fullName),
    "",
    ...rawHeaders,
  ];

  return {
    relativeHeaders, literalHeaders, outlierHeaders, rawHeaders,
    outputHeaderLabels, outputHeaderFullNames,
  };
}