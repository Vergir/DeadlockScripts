const WIKI_URL        = "https://deadlock.wiki/Hero_Attributes_Table";
const LOWER_IS_BETTER = new Set([
  "Reload Time (s)",
  "Reload Delay (s)",
  "Time Between Bursted Bullets (s)",
  "Bullet Gravity Scale",
  "Spin Deceleration",
  "Stamina Cooldown (s)",
]);

const DROP_COLUMNS = new Set([
  "Bonus Attack Range (m)",
  "Sustained DPS",
]);

const SPIRIT_POWER_STAT_NAME = "TechPower";


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
 *   data-base        — base value at Lvl1 (0 boons, 0 SP)
 *   data-level-scale — value added per boon (×35 for Lvl35)
 *   data-spirit-scale — spirit power scaling factor (for notes)
 *
 * Returns { base, scaling, baseParsed, scalingParsed }
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
  const baseRows        = [headers];
  const scaledRows      = [headers];
  const baseParsedRows  = [headers];
  const scaledParsedRows = [headers];

  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
    if (isFirst) { isFirst = false; continue; }

    const rowHtml = rowMatch[0];
    const cells   = extractCells(rowHtml);
    if (cells.length === 0) continue;

    const baseRow        = [cells[0].heroName];
    const scaledRow      = [cells[0].heroName];
    const baseParsedRow  = [cells[0].heroName];
    const scaledParsedRow = [cells[0].heroName];

    const spHeaderIdx = headers.indexOf("Spirit Power");

    cells.slice(1).forEach((cell, i) => {
      baseRow.push(cell.baseValue);
      scaledRow.push(cell.scaledValue);
      baseParsedRow.push({
        spiritScalings: cell.spiritScale !== 0 ? [`x${cell.spiritScale}`] : []
      });
      scaledParsedRow.push({
        spiritScalings: cell.spiritScale !== 0 ? [`x${cell.spiritScale}`] : []
      });
    });

    baseRows.push(baseRow);
    scaledRows.push(scaledRow);
    baseParsedRows.push(baseParsedRow);
    scaledParsedRows.push(scaledParsedRow);
  }

  if (baseRows.length < 2) {
    console.log("No data rows found.");
    return null;
  }

  return {
    base:         dropColumns(baseRows),
    scaled:       dropColumns(scaledRows),
    baseParsed:   dropColumnsParsed(baseParsedRows,  baseRows[0]),
    scaledParsed: dropColumnsParsed(scaledParsedRows, baseRows[0]),
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

    const base              = parseFloat(baseAttr)              || 0;
    const levelScale        = parseFloat(levelScaleAttr)        || 0;
    const spiritScale       = parseFloat(spiritScaleAttr)       || 0;
    const innateSpiritScale = parseFloat(innateSpiritScaleAttr) || 0;

    const isSpiritPower       = statName === SPIRIT_POWER_STAT_NAME;
    const effectiveLevelScale = isSpiritPower ? innateSpiritScale : levelScale;
    const innateScaledSP      = isSpiritPower ? 0 : innateSpiritScale * 35;

    const scaledRaw   = base + effectiveLevelScale * 35 + spiritScale * innateScaledSP;
    const scaledValue = parseFloat(scaledRaw.toFixed(4)).toString();

    cells.push({
      baseValue:   String(base),
      scaledValue,
      spiritScale: isSpiritPower ? 0 : spiritScale,
    });
  }

  return cells;
}

function parseDataAttr(html, attr, fallback) {
  const match = html.match(new RegExp(`${attr}="([^"]+)"`));
  return match ? match[1] : fallback;
}

function dropColumnsParsed(parsedTable, headers) {
  const keepIdx = headers.map((h, i) => DROP_COLUMNS.has(h) ? -1 : i).filter(i => i !== -1);
  return parsedTable.map(row => {
    if (typeof row[0] === "string") {
      return keepIdx.map(i => row[i] || { spiritScalings: [] });
    }
    return keepIdx.map(i => row[i] || "");
  });
}

function dropColumns(table) {
  if (table.length === 0) return table;
  const headers = table[0];
  const keepIdx = headers.map((h, i) => DROP_COLUMNS.has(h) ? -1 : i).filter(i => i !== -1);
  return table.map(row => keepIdx.map(i => row[i] || ""));
}

function buildHeroData(parsed) {
  const { base: filteredBase, scaled: filteredScaled, baseParsed, scaledParsed } = parsed;
  const baseHeaders = filteredBase[0];
  return {
    baseMap:         buildHeroMap(filteredBase),
    scaledMap:       buildHeroMap(filteredScaled),
    baseHeaders,
    baseParsedMap:   buildHeroParsedMap(baseParsed),
    scaledParsedMap: buildHeroParsedMap(scaledParsed),
    heroNames:       filteredBase.slice(1).map(r => r[0]).filter(Boolean),
    statCols:        baseHeaders.slice(1),
  };
}

function buildHeroMap(table) {
  const map = {};
  table.slice(1).forEach(row => {
    const name = (row[0] || "").trim();
    if (name) map[name] = row;
  });
  return map;
}

function buildHeroParsedMap(parsedTable) {
  const map = {};
  parsedTable.slice(1).forEach(row => {
    const name = (row[0] || "").trim();
    if (name) map[name] = row;
  });
  return map;
}

function stripHtml(str) {
  return str
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g,  "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g,   "<")
    .replace(/&gt;/g,   ">")
    .replace(/\s+/g,    " ")
    .trim();
}

function cleanValue(val) {
  if (val === undefined || val === null) return "0";
  const lower = String(val).toLowerCase();
  if (lower === "true" || lower === "false") return lower;
  const n = parseFloat(val);
  if (isNaN(n)) return "0";
  return String(n);
}

function toNumber(val) {
  if (val === undefined || val === null) return 0;
  const n = parseFloat(String(val));
  return isNaN(n) ? 0 : n;
}

function columnToLetter(col) {
  let letter = "";
  while (col > 0) {
    const remainder = (col - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    col = Math.floor((col - 1) / 26);
  }
  return letter;
}