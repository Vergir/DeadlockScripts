const ABBREVIATIONS = {
  "DPS":                                  "DPS",
  "Bullet Damage":                        "BD",
  "Bullets per sec":                      "BPS",
  "Fire Rate (%)":                        "FR",
  "Ammo":                                 "AMO",
  "Reload Time (s)":                      "RT",
  "Reload Delay (s)":                     "RD",
  "Bullets Per Shot":                     "BPSH",
  "Bullets Per Burst":                    "BPB",
  "Time Between Bursted Bullets (s)":     "TBB",
  "Light Melee":                          "LM",
  "Heavy Melee":                          "HM",
  "Reload Single":                        "RS",
  "Bullet Velocity (m/s)":               "BV",
  "Bullet Gravity Scale":                 "BGS",
  "Falloff Start Range":                  "FSR",
  "Falloff End Range":                    "FER",
  "Crit Bonus Scale":                     "CBS",
  "Rounds Per Second At Max Spin":        "RPS",
  "Spin Acceleration":                    "SA",
  "Spin Deceleration":                    "SD",
  "Max Health":                           "HP",
  "Health Regen":                         "HR",
  "Bullet Resist (%)":                    "BR",
  "Spirit Resist (%)":                    "SR",
  "Melee Resist (%)":                     "MR",
  "Bullet Lifesteal (%)":                 "BLS",
  "Crit Reduction":                       "CR",
  "Move Speed (m/s)":                     "MS",
  "Sprint Speed (m)":                     "SS",
  "Stamina Cooldown (s)":                 "SCD",
  "Stamina":                              "STA",
  "Dash Speed (m)":                       "DS",
  "Spirit Power":                         "SP",
};

function abbrWithLevel(stat, level) {
  return `${level}|${ABBREVIATIONS[stat] || stat}`;
}

function abbrNoLevel(stat) {
  return ABBREVIATIONS[stat] || stat;
}

function fullNote(stat, level) {
  return `${stat} at level ${level}`;
}

function fullNoteNoLevel(stat) {
  return stat;
}

function buildHeaders(relativeStats, literalStats, outlierStats, rawStats,
                      collapsedStats, allSameBase, allSameScaled) {
  const relativeHeaders = [];
  const literalHeaders  = [];
  const outlierHeaders  = [];
  const rawHeaders      = [];

  relativeStats.forEach(stat => {
    if (collapsedStats.has(stat)) {
      relativeHeaders.push({
        label: abbrNoLevel(stat), note: fullNoteNoLevel(stat),
        fullName: `${stat} (Collapsed) %`, collapsed: true, stat,
      });
    } else {
      if (!allSameBase.has(stat))
        relativeHeaders.push({ label: abbrWithLevel(stat, 1),  note: fullNote(stat, 1),  fullName: `${stat} (Lvl1) %`,  collapsed: false, stat });
      if (!allSameScaled.has(stat))
        relativeHeaders.push({ label: abbrWithLevel(stat, 35), note: fullNote(stat, 35), fullName: `${stat} (Lvl35) %`, collapsed: false, stat });
    }
  });

  literalStats.forEach(stat => {
    if (collapsedStats.has(stat)) {
      literalHeaders.push({ label: abbrNoLevel(stat), note: fullNoteNoLevel(stat), fullName: `${stat} (Collapsed)`, collapsed: true, stat });
    } else {
      literalHeaders.push({ label: abbrWithLevel(stat, 1),  note: fullNote(stat, 1),  fullName: `${stat} (Lvl1)`,  collapsed: false, stat });
      literalHeaders.push({ label: abbrWithLevel(stat, 35), note: fullNote(stat, 35), fullName: `${stat} (Lvl35)`, collapsed: false, stat });
    }
  });

  outlierStats.forEach(stat => {
    if (collapsedStats.has(stat)) {
      outlierHeaders.push({ label: abbrNoLevel(stat), note: fullNoteNoLevel(stat), fullName: `${stat} (Collapsed)`, collapsed: true, stat });
    } else {
      outlierHeaders.push({ label: abbrWithLevel(stat, 1),  note: fullNote(stat, 1),  fullName: `${stat} (Lvl1)`,  collapsed: false, stat });
      outlierHeaders.push({ label: abbrWithLevel(stat, 35), note: fullNote(stat, 35), fullName: `${stat} (Lvl35)`, collapsed: false, stat });
    }
  });

  rawStats.forEach(stat => {
    if (collapsedStats.has(stat)) {
      rawHeaders.push(`${stat} (Collapsed)`);
    } else {
      rawHeaders.push(`${stat} (Lvl1)`);
      rawHeaders.push(`${stat} (Lvl35)`);
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