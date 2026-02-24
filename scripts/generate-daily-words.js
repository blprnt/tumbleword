// Run once from project root: node scripts/generate-daily-words.js
// Filters wordlist_en.txt to 5-letter alphabetic words (no doubles) for use as daily seed words.
// Only keeps words that have at least one valid one-letter-away neighbor, so players always
// have an easy first move.
// The list is shuffled with a fixed seed so consecutive days don't produce alphabetically adjacent words.

const fs = require("fs");
const path = require("path");

const allFiveLetterWords = new Set(
  fs
    .readFileSync(path.join(__dirname, "../views/wordlist_en.txt"), "utf8")
    .split("\n")
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w.length === 5 && /^[a-z]+$/.test(w))
);

function hasOneLetterNeighbor(word) {
  for (let i = 0; i < word.length; i++) {
    for (let c = 97; c <= 122; c++) {
      const ch = String.fromCharCode(c);
      if (ch === word[i]) continue;
      if (allFiveLetterWords.has(word.slice(0, i) + ch + word.slice(i + 1))) return true;
    }
  }
  return false;
}

const words = [...allFiveLetterWords]
  .filter((w) => !/(.)\1/.test(w) && !w.endsWith("s") && hasOneLetterNeighbor(w));

// Deterministic Fisher-Yates shuffle with a fixed seed (mulberry32 PRNG).
// Using a fixed seed keeps the order consistent across regenerations.
function seededShuffle(arr, seed) {
  let s = seed;
  function rand() {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

seededShuffle(words, 0xdeadbeef);

const outPath = path.join(__dirname, "../data/daily-words.txt");
fs.writeFileSync(outPath, words.join("\n"));
console.log(`Generated ${words.length} daily words → ${outPath}`);
