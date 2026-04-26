function fetchAndParseTables() {
  const html = UrlFetchApp.fetch(WIKI_URL, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; GoogleAppsScript)" }
  }).getContentText();

  const parsed = parseTableFromHtml(html);
  if (!parsed) {
    console.log("Failed to parse table from HTML.");
    return null;
  }
  return parsed;
}

/**
 * Parses the single hero attributes table from the wiki HTML.
 * Each <td> has data attributes:
 *   data-base             — base value at Lvl1 (0 boons, 0 SP)
 *   data-level-scale      — value added per boon (×35 for Lvl35)
 *   data-spirit-scale     — spirit power scaling factor (for notes)
 *
 * Returns { base, scaled, baseParsed, scaledParsed }
 */
function parseTableFromHtml(html) {
  const tableMatch = html.match(/<table[\s\S]*?<\/table>/i);
  if (!tableMatch) {
    console.log("No table found in HTML.");
    return null;
  }
  const tableHtml = tableMatch[0];

  const headerRowMatch = tableHtml.match(/<tr[\s\S]*?<\/tr>/i);
  if (!headerRowMatch) return null;
  const headers = extractHeaders(headerRowMatch[0]);

  const rowRegex = /<tr[\s\S]*?<\/tr>/gi;
  let rowMatch;
  let isFirst = true;
  const baseRows   = [headers];
  const scaledRows = [headers];
  const parsedRows = [headers];

  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
    if (isFirst) { isFirst = false; continue; }

    const cells = extractCells(rowMatch[0]);
    if (cells.length === 0) continue;

    const baseRow   = [cells[0].heroName];
    const scaledRow = [cells[0].heroName];
    const parsedRow = [cells[0].heroName];

    cells.slice(1).forEach(cell => {
      baseRow.push(cell.baseValue);
      scaledRow.push(cell.scaledValue);
      parsedRow.push({ spiritScalings: cell.spiritScale !== 0 ? [`x${cell.spiritScale}`] : [] });
    });

    baseRows.push(baseRow);
    scaledRows.push(scaledRow);
    parsedRows.push(parsedRow);
  }

  if (baseRows.length < 2) {
    console.log("No data rows found.");
    return null;
  }

  const parsedDropped = dropColumns(parsedRows, { spiritScalings: [] });
  return {
    base:         dropColumns(baseRows),
    scaled:       dropColumns(scaledRows),
    baseParsed:   parsedDropped,
    scaledParsed: parsedDropped,
  };
}

function extractHeaders(rowHtml) {
  const headers = [];
  const thRegex = /<th[\s\S]*?<\/th>/gi;
  let thMatch;
  while ((thMatch = thRegex.exec(rowHtml)) !== null) {
    headers.push(stripHtml(thMatch[0]));
  }
  return headers;
}

function extractCells(rowHtml) {
  const cells   = [];
  const tdRegex = /<td[\s\S]*?<\/td>/gi;
  let tdMatch;
  let isFirst   = true;

  while ((tdMatch = tdRegex.exec(rowHtml)) !== null) {
    const tdHtml = tdMatch[0];

    if (isFirst) {
      const nameMatch = tdHtml.match(/title="([^"]+)"/);
      const heroName  = nameMatch ? nameMatch[1].replace(/&amp;/g, "&") : stripHtml(tdHtml);
      cells.push({ heroName });
      isFirst = false;
      continue;
    }

    const statName              = parseDataAttr(tdHtml, "data-stat-name",          "");
    const baseAttr              = parseDataAttr(tdHtml, "data-base",                "0");
    const levelScaleAttr        = parseDataAttr(tdHtml, "data-level-scale",         "0");
    const spiritScaleAttr       = parseDataAttr(tdHtml, "data-spirit-scale",        "0");
    const innateSpiritScaleAttr = parseDataAttr(tdHtml, "data-innate-spirit-scale", "0");

    const isBooleanStat = baseAttr === "true" || baseAttr === "false";
    let baseValue, scaledValue, effectiveSpiritScale;

    if (isBooleanStat) {
      baseValue          = baseAttr;
      scaledValue        = baseAttr;
      effectiveSpiritScale = 0;
    } else {
      const base              = parseFloat(baseAttr)              || 0;
      const levelScale        = parseFloat(levelScaleAttr)        || 0;
      const spiritScale       = parseFloat(spiritScaleAttr)       || 0;
      const innateSpiritScale = parseFloat(innateSpiritScaleAttr) || 0;

      const isSpiritPower       = statName === SPIRIT_POWER_STAT_NAME;
      const effectiveLevelScale = isSpiritPower ? innateSpiritScale : levelScale;
      const innateScaledSP      = isSpiritPower ? 0 : innateSpiritScale * 35;

      const scaledRaw      = base + effectiveLevelScale * 35 + spiritScale * innateScaledSP;
      baseValue            = String(base);
      scaledValue          = parseFloat(scaledRaw.toFixed(4)).toString();
      effectiveSpiritScale = isSpiritPower ? 0 : spiritScale;
    }

    cells.push({
      baseValue,
      scaledValue,
      spiritScale: effectiveSpiritScale,
    });
  }

  return cells;
}

function parseDataAttr(html, attr, fallback) {
  const match = html.match(new RegExp(`${attr}="([^"]+)"`));
  return match ? match[1] : fallback;
}

function dropColumns(table, fallback = "") {
  if (table.length === 0) return table;
  const headers = table[0];
  const keepIdx = headers.map((h, i) => DROP_COLUMNS.has(h) ? -1 : i).filter(i => i !== -1);
  return table.map(row => keepIdx.map(i => row[i] ?? fallback));
}

function buildHeroData(parsed) {
  const { base: filteredBase, scaled: filteredScaled, baseParsed, scaledParsed } = parsed;
  const baseHeaders = filteredBase[0];
  const baseMap     = buildHeroMap(filteredBase);
  const scaledMap   = buildHeroMap(filteredScaled);

  applyReloadSingleCalc(baseHeaders, baseMap, scaledMap);

  return {
    baseMap,
    scaledMap,
    baseHeaders,
    baseParsedMap:   buildHeroMap(baseParsed),
    scaledParsedMap: buildHeroMap(scaledParsed),
    heroNames:       filteredBase.slice(1).map(r => r[0]).filter(Boolean),
    statCols:        baseHeaders.slice(1),
  };
}

function applyReloadSingleCalc(headers, baseMap, scaledMap) {
  const reloadSingleIdx = headers.indexOf("Reload Single");
  const reloadTimeIdx   = headers.indexOf("Reload Time (s)");
  const reloadDelayIdx  = headers.indexOf("Reload Delay (s)");
  const ammoIdx         = headers.indexOf("Ammo");

  if ([reloadSingleIdx, reloadTimeIdx, reloadDelayIdx, ammoIdx].some(i => i === -1)) return;

  Object.keys(baseMap).forEach(hero => {
    if ((baseMap[hero][reloadSingleIdx] || "").toLowerCase() !== "true") return;

    for (const map of [baseMap, scaledMap]) {
      const row         = map[hero];
      const wikiRT      = toNumber(row[reloadTimeIdx]  || "0");
      const reloadDelay = toNumber(row[reloadDelayIdx] || "0");
      const ammo        = toNumber(row[ammoIdx]        || "0");
      row[reloadTimeIdx] = String(parseFloat((reloadDelay + wikiRT * ammo).toFixed(4)));
    }
  });
}

function buildHeroMap(table) {
  const map = {};
  table.slice(1).forEach(row => {
    const name = (row[0] || "").trim();
    if (name) map[name] = row;
  });
  return map;
}
