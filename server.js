// server.js
var express = require("express");
var bodyParser = require("body-parser");
var fs = require("fs");
var path = require("path");
var app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// High scores: word -> "score:path"
let scores = {};

// Today's submitted scores, kept in memory and synced to data/today.txt
let todayScores = [];

// Daily word system
let dailyWords = fs
  .readFileSync("data/daily-words.txt")
  .toString()
  .trim()
  .split("\n")
  .filter((w) => w.trim());

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getWordForDate(dateStr) {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (Math.imul(31, hash) + dateStr.charCodeAt(i)) | 0;
  }
  return dailyWords[Math.abs(hash) % dailyWords.length];
}

function getDailyWord() {
  return getWordForDate(getTodayStr());
}

function getYesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

let currentDateStr = getTodayStr();

function checkDayRollover() {
  const todayStr = getTodayStr();
  if (todayStr !== currentDateStr) {
    currentDateStr = todayStr;
    todayScores = [];
    fs.writeFile("data/today.txt", "", (err) => {
      if (err) console.error("Error resetting today.txt:", err);
    });
    console.log(`New day: ${todayStr}. Word: ${getDailyWord()}`);
  }
}

function loadScores() {
  fs.readFileSync("data/scores.txt")
    .toString()
    .split("\n")
    .forEach((line) => {
      const eq = line.indexOf("=");
      if (eq > 0) scores[line.slice(0, eq)] = line.slice(eq + 1);
    });
}

function loadTodayScores() {
  const raw = fs.readFileSync("data/today.txt").toString();
  todayScores = raw
    .split(",")
    .map(Number)
    .filter((n) => n > 0 && !isNaN(n));
}

function writeScores() {
  const lines = Object.entries(scores)
    .map(([w, v]) => `${w}=${v}`)
    .join("\n");
  fs.writeFile("data/scores.txt", lines, (err) => {
    if (err) console.error("Error writing scores:", err);
  });
}

function getHighScore(word) {
  const raw = scores[word];
  if (!raw) return { score: 0, path: "" };
  const colon = raw.indexOf(":");
  return {
    score: parseInt(raw.slice(0, colon > 0 ? colon : undefined), 10) || 0,
    path: colon > 0 ? raw.slice(colon + 1) : "",
  };
}

function getPercentile(p) {
  if (todayScores.length === 0) return 0;
  const sorted = [...todayScores].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length * p)] || 0;
}

function buildScoreResponse(word) {
  const { score, path } = getHighScore(word);
  return {
    word,
    score,
    path,
    avg: getPercentile(0.5),
    good: getPercentile(0.8),
  };
}

// Static files
app.use(express.static("views"));

// Serve p5.js from npm package
app.get("/p5.js", (req, res) => {
  res.sendFile(path.join(__dirname, "node_modules/p5/lib/p5.js"));
});

// p5.dom.js functionality is included in p5.js 1.x
app.get("/p5.dom.js", (req, res) => {
  res.type("application/javascript").send("");
});

// GET /daily — today's word
app.get("/daily", (req, res) => {
  checkDayRollover();
  res.json({ word: getDailyWord() });
});

// GET /yesterday — previous day's word and high score path
app.get("/yesterday", (req, res) => {
  const word = getWordForDate(getYesterdayStr());
  const { score, path } = getHighScore(word);
  res.json({ word, score, path: path ? path.split("|") : [] });
});

// GET /score?word=... — fetch current score data without submitting
app.get("/score", (req, res) => {
  checkDayRollover();
  const word = req.query.word;
  if (!word) return res.status(400).json({ error: "word required" });
  res.json(buildScoreResponse(word));
});

// POST /score — submit a completed game score
app.post("/score", (req, res) => {
  checkDayRollover();
  const word = req.body.word;
  const incoming = parseInt(req.body.score, 10);
  const wordPath = req.body.wordPath || "";

  if (incoming > 0) {
    todayScores.push(incoming);
    fs.appendFile("data/today.txt", incoming + ",", (err) => {
      if (err) console.error("Error appending score:", err);
    });
  }

  const current = getHighScore(word);
  if (incoming > current.score) {
    scores[word] = incoming + ":" + wordPath;
    writeScores();
  }

  res.json(buildScoreResponse(word));
});

// Listen
var listener = app.listen(process.env.PORT || 3000, function () {
  console.log("Tumbleword listening on port " + listener.address().port);
});

loadScores();
loadTodayScores();
console.log(`Daily word: ${getDailyWord()}`);
