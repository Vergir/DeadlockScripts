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

  ss.setActiveSheet(heroStatsSheet);
  ss.moveActiveSheet(1);
  ss.setActiveSheet(infoSheet);
  ss.moveActiveSheet(2);
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

function computeMedian(vals) {
  const sorted = [...vals].sort((a, b) => a - b);
  const mid    = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function buildGradientCfRule(range, rawVals, lowerIsBetter) {
  const YELLOW = COLOR_CMP_YELLOW, RED = COLOR_CMP_RED, GREEN = COLOR_CMP_GREEN;
  const median          = computeMedian(rawVals);
  const hasLowerValues  = rawVals.some(v => v < median);
  const hasBiggerValues = rawVals.some(v => v > median);
  const minColor = !hasLowerValues  ? YELLOW : lowerIsBetter ? GREEN : RED;
  const maxColor = !hasBiggerValues ? YELLOW : lowerIsBetter ? RED   : GREEN;
  let rule = SpreadsheetApp.newConditionalFormatRule()
    .setGradientMinpoint(minColor)
    .setGradientMaxpoint(maxColor);
  if (hasLowerValues && hasBiggerValues) {
    rule = rule.setGradientMidpointWithValue(YELLOW, SpreadsheetApp.InterpolationType.PERCENTILE, "50");
  }
  return rule.setRanges([range]).build();
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

  const numHeroes  = heroNames.length;
  const dataStart  = 3;
  const dataEnd    = dataStart + numHeroes - 1;
  const rawColStart = 2 + relativeHeaders.length + literalHeaders.length + outlierHeaders.length;
  const cfRules    = [];

  function getRawVals(h) {
    return heroNames.map(hero => {
      const statColIdx = baseHeaders.indexOf(h.stat);
      const sourceRow  = (!h.collapsed && h.fullName.includes("(Lvl35)"))
        ? scaledMap[hero]
        : baseMap[hero];
      return toNumber((sourceRow || [])[statColIdx]);
    });
  }

  // Must run before applyHeaderRows — auto-resize before the description row is merged
  // prevents merged cell text from inflating the first raw column width.
  applyRawColumnWidths();
  applyHeaderRows();
  applyDataNotes();
  applyRelativeFormulasAndColors();
  applyLiteralColors();
  applyOutlierColors();
  sheet.setConditionalFormatRules(cfRules);
  applyBordersAndFreeze();

  function applyRawColumnWidths() {
    sheet.setColumnWidth(rawColStart, 50);
    if (rawHeaders.length > 0) sheet.autoResizeColumns(rawColStart + 1, rawHeaders.length);
  }

  function applyHeaderRows() {
    const BLOCK_DESCRIPTIONS = {
      relative: "% above/below the average hero. Green = better, red = worse.",
      literal:  "Raw stat. Green = best in class, red = worst.",
      outlier:  "Blue = differs from the majority.",
      raw:      "Raw data used to calculate % columns",
    };
    const relStart = 2;
    const litStart = relStart + relativeHeaders.length;
    const outStart = litStart + literalHeaders.length;
    const rawStart = outStart + outlierHeaders.length + 1;

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
      const hasNext = descBlocks.slice(i + 1).some(b => b.len > 0);
      if (hasNext) {
        r.setBorder(null, null, null, true, null, null, "#000000", SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
      }
    });

    const heroCell = sheet.getRange(1, 1, 2, 1);
    heroCell.merge();
    heroCell.setValue("Hero");
    heroCell.setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle");

    sheet.getRange(2, 1, 1, rawColStart).setFontWeight("bold");
    sheet.getRange(2, 1, 1, outputHeaderLabels.length).setHorizontalAlignment("center");

    [...relativeHeaders, ...literalHeaders, ...outlierHeaders].forEach(h => {
      const colIdx = outputHeaderFullNames.indexOf(h.fullName);
      if (colIdx === -1) return;
      const category = getStatCategory(h.stat);
      if (category) sheet.getRange(2, colIdx + 1).setBackground(HEADER_COLORS[category]);
      sheet.getRange(2, colIdx + 1).setNote(h.note);
    });
  }

  function applyDataNotes() {
    Object.entries(spiritNoteMap).forEach(([fullColName, heroNoteMap]) => {
      const colIdx = outputHeaderFullNames.indexOf(fullColName);
      if (colIdx === -1) return;
      heroNames.forEach((hero, r) => {
        const note = heroNoteMap[hero];
        if (note) sheet.getRange(dataStart + r, colIdx + 1).setNote(note);
      });
    });

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
  }

  function applyRelativeFormulasAndColors() {
    relativeHeaders.forEach(h => {
      const relColIdx    = outputHeaderFullNames.indexOf(h.fullName);
      const dataFullName = h.fullName.replace(/ %$/, "");
      const dataColIdx   = outputHeaderFullNames.indexOf(dataFullName);
      if (relColIdx === -1 || dataColIdx === -1) return;

      const relColLetter  = columnToLetter(relColIdx  + 1);
      const dataColLetter = columnToLetter(dataColIdx + 1);
      const dataRange     = `$${dataColLetter}$${dataStart}:$${dataColLetter}$${dataEnd}`;
      const baseExpr      = `IF(MEDIAN(${dataRange})=0,AVERAGE(${dataRange}),MEDIAN(${dataRange}))`;

      const formulas = heroNames.map((_, r) => {
        const cellRef = `${dataColLetter}${dataStart + r}`;
        return [`=(${cellRef}-${baseExpr})/${baseExpr}`];
      });
      sheet.getRange(dataStart, relColIdx + 1, numHeroes, 1).setFormulas(formulas);

      const relRange = sheet.getRange(dataStart, relColIdx + 1, numHeroes, 1);
      cfRules.push(buildGradientCfRule(relRange, getRawVals(h), LOWER_IS_BETTER.has(h.stat)));
    });

    if (relativeHeaders.length > 0) {
      sheet.getRange(dataStart, 2, numHeroes, relativeHeaders.length)
           .setNumberFormat("+0%;-0%;0%");
    }
  }

  function applyLiteralColors() {
    literalHeaders.forEach(h => {
      const colIdx = outputHeaderFullNames.indexOf(h.fullName);
      if (colIdx === -1) return;
      const literalRange = sheet.getRange(dataStart, colIdx + 1, numHeroes, 1);
      cfRules.push(buildGradientCfRule(literalRange, getRawVals(h), LOWER_IS_BETTER.has(h.stat)));
    });
  }

  function applyOutlierColors() {
    outlierHeaders.forEach(h => {
      const colIdx = outputHeaderFullNames.indexOf(h.fullName);
      if (colIdx === -1) return;

      const range   = sheet.getRange(dataStart, colIdx + 1, numHeroes, 1);
      const rawVals = getRawVals(h);
      const median  = computeMedian(rawVals);

      // Detect boolean columns (cells show "+"/"-" instead of numbers)
      const statColIdx = baseHeaders.indexOf(h.stat);
      const sampleVal  = cleanValue((baseMap[heroNames[0]] || [])[statColIdx] || "");
      const isBoolean  = sampleVal === "+" || sampleVal === "-";

      const yellowRule = isBoolean
        ? SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("-").setBackground(COLOR_CMP_YELLOW)
        : SpreadsheetApp.newConditionalFormatRule().whenNumberEqualTo(median).setBackground(COLOR_CMP_YELLOW);

      const blueRule = SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied("=TRUE")
        .setBackground(COLOR_CMP_BLUE);

      // Yellow has higher priority (pushed first), blue is the fallback
      cfRules.push(yellowRule.setRanges([range]).build());
      cfRules.push(blueRule.setRanges([range]).build());
    });
  }

  function applyBordersAndFreeze() {
    [
      1 + relativeHeaders.length,
      1 + relativeHeaders.length + literalHeaders.length,
      1 + relativeHeaders.length + literalHeaders.length + outlierHeaders.length,
    ].forEach(boundaryCol => {
      if (boundaryCol >= outputHeaderLabels.length) return;
      sheet.getRange(1, boundaryCol, numHeroes + 2, 1)
           .setBorder(null, null, null, true, null, null, "#000000", SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
    });

    sheet.autoResizeColumn(1);
    sheet.setColumnWidths(2, relativeHeaders.length, 50);
    sheet.setColumnWidths(2 + relativeHeaders.length, literalHeaders.length + outlierHeaders.length, 40);

    sheet.setFrozenRows(2);
    sheet.setFrozenColumns(1);
  }
}
