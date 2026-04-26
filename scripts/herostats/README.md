# Hero Stats

Fetches the hero attributes table from the Deadlock wiki and displays it in Google Sheets in a format optimized for comparing heroes across stats.

## Files

| File | Description |
|---|---|
| `code.js` | Entry point (`main_HeroStats`). Orchestrates the full pipeline: fetch → parse → classify → build headers/rows → write to sheet. |
| `parsing.js` | Fetches wiki HTML and parses the hero attributes table into base (Lvl1) and scaled (Lvl35) data maps per hero. |
| `classification.js` | Assigns each stat to a display block (Relative, Literal, Outlier, Raw) based on value diversity across heroes. Also detects collapsed stats. |
| `headers.js` | Builds header row descriptors for each block — abbreviated labels, tooltip notes, and full names used as keys throughout the pipeline. |
| `dataRows.js` | Builds one data row per hero and collects spirit-scaling cell notes to be applied later. |
| `formatting.js` | Writes the data to the sheet and applies all visual formatting: gradients, outlier highlights, borders, column widths, frozen rows/columns, and the Info sheet. |
| `constants.js` | Hardcoded config: stat categories (Weapon/Vitality/Spirit), outlier stat list, abbreviations, and color values. |
| `strings.js` | Low-level text utilities: HTML stripping, value cleaning (`+`/`-` for booleans), numeric conversion. |

## Data model

Each stat has two values per hero: **Lvl1** (base, no scaling) and **Lvl35** (base + 35× level scale + any innate spirit power scaling). Both are sourced from `data-base` and `data-level-scale` attributes on the wiki table's `<td>` elements.

**Collapsed stats** — if a stat's Lvl1 and Lvl35 values are identical for every hero, it has no level scaling and is shown as a single column instead of two.

---

### Display blocks

The sheet is divided into four blocks, separated by thick vertical borders. Each stat is assigned to exactly one block based on how many distinct values it has across heroes. Stats where every hero shares the same value are dropped entirely — they carry no comparative information.

**Relative** — Stats with high variation (9+ distinct values). Shown as `+N%` / `-N%` relative to the median hero. The midpoint is the median rather than average to limit the influence of outliers. Green = better than median, red = worse. The raw numbers backing these columns sit in the **Raw** section at the far right of the sheet.

**Literal** — Stats with few distinct values (2–8). Shown as raw numbers with a green-to-red gradient (best to worst). Useful for stats like resists or stamina where most heroes cluster into a small set of tiers.

**Outlier** — Manually designated stats (see `OUTLIER_STATS` in `constants.js`) that have categorical or mechanical meaning and wouldn't make sense as a percentage — e.g. Bullets Per Shot, Reload Single. Colored blue if a hero differs from the majority value, yellow if they match. Helps quickly spot heroes with unusual weapon mechanics.

**Raw** — The backing numeric data for the Relative block. Sits at the far right, labeled in italic as "Raw data used to calculate % columns".

---

### Other notes

- **Spirit scaling**: Some stats scale with Spirit Power. The scaled (Lvl35) value is computed using the hero's own innate Lvl35 Spirit Power. Affected cells get a tooltip noting the scaling factor and assumed SP value.
- **Header colors**: Column headers are color-coded by category — gold for Weapon stats, green for Vitality, purple for Spirit.
- **`allSameBase` / `allSameScaled`**: For non-collapsed Relative stats, if all heroes happen to share the same value at either Lvl1 or Lvl35, that sub-column is omitted.
