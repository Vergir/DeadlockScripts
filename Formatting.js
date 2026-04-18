function writeInfoSheet(ss, heroStatsSheet) {
  const INFO_SHEET_NAME = "Info";
  let infoSheet = ss.getSheetByName(INFO_SHEET_NAME);
  if (!infoSheet) infoSheet = ss.insertSheet(INFO_SHEET_NAME);
  infoSheet.clearContents();
  infoSheet.clearFormats();
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  const heroStatsUrl = `https://docs.google.com/spreadsheets/d/${ss.getId()}/edit#gid=${heroStatsSheet.getSheetId()}`;

  infoSheet.getRange(1, 1)
    .setRichTextValue(SpreadsheetApp.newRichTextValue().setText("Hero Stats").setLinkUrl(heroStatsUrl).build())
    .setFontWeight("bold");
  infoSheet.getRange(2, 1).setValue(`Last updated ${today}`);

  const wikiText = "Data from Deadlock Wiki";
  infoSheet.getRange(3, 1).setRichTextValue(
    SpreadsheetApp.newRichTextValue().setText(wikiText)
      .setLinkUrl("Data from ".length, wikiText.length, WIKI_URL).build()
  );

  const githubText = "Code on Github";
  infoSheet.getRange(4, 1).setRichTextValue(
    SpreadsheetApp.newRichTextValue().setText(githubText)
      .setLinkUrl("Code on ".length, githubText.length, "https://github.com/Vergir/DeadlockScripts").build()
  );
  infoSheet.autoResizeColumn(1);
}

function writeHeroStatsSheet(sheet, allRows, heroNames, baseHeaders, baseMap, scaledMap,
                              relativeHeaders, literalHeaders, outlierHeaders, rawHeaders,
                              outputHeaderLabels, outputHeaderFullNames, spiritNoteMap) {
  sheet.clearContents();
  sheet.clearConditionalFormatRules();
  sheet.clearNotes();
  sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns())
       .setBackground(null).setFontColor(null).setFontStyle("normal").setFontWeight("normal")
       .setBorder(false, false, false, false, false, false)
       .breakApart();
  sheet.showColumns(1, sheet.getMaxColumns());
  sheet.getRange(1, 1, allRows.length, allRows[0].length).setValues(allRows);

  const usedCols = allRows[0].length;
  if (sheet.getMaxColumns() > usedCols) sheet.deleteColumns(usedCols + 1, sheet.getMaxColumns() - usedCols);

  applyFormatting(sheet, heroNames, baseHeaders, baseMap, scaledMap,
    relativeHeaders, literalHeaders, outlierHeaders, rawHeaders,
    outputHeaderLabels, outputHeaderFullNames, spiritNoteMap);

  const totalUsedRows = allRows.length;
  if (sheet.getMaxRows() > totalUsedRows) sheet.deleteRows(totalUsedRows + 1, sheet.getMaxRows() - totalUsedRows);
}

// Weapon stats: everything before Max Health
const WEAPON_STATS = new Set([
  "DPS", "Bullet Damage", "Bullets per sec", "Fire Rate (%)",
  "Ammo", "Reload Time (s)", "Reload Delay (s)", "Bullets Per Shot", "Bullets Per Burst",
  "Time Between Bursted Bullets (s)", "Light Melee", "Heavy Melee", "Reload Single",
  "Bullet Velocity (m/s)", "Bullet Gravity Scale", "Falloff Start Range", "Falloff End Range",
  "Crit Bonus Scale", "Rounds Per Second At Max Spin", "Spin Acceleration", "Spin Deceleration",
]);

// Vitality stats: Max Health through Dash Speed
const VITALITY_STATS = new Set([
  "Max Health", "Health Regen", "Bullet Resist (%)", "Spirit Resist (%)", "Melee Resist (%)",
  "Bullet Lifesteal (%)", "Crit Reduction",
  "Move Speed (m/s)", "Sprint Speed (m)", "Stamina Cooldown (s)", "Stamina", "Dash Speed (m)",
]);

// Spirit stats: Spirit Power only
const SPIRIT_STATS = new Set([
  "Spirit Power",
]);

const HEADER_COLORS = {
  weapon:   "#E4B20C",
  vitality: "#A5CE3D",
  spirit:   "#B868DE",
};

const OUTLIER_BLUE = "#6FA8DC";

function computeMedian(vals) {
  const sorted = [...vals].sort((a, b) => a - b);
  const mid    = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function getStatCategory(stat) {
  if (SPIRIT_STATS.has(stat))   return "spirit";
  if (VITALITY_STATS.has(stat)) return "vitality";
  if (WEAPON_STATS.has(stat))   return "weapon";
  return null;
}

function applyFormatting(sheet, heroNames, baseHeaders, baseMap, scaledMap,
                         relativeHeaders, literalHeaders, outlierHeaders, rawHeaders,
                         outputHeaderLabels, outputHeaderFullNames, spiritNoteMap) {

  const numHeroes = heroNames.length;
  const dataStart = 3;
  const dataEnd   = dataStart + numHeroes - 1;
  const cfRules   = [];

  // ── Raw column widths (must precede description row merge) ───────────────
  // rawColStart is the spacer column; raw data starts at rawColStart + 1.
  // autoResizeColumns must run before the description row is merged, otherwise
  // the merged cell text inflates the first raw column width.
  const rawColStart = 2 + relativeHeaders.length + literalHeaders.length + outlierHeaders.length;
  sheet.setColumnWidth(rawColStart, 50);
  if (rawHeaders.length > 0) sheet.autoResizeColumns(rawColStart + 1, rawHeaders.length);

  // ── Description row (row 1) ──────────────────────────────────────────────
  const BLOCK_DESCRIPTIONS = {
    relative: "% above/below the average hero. Green = better, red = worse.",
    literal:  "Raw stat. Green = best in class, red = worst.",
    outlier:  "Blue = differs from the majority.",
    raw:      "Raw data used to calculate % columns",
  };
  const relStart     = 2;
  const litStart     = relStart + relativeHeaders.length;
  const outStart     = litStart + literalHeaders.length;
  const rawStart     = outStart + outlierHeaders.length + 1; // +1 to skip spacer column

  const descBlocks = [
    { key: "relative", start: relStart,  len: relativeHeaders.length },
    { key: "literal",  start: litStart,  len: literalHeaders.length  },
    { key: "outlier",  start: outStart,  len: outlierHeaders.length  },
    { key: "raw",      start: rawStart,  len: rawHeaders.length      },
  ];
  descBlocks.forEach(({ key, start, len }, i) => {
    if (len === 0) return;
    const r = sheet.getRange(1, start, 1, len);
    r.merge();
    r.setValue(BLOCK_DESCRIPTIONS[key]);
    r.setFontStyle("italic").setHorizontalAlignment("center");
    // Right border if there's a following block — merged cells need explicit border on the range
    const hasNext = descBlocks.slice(i + 1).some(b => b.len > 0);
    if (hasNext) {
      r.setBorder(null, null, null, true, null, null, "#000000", SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
    }
  });

  // ── Merge rows 1-2 in Hero column ────────────────────────────────────────
  const heroCell = sheet.getRange(1, 1, 2, 1);
  heroCell.merge();
  heroCell.setValue("Hero");
  heroCell.setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle");

  // ── Bold + center header row ─────────────────────────────────────────────
  sheet.getRange(2, 1, 1, rawColStart).setFontWeight("bold");
  sheet.getRange(2, 1, 1, outputHeaderLabels.length).setHorizontalAlignment("center");

  // ── Header color coding ──────────────────────────────────────────────────
  [...relativeHeaders, ...literalHeaders, ...outlierHeaders].forEach(h => {
    const colIdx   = outputHeaderFullNames.indexOf(h.fullName);
    if (colIdx === -1) return;
    const category = getStatCategory(h.stat);
    if (category) sheet.getRange(2, colIdx + 1).setBackground(HEADER_COLORS[category]);
  });


  // ── Header notes for compared columns ────────────────────────────────────
  [...relativeHeaders, ...literalHeaders, ...outlierHeaders].forEach(h => {
    const colIdx = outputHeaderFullNames.indexOf(h.fullName);
    if (colIdx === -1) return;
    sheet.getRange(2, colIdx + 1).setNote(h.note);
  });

  // ── Spirit scaling notes on raw data cells ────────────────────────────────
  Object.entries(spiritNoteMap).forEach(([fullColName, heroNoteMap]) => {
    const colIdx = outputHeaderFullNames.indexOf(fullColName);
    if (colIdx === -1) return;
    heroNames.forEach((hero, r) => {
      const note = heroNoteMap[hero];
      if (note) sheet.getRange(dataStart + r, colIdx + 1).setNote(note);
    });
  });

  // ── Spirit scaling notes on relative cells ────────────────────────────────
  relativeHeaders.forEach(h => {
    const relColIdx    = outputHeaderFullNames.indexOf(h.fullName);
    const dataFullName = h.fullName.replace(/ %$/, "");
    const heroNoteMap  = spiritNoteMap[dataFullName] || {};
    if (relColIdx === -1) return;
    heroNames.forEach((hero, r) => {
      const note = heroNoteMap[hero];
      if (note) sheet.getRange(dataStart + r, relColIdx + 1).setNote(note);
    });
  });

  // ── Relative formulas + color rules ──────────────────────────────────────
  relativeHeaders.forEach(h => {
    const relColIdx    = outputHeaderFullNames.indexOf(h.fullName);
    const dataFullName = h.fullName.replace(/ %$/, "");
    const dataColIdx   = outputHeaderFullNames.indexOf(dataFullName);
    if (relColIdx === -1 || dataColIdx === -1) return;

    const relColLetter  = columnToLetter(relColIdx  + 1);
    const dataColLetter = columnToLetter(dataColIdx + 1);
    const dataRange     = `$${dataColLetter}$${dataStart}:$${dataColLetter}$${dataEnd}`;
    const lowerIsBetter = LOWER_IS_BETTER.has(h.stat);
    const baseExpr      = `IF(MEDIAN(${dataRange})=0,AVERAGE(${dataRange}),MEDIAN(${dataRange}))`;

    const formulas = heroNames.map((_, r) => {
      const cellRef = `${dataColLetter}${dataStart + r}`;
      return [lowerIsBetter
        ? `=(${baseExpr}-${cellRef})/${baseExpr}`
        : `=(${cellRef}-${baseExpr})/${baseExpr}`
      ];
    });
    sheet.getRange(dataStart, relColIdx + 1, numHeroes, 1).setFormulas(formulas);

    const rawVals = heroNames.map(hero => {
      const statColIdx = baseHeaders.indexOf(h.stat);
      const sourceRow  = (!h.collapsed && h.fullName.includes("(Lvl35)"))
        ? scaledMap[hero]
        : baseMap[hero];
      return toNumber((sourceRow || [])[statColIdx]);
    });

    const nonZero    = rawVals.filter(v => v !== 0);
    const median     = computeMedian(rawVals);
    const base       = median !== 0
      ? median
      : nonZero.length > 0
        ? nonZero.reduce((a, b) => a + b, 0) / nonZero.length
        : 1;
    const deviations = rawVals.map(v =>
      lowerIsBetter ? (base - v) / base : (v - base) / base
    );

    const minDev     = Math.min(...deviations);
    const maxDev     = Math.max(...deviations);
    const redBound   = minDev < 0 ? minDev : -maxDev;
    const greenBound = maxDev > 0 ? maxDev : -minDev;

    if (redBound === greenBound) {
      sheet.getRange(dataStart, relColIdx + 1, numHeroes, 1).setBackground("#FFD666");
      return;
    }

    const relRange = sheet.getRange(dataStart, relColIdx + 1, numHeroes, 1);
    cfRules.push(SpreadsheetApp.newConditionalFormatRule()
      .setGradientMinpointWithValue("#E67C73", SpreadsheetApp.InterpolationType.NUMBER, String(redBound))
      .setGradientMidpointWithValue("#FFD666", SpreadsheetApp.InterpolationType.NUMBER, "0")
      .setGradientMaxpointWithValue("#57BB8A", SpreadsheetApp.InterpolationType.NUMBER, String(greenBound))
      .setRanges([relRange])
      .build()
    );
  });

  // Format relative columns as signed percentages
  if (relativeHeaders.length > 0) {
    sheet.getRange(dataStart, 2, numHeroes, relativeHeaders.length)
         .setNumberFormat("+0%;-0%;0%");
  }

  // ── Literal color rules ───────────────────────────────────────────────────
  literalHeaders.forEach(h => {
    const colIdx = outputHeaderFullNames.indexOf(h.fullName);
    if (colIdx === -1) return;

    const lowerIsBetter = LOWER_IS_BETTER.has(h.stat);
    const rawVals       = heroNames.map(hero => {
      const statColIdx = baseHeaders.indexOf(h.stat);
      const sourceRow  = (!h.collapsed && h.fullName.includes("(Lvl35)"))
        ? scaledMap[hero]
        : baseMap[hero];
      return toNumber((sourceRow || [])[statColIdx]);
    });

    const minVal = Math.min(...rawVals);
    const maxVal = Math.max(...rawVals);
    const median = computeMedian(rawVals);

    if (minVal === maxVal) {
      sheet.getRange(dataStart, colIdx + 1, numHeroes, 1).setBackground("#FFD666");
      return;
    }

    const minColor = lowerIsBetter ? "#57BB8A" : "#E67C73";
    const maxColor = lowerIsBetter ? "#E67C73" : "#57BB8A";

    const literalRange = sheet.getRange(dataStart, colIdx + 1, numHeroes, 1);

    if (median === minVal) {
      cfRules.push(SpreadsheetApp.newConditionalFormatRule()
        .setGradientMinpointWithValue("#FFD666", SpreadsheetApp.InterpolationType.NUMBER, String(minVal))
        .setGradientMaxpointWithValue(maxColor,  SpreadsheetApp.InterpolationType.NUMBER, String(maxVal))
        .setRanges([literalRange])
        .build()
      );
    } else if (median === maxVal) {
      cfRules.push(SpreadsheetApp.newConditionalFormatRule()
        .setGradientMinpointWithValue(minColor,  SpreadsheetApp.InterpolationType.NUMBER, String(minVal))
        .setGradientMaxpointWithValue("#FFD666", SpreadsheetApp.InterpolationType.NUMBER, String(maxVal))
        .setRanges([literalRange])
        .build()
      );
    } else {
      cfRules.push(SpreadsheetApp.newConditionalFormatRule()
        .setGradientMinpointWithValue(minColor, SpreadsheetApp.InterpolationType.NUMBER, String(minVal))
        .setGradientMidpointWithValue("#FFD666", SpreadsheetApp.InterpolationType.NUMBER, String(median))
        .setGradientMaxpointWithValue(maxColor,  SpreadsheetApp.InterpolationType.NUMBER, String(maxVal))
        .setRanges([literalRange])
        .build()
      );
    }
  });

  // ── Outlier color rules ───────────────────────────────────────────────────
  outlierHeaders.forEach(h => {
    const colIdx = outputHeaderFullNames.indexOf(h.fullName);
    if (colIdx === -1) return;

    const rawVals = heroNames.map(hero => {
      const statColIdx = baseHeaders.indexOf(h.stat);
      const sourceRow  = (!h.collapsed && h.fullName.includes("(Lvl35)"))
        ? scaledMap[hero]
        : baseMap[hero];
      return toNumber((sourceRow || [])[statColIdx]);
    });

    const median = computeMedian(rawVals);

    heroNames.forEach((hero, r) => {
      const val  = toNumber(rawVals[r]);
      const cell = sheet.getRange(dataStart + r, colIdx + 1);
      cell.setBackground(val === median ? "#FFD666" : OUTLIER_BLUE);
    });
  });

  // ── Apply conditional format rules ───────────────────────────────────────
  sheet.setConditionalFormatRules(cfRules);

  // ── Vertical borders between blocks ─────────────────────────────────────
  [
    1 + relativeHeaders.length,
    1 + relativeHeaders.length + literalHeaders.length,
    1 + relativeHeaders.length + literalHeaders.length + outlierHeaders.length,
  ].forEach(boundaryCol => {
    if (boundaryCol >= outputHeaderLabels.length) return;
    sheet.getRange(1, boundaryCol, numHeroes + 2, 1)
         .setBorder(null, null, null, true, null, null, "#000000", SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  });

  // ── Column widths ────────────────────────────────────────────────────────
  sheet.autoResizeColumn(1);
  sheet.setColumnWidths(2, relativeHeaders.length, 50);
  sheet.setColumnWidths(2 + relativeHeaders.length, literalHeaders.length + outlierHeaders.length, 40);

  // ── Freeze ───────────────────────────────────────────────────────────────
  sheet.setFrozenRows(2);
  sheet.setFrozenColumns(1);

}