const WIKI_HERO_ATTRIBUTES_URL = "https://deadlock.wiki/Hero_Attributes_Table";

// Comparison gradient: green = best, yellow = median, red = worst
const COLOR_CMP_GREEN  = "#57BB8A";
const COLOR_CMP_YELLOW = "#FFD666";
const COLOR_CMP_RED    = "#E67C73";
const COLOR_CMP_BLUE   = "#6FA8DC"; // outlier / differs from majority

// Stat category header background colors
const HEADER_COLORS = {
  weapon:   "#E4B20C",
  vitality: "#A5CE3D",
  spirit:   "#B868DE",
};

function columnToLetter(col) {
  let letter = "";
  while (col > 0) {
    const remainder = (col - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    col = Math.floor((col - 1) / 26);
  }
  return letter;
}
