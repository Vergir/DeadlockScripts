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
  if (lower === "true")  return "+";
  if (lower === "false") return "-";
  const n = parseFloat(val);
  if (isNaN(n)) return "0";
  return String(n);
}

function toNumber(val) {
  if (val === undefined || val === null) return 0;
  const lower = String(val).toLowerCase();
  if (lower === "true")  return 1;
  if (lower === "false") return 0;
  const n = parseFloat(lower);
  return isNaN(n) ? 0 : n;
}

// columnToLetter lives in scripts/shared.js
