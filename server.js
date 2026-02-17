
// server.js
// where your node app starts

// init project
var express = require("express");
var bodyParser = require("body-parser");
var fs = require("fs");
var app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

let reporting = false;
let median = 15;

//Score logic. Scores are stored in a really simple txt file
//word=score
let scores = {};
let machinceScores = {};

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

function getDailyWord() {
  const dateStr = getTodayStr();
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (Math.imul(31, hash) + dateStr.charCodeAt(i)) | 0;
  }
  return dailyWords[Math.abs(hash) % dailyWords.length];
}

let currentDateStr = getTodayStr();

function checkDayRollover() {
  const todayStr = getTodayStr();
  if (todayStr !== currentDateStr) {
    currentDateStr = todayStr;
    fs.writeFileSync("data/today.txt", "");
    console.log(`New day: ${todayStr}. Reset today.txt. Word: ${getDailyWord()}`);
  }
}

function loadScores() {
  //human
  var array = fs.readFileSync("data/scores.txt").toString().split("\n");
  array.forEach((w) => {
    scores[w.split("=")[0]] = w.split("=")[1];
  });
  //machines
  array = fs.readFileSync("data/machines.txt").toString().split("\n");
  array.forEach((w) => {
    scores[w.split("=")[0]] = w.split("=")[1];
  });
  
}

function getScore(_w) {
  let _sc;
  if (!scores[_w]) {
    setScore(_w, 30);
  }
  _sc = scores[_w];

  return ({word:_w, score:_sc.split(":")[0], avg:getMedian(), good:getPercentile(0.80)});
}

function setScore(_w, _score, _path) {
  scores[_w] = _score + ":" + _path;
  writeScores();
}

function writeScores() {
  console.log("WRITE SCORES");
  var file = fs.createWriteStream("data/scores.txt");
  file.on("error", function (err) {
    console.log(err);
  });
  for (var n in scores) {
    file.write(n + "=" + scores[n] + "\n");
  }
  file.end();
 
}

function getMedian() {
  var nums = fs.readFileSync("data/today.txt").toString().split(",");
  nums.sort(function(a, b){return a - b});
  console.log(nums);
  let md = nums[Math.floor(nums.length/2)];
  console.log("MEDIAN:" + md);
  return(md);
}

function getPercentile(_p) {
  var nums = fs.readFileSync("data/today.txt").toString().split(",");
  nums.sort(function(a, b){return a - b});
  let md = nums[Math.floor(nums.length * _p)];
  console.log("PERCENTILE " + _p + ":" + md);
  return(md);
}

// http://expressjs.com/en/starter/static-files.html
app.use(express.static("views"));

// Daily word endpoint
app.get("/daily", (req, res) => {
  checkDayRollover();
  res.json({ word: getDailyWord() });
});

//Post endpoint for scores
app.post("/score", (req, res) => {
  checkDayRollover();
  if (reporting) console.log("SCORE REPORT:" + req.body.word + ":" + req.body.score + ":" + req.body.wordPath);
  let _score = getScore(req.body.word).score;
  if (reporting) console.log("STORED SCORE:" + _score);
  if (req.body.score > _score) {
    if (reporting) console.log("HIGH SCORE!");
    setScore(req.body.word, req.body.score, req.body.wordPath);
  }
  if (req.body.score > 0) {
    if (reporting) console.log("APPEND SCORE:" + req.body.score);
    fs.appendFile( "data/today.txt", req.body.score + ",");
    if (reporting) console.log("IS HUMAN:" + req.body.isHuman);
  }

  res.send(JSON.stringify(getScore(req.body.word)));
});

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log("Your app is listening on port " + listener.address().port);
});

loadScores();

median = getMedian();

console.log(getPercentile(0.76));