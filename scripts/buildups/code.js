const BUILDUP_ITEMS = [
  { name: "Slowing Bullets",    url: "https://deadlock.wiki/Slowing_Bullets"    },
  { name: "Toxic Bullets",      url: "https://deadlock.wiki/Toxic_Bullets"      },
  { name: "Silencer",           url: "https://deadlock.wiki/Silencer"           },
  { name: "Spiritual Overflow", url: "https://deadlock.wiki/Spiritual_Overflow" },
  { name: "Inhibitor",          url: "https://deadlock.wiki/Inhibitor"          },
];

function onOpen_Buildups(menu) {
  menu.addItem('Rebuild Buildups Sheet', 'main_Buildups');
}

function main_Buildups() {
  const bulletsPerSec = fetchBulletsPerSec();

  // { heroName -> { itemName -> percentPerShot } }
  const data = {};
  const heroOrder = [];

  for (const item of BUILDUP_ITEMS) {
    const html = UrlFetchApp.fetch(item.url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; GoogleAppsScript)" }
    }).getContentText();

    const rows = parseBuildupTable(html);
    for (const { hero, pct } of rows) {
      if (!data[hero]) {
        data[hero] = {};
        heroOrder.push(hero);
      }
      data[hero][item.name] = pct;
    }
  }

  heroOrder.sort();

  const itemNames = BUILDUP_ITEMS.map(i => i.name);
  const n = itemNames.length;

  // Layout:
  // Col 1      : Hero
  // Col 2..N+1 : [item] (s)            — time-to-buildup formulas
  // Col N+2    : separator              — empty, 100px wide
  // Col N+3    : Shots per s
  // Col N+4..  : [item] (% per shot)
  const timeColStart = 2;
  const sepCol       = timeColStart + n;   // first col after time cols
  const bpsCol       = sepCol + 1;
  const pctColStart  = bpsCol + 1;
  const totalCols    = pctColStart + n - 1;

  const header = [
    "Hero",
    ...itemNames.map(name => `${name} (s)`),
    "",                                          // separator header
    "Shots per Second",
    ...itemNames.map(name => `${name} (% per shot)`),
  ];

  const sheetRows = heroOrder.map(hero => {
    const bps = bulletsPerSec[hero];
    return [
      hero,
      ...new Array(n).fill(""),                 // time formulas written separately
      "",                                        // separator
      bps != null ? Math.round(bps * 100) / 100 : "",
      ...itemNames.map(item => {
        const v = data[hero][item];
        return v != null ? Math.round(v * 100) / 100 : "";
      }),
    ];
  });

  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("WIP Buildups") || ss.insertSheet("WIP Buildups");
  sheet.clearContents();
  sheet.clearConditionalFormatRules();
  sheet.getRange(1, 1, 1 + sheetRows.length, totalCols)
       .setValues([header, ...sheetRows]);

  // Bold header row
  sheet.getRange(1, 1, 1, totalCols).setFontWeight("bold");

  // Separator column: 100px wide
  sheet.setColumnWidth(sepCol, 100);

  // Time-to-buildup formulas: =ROUND(ROUNDUP(100/<pctCell>,0)/<bpsCell>,2)
  const bpsColLetter = columnToLetter(bpsCol);
  const formulaGrid = heroOrder.map((_, i) => {
    const row = i + 2;
    return itemNames.map((_, j) => {
      const pctColLetter = columnToLetter(pctColStart + j);
      return `=ROUND(ROUNDUP(100/${pctColLetter}${row},0)/${bpsColLetter}${row},2)`;
    });
  });
  sheet.getRange(2, timeColStart, heroOrder.length, n).setFormulas(formulaGrid);

  // Conditional format rules: green (min) → yellow (50th percentile) → red (max)
  const cfRules = itemNames.map((_, j) =>
    SpreadsheetApp.newConditionalFormatRule()
      .setGradientMinpoint(COLOR_CMP_GREEN)
      .setGradientMidpointWithValue(COLOR_CMP_YELLOW, SpreadsheetApp.InterpolationType.PERCENTILE, "50")
      .setGradientMaxpoint(COLOR_CMP_RED)
      .setRanges([sheet.getRange(2, timeColStart + j, heroOrder.length, 1)])
      .build()
  );
  sheet.setConditionalFormatRules(cfRules);

  return ss.getUrl() + "#gid=" + sheet.getSheetId();
}

function fetchBulletsPerSec() {
  const html = UrlFetchApp.fetch(WIKI_HERO_ATTRIBUTES_URL, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; GoogleAppsScript)" }
  }).getContentText();

  const tableMatch = html.match(/<table[\s\S]*?<\/table>/i);
  if (!tableMatch) return {};

  const tableHtml = tableMatch[0];
  const trRegex = /<tr[\s\S]*?<\/tr>/gi;
  let trMatch;
  let colIndex = -1;
  let isFirst = true;
  const result = {};

  while ((trMatch = trRegex.exec(tableHtml)) !== null) {
    if (isFirst) {
      isFirst = false;
      // Find the column index of "Bullets per sec"
      const thMatches = [...trMatch[0].matchAll(/<th[\s\S]*?<\/th>/gi)];
      colIndex = thMatches.findIndex(th =>
        th[0].replace(/<[^>]+>/g, "").trim() === "Bullets per sec"
      );
      continue;
    }
    if (colIndex === -1) continue;

    const trHtml = trMatch[0];
    const tdMatches = [...trHtml.matchAll(/<td[\s\S]*?<\/td>/gi)];
    if (tdMatches.length <= colIndex) continue;

    const heroMatch = tdMatches[0][0].match(/title="([^"]+)"/);
    if (!heroMatch) continue;
    const hero = heroMatch[1].replace(/&amp;/g, "&");

    const valMatch = tdMatches[colIndex][0].match(/data-base="([^"]+)"/);
    if (valMatch) result[hero] = parseFloat(valMatch[1]);
  }

  return result;
}

function parseBuildupTable(html) {
  // Find the table captioned "Buildup Per Shot"
  const tableMatch = html.match(/<table[^>]*class="[^"]*wikitable[^"]*mw-collapsible[^"]*"[\s\S]*?<\/table>/i);
  if (!tableMatch) return [];

  const tableHtml = tableMatch[0];
  const rows = [];
  const trRegex = /<tr[\s\S]*?<\/tr>/gi;
  let trMatch;
  let isFirst = true;

  while ((trMatch = trRegex.exec(tableHtml)) !== null) {
    if (isFirst) { isFirst = false; continue; } // skip header row

    const trHtml = trMatch[0];
    const tdMatches = [...trHtml.matchAll(/<td[\s\S]*?<\/td>/gi)];
    if (tdMatches.length < 2) continue;

    const heroMatch = tdMatches[0][0].match(/data-sort-value="([^"]+)"/);
    if (!heroMatch) continue;
    const hero = heroMatch[1].replace(/&amp;/g, "&");

    const pct = parseFloat(tdMatches[1][0].replace(/<[^>]+>/g, "").trim());
    if (!isNaN(pct)) rows.push({ hero, pct });
  }

  return rows;
}
