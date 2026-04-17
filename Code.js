function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Deadlock')
    .addItem('Fetch Hero Stats', 'fetchHeroStats')
    .addToUi();
}

function fetchHeroStats() {
  const parsed = fetchAndParseTables();
  if (!parsed) return;

  const { heroNames, baseHeaders, baseMap, scaledMap, baseParsedMap, scaledParsedMap, statCols } =
    buildHeroData(parsed);

  const { collapsedStats, relativeStats, literalStats, outlierStats, allSameBase, allSameScaled } =
    classifyStats(statCols, heroNames, baseMap, scaledMap);

  const { relativeHeaders, literalHeaders, outlierHeaders, rawHeaders, outputHeaderLabels, outputHeaderFullNames } =
    buildHeaders(relativeStats, literalStats, outlierStats, relativeStats, collapsedStats, allSameBase, allSameScaled);

  const { dataRows, spiritNoteMap } = buildDataRows(
    heroNames, baseHeaders, baseMap, scaledMap, baseParsedMap, scaledParsedMap,
    relativeHeaders, literalStats, outlierStats, relativeStats, collapsedStats
  );

  const allRows = [new Array(outputHeaderLabels.length).fill(""), outputHeaderLabels, ...dataRows];

  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Hero Stats") || ss.insertSheet("Hero Stats");
  writeInfoSheet(ss, sheet);
  writeHeroStatsSheet(sheet, allRows, heroNames, baseHeaders, baseMap, scaledMap,
    relativeHeaders, literalHeaders, outlierHeaders, rawHeaders,
    outputHeaderLabels, outputHeaderFullNames, spiritNoteMap);

  console.log(
    `Done! ${heroNames.length} heroes, ${statCols.length} stats — ` +
    `${collapsedStats.size} collapsed, ` +
    `${relativeHeaders.length} relative cols, ${literalHeaders.length} literal cols, ` +
    `${outlierHeaders.length} outlier cols, ${rawHeaders.length} raw cols.`
  );
}
