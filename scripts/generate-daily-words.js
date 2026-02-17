// Run once from project root: node scripts/generate-daily-words.js
// Filters wordlist_en.txt to 5-7 letter alphabetic words for use as daily seed words.

const fs = require("fs");
const path = require("path");

const words = fs
  .readFileSync(path.join(__dirname, "../views/wordlist_en.txt"), "utf8")
  .split("\n")
  .map((w) => w.trim().toLowerCase())
  .filter((w) => w.length === 6 && /^[a-z]+$/.test(w));

const outPath = path.join(__dirname, "../data/daily-words.txt");
fs.writeFileSync(outPath, words.join("\n"));
console.log(`Generated ${words.length} daily words → ${outPath}`);
