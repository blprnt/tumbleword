/*

TumbleJumble
Jer Thorp, Dec 6, 2022

At some point in the future this code will be cleaned up to look like it were made by a respectable coder who know what they were doing it wrote it.

This is not yet that point in the future.

If you have inquiries about the game, please contact: jer.thorp@hey.com

*/

let stepsLeft = 42;
let lastSteps = stepsLeft;
let highScore = 10;
let goodScore;
let awesomeScore;
let playerScore = 0;
let totalWords = 0;
let displayHigh;

//Set word from query if it's there
const params = new Proxy(new URLSearchParams(window.location.search), {
  get: (searchParams, prop) => searchParams.get(prop),
});
let queryWord = params.word;
let lang = params.lang ? params.lang : "en";

//Set challenge score from query if it's there
let challenge = params.challenge != undefined;
let challengeScore = params.challenge;

//Set challenge score from query if it's there
let scoreRule = params.rule ? params.rule : 1;
console.log("SCORE RULE:" + scoreRule);

//Score message - should be changed to 'for this word'
let scoreMessage = "this is the average score of all players today.";

//Which score are we showing? Good, great, best
let scoreStage = 0;

//Set the seed word from the query string if it's there
let seedWord =
  queryWord && queryWord.length < 9 ? queryWord.toLowerCase() : "rancor";

let currentWord;
let referenceWord;
let shake;
let cutting = false;
let cutCost = 3;
let cuts = 3;
let turnBump = 0;
let lastBump = 0;
let bumpCount = 0;
let bumpTrack = 0;
let bumpTotal = 0;

let stateHistory = [];
let wordHistory = {};
let wordHistoryCount = 0;
let tumblers = [];
let doneWords = [];

let moveInterval;

let currentLetter;

//Token list for tumblers
let alpha = "abcdefghijklmnopqrstuvwxyz";

//HTML tag for reference for touch events
let htel = document.getElementsByTagName("html")[0];

let isMobile;

if (
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
) {
  isMobile = true;
} else {
  isMobile = false;
}

let letterSize = isMobile ? 40 : 20;
let driftMin = isMobile ? 60 : 5;

function setup() {
  tumbleSpin();
  //disable enter button
  document.querySelector("#enter").classList.add("disabled");
  document.querySelector("#reset").classList.add("disabled");

  //set high score
  if (challenge) {
    highScore = challengeScore;
    document.querySelector("#highLabel").innerHTML = "challenge";
  } else {
    reportScore(0);
  }

  //populate yesterdays's score
  rememberYesterday();
  document.querySelector("#maxScoreNew").innerHTML = highScore;

  //set up spellchecker
  var english_word_list = loadStrings("/wordlist_" + lang + ".txt");
  set_valid_word_list(english_word_list);

  //populate the tumblers
  currentWord = seedWord;
  buildWord(seedWord, true);

  //set state
  setState();

  //hook up buttons
  document.querySelector("#enter").addEventListener("click", function () {
    checkWord();
  });
  document
    .querySelector("#enter")
    .addEventListener("pointerenter", function () {
      setMessage("add this word to your list, if it's a new valid word.");
    });
  document
    .querySelector("#maxScoreNew")
    .addEventListener("pointerenter", function () {
      setMessage(scoreMessage);
    });
  document.querySelector("#maxScoreNew").addEventListener("click", function () {
    advanceScoreStage();
  });

  //bumps
  document
    .querySelector("#leftBump")
    .addEventListener("pointerenter", function () {
      setMessage("bump the letters one step to the left. costs a tumble.");
    });

  document.querySelector("#leftBump").addEventListener("click", function () {
    bump(true);
  });

  document
    .querySelector("#rightBump")
    .addEventListener("pointerenter", function () {
      setMessage("bump the letters one step to the right. costs a tumble.");
    });

  document.querySelector("#rightBump").addEventListener("click", function () {
    bump(false);
  });

  //cut
  document.querySelector("#cuts").addEventListener("pointerenter", function () {
    console.log("over");
    setMessage(
      scoreRule == 1
        ? "trim out a letter. <strong>costs 1/3 of your tumbles</strong>."
        : "use the ✂️ to trim out letters. each use costs " +
            cutCost +
            " tumbles."
    );
  });

  document.querySelector("#cuts").addEventListener("click", function () {
    //doRewind();
    cutting = !cutting;
    if (cutting) {
      document.querySelector("#cuts").classList.add("toggle");
    } else {
      document.querySelector("#cuts").classList.remove("toggle");
    }

    setMessage(
      scoreRule == 1
        ? "click a letter to remove it (<strong>costs 1/3 of your tumbles!</strong>)"
        : "click a letter to remove it (costs 4 tumbles)"
    );
  });

  document.querySelector("#cuts").addEventListener("pointerleave", function () {
    console.log("over");
    if (!cutting) {
      hideMessage();
    }
  });

  //Done
  let doning = false;

  document.querySelector("#done").addEventListener("pointerenter", function () {
    setMessage("click this to share your score and challenge friends!");
  });

  document.querySelector("#done").addEventListener("click", function () {
    if (!doning) {
      document.querySelector("#donePanel").classList.remove("gone");
      buildDonePanel();
    } else {
      document.querySelector("#donePanel").classList.add("gone");
    }
  });

  document.querySelector("#done").addEventListener("pointerleave", function () {
    if (!cutting) {
      hideMessage();
    }
  });

  document.querySelector("#doneClose").addEventListener("click", function () {
    document.querySelector("#donePanel").classList.add("gone");
  });

  //Reset
  document.querySelector("#reset").addEventListener("click", function () {
    doRewind(true);
  });

  document
    .querySelector("#reset")
    .addEventListener("pointerenter", function () {
      setMessage("go back to the last word that was entered.");
    });

  document.querySelector("#help").classList.add("gone");
  document.querySelector("#helpButton").addEventListener("click", function () {
    console.log("SHOW HELP");
    document.querySelector("#help").classList.remove("gone");
  });
  document.querySelector("#helpClose").addEventListener("click", function () {
    console.log("SHOW HELP");
    document.querySelector("#help").classList.add("gone");
  });

  if (document.querySelector("#yesterday")) {
    document.querySelector("#yesterday").addEventListener("click", function () {
      document.querySelector("#yesterdayPanel").classList.remove("gone");
    });
    document
      .querySelector("#yesterdayClose")
      .addEventListener("click", function () {
        document.querySelector("#yesterdayPanel").classList.add("gone");
      });
  }
  setMessage("scroll or drag the letters up and down to find new words!");
}

let spinner;

let scorePos = 0;
let tscorePos = 0;

function draw() {
  scorePos += (tscorePos - scorePos) * 0.05;
  document.querySelector("#scoreNew").style.left = scorePos + "%";
}

//Game machinery
function buildWord(_word, _slide, _noChange) {
  console.log("BUILD WORD:" + _word);
  //currentWord = _word;
  referenceWord = _word;
  //Clear word div
  document.querySelector("#wordDisplay").innerHTML = "";

  if (isMobile)
    document.querySelector("#wordDisplay").classList.add("enbiggen");
  tumblers = [];

  //Make the word tiles
  let letters = _word.split("");
  for (let i = 0; i < letters.length; i++) {
    let ldiv = buildLetter(letters[i], i, _slide);
  }

  if (!_noChange) wordHistory[_word] = true;
}

//Yesterday
function rememberYesterday() {
  
  let yesterdayString = "thrice=88:brewer|brawer|drawer|braver|braves|craves|craver|drawer|brayer|draws|craws|braws|drays|craws|drays"
      //"muffin=120:hooted|horsed|hosted|hotted|jotted|lotted|louted|loused|moused|mossed|pouted|potted|posted|ported|sorted|sotted|totted|touted|toused|toured"
      //"dogleg=156:doiled|coiled|boiled|coined|brined|daring|caring|baring|basing|bating|dating|eating|easing|earing|faring|fating|gating|hating|having|hawing|haying|hazing|gazing|fazing|faying|faxing"
      //"fledge=132:fleche|leched|necked|pecked|peeked|peeled|reeled|reeked|seeled|seemed|teemed|teamed|seamed|reamed|reaped|reared|seared|teared|teased|teated|seated|reaved"
  let yesterdaySeed = yesterdayString.split("=")[0];
  let yesterdayScore = yesterdayString.split(":")[0].split("=")[1];
  let yesterdayList = yesterdayString.split(":")[1].split("|");

  console.log("YESTERDAY LIST");
  console.log(yesterdayList);

  if (document.querySelector("#yesterday")) {
    let pts = document.createElement("div");
    pts.innerHTML = "🎉" + yesterdayScore + " points! 🎉";
    document.querySelector("#yesterdayScores").appendChild(pts);

    let sd = document.createElement("div");
    sd.innerHTML = yesterdaySeed;
    sd.classList.add("ySeed");
    document.querySelector("#yesterdayScores").appendChild(sd);

    for (let i = 0; i < yesterdayList.length; i++) {
      let w = document.createElement("div");
      w.innerHTML = yesterdayList[i];
      document.querySelector("#yesterdayScores").appendChild(w);
    }
  }
}

//Messaging

let msgInterval;

function setMessage(_msg) {
  clearInterval(msgInterval);
  document.querySelector("#message").innerHTML = _msg;
  msgInterval = setInterval(hideMessage, 8000);
}

function hideMessage(_msg) {
  document.querySelector("#message").innerHTML = "";
  clearInterval(msgInterval);
}

//Reset, Rewind
function setState() {
  stateHistory.push({
    word: currentWord,
    tumbles: stepsLeft,
    score: playerScore,
    bumps: bumpCount,
    cuts: cuts,
    wh: wordHistory,
    whc: wordHistoryCount,
    history: document.querySelector("#wordList").innerHTML,
  });
  console.log(stateHistory);
}

function doRewind(_slide) {
  console.log(getWord() + ":" + stateHistory[0].word);
  if (
    getWord() == stateHistory[stateHistory.length - 1].word &&
    stateHistory.length > 1
  ) {
    let out = stateHistory.pop();
    wordHistory[out.word] = false;

    currentWord = stateHistory[stateHistory.length - 1].word;
    stepsLeft = lastSteps = stateHistory[stateHistory.length - 1].tumbles;
    playerScore = stateHistory[stateHistory.length - 1].score;
    bumpCount = stateHistory[stateHistory.length - 1].bumps;
    wordHistory = stateHistory[stateHistory.length - 1].wh;
    cuts = stateHistory[stateHistory.length - 1].cuts;
    wordHistoryCount = stateHistory[stateHistory.length - 1].whc;
    document.querySelector("#wordList").innerHTML =
      stateHistory[stateHistory.length - 1].history;
    setScore();
    setSteps();
    setCuts();
    doneWords.shift();
    resetWord(true);
  } else {
    resetWord(_slide);
  }
}
function resetWord(_slide) {
  buildWord(currentWord, _slide);
  stepsLeft = lastSteps;
  turnBump = 0;
  lastBump = 0;
  setSteps();
}

// Done

function buildDonePanel() {
  //reportScore(playerScore);
  console.log("build done");
  //Text fields
  //1
  document.querySelector("#done1").innerHTML =
    "You went from <strong>" +
    seedWord +
    "</strong> to <strong>" +
    currentWord +
    "</strong> in " +
    wordHistoryCount +
    " steps, using " +
    (42 - stepsLeft) +
    " tumbles.";
  //2
  document.querySelector("#done2").innerHTML =
    "You scored " + playerScore + " points";

  if (challenge) {
  } else if (playerScore < highScore) {
    document.querySelector("#done2").innerHTML +=
      ", just " +
      (highScore - playerScore) +
      " " +
      (highScore - playerScore == 1 ? "point" : "points") +
      " short of the high score.";
  } else {
    document.querySelector("#done2").innerHTML += "! A new 🌍🌎🌏 high score!";
  }
  //3
  document.querySelector("#done3").innerHTML =
    "You used " + (3 - cuts) + " ✂️ and " + bumpTotal + "  🤜🤛.";

  //Link OK

  document.querySelector("#doneOK").addEventListener("click", function () {
    document.querySelector("#doneShare").classList.remove("gone");
    document.querySelector("#doneChallenge").classList.remove("gone");
    document.querySelector("#doneOK").classList.add("gone");
    reportScore(playerScore);
  });

  //Share clip
  document.querySelector("#doneShare").addEventListener("click", function () {
    shareClipBoard();
  });

  //Issue challenge clip
  document
    .querySelector("#doneChallenge")
    .addEventListener("click", function () {
      challengeClipBoard();
    });
}

function shareClipBoard() {
  let shareMsg =
    `
Tumbleword: ` +
    seedWord +
    ` ➡️ ` +
    currentWord +
    ` \n` +
    wordHistoryCount +
    ` words \n` +
    playerScore +
    ` points \n` +
    (playerScore >= highScore ? `🎉 🌍 HIGH SCORE 🌎 🎉 \n` : ``) +
    (3 - cuts) +
    ` ✂️ \n` +
    bumpTotal +
    ` 🤜🤛 \n` +
    `https://tumbleword.glitch.me?word=` +
    seedWord;
  toClipBoard(shareMsg);
}

function challengeClipBoard() {
  let shareMsg =
    `I scored ` +
    (playerScore >= highScore ? `a 🌍 HIGH SCORE 🌎 of ` : ``) +
    playerScore +
    ` points on Tumbleword starting with '` +
    seedWord +
    `'.

Think you can do better? Give it a try:

https://tumbleword.glitch.me?word=` +
    seedWord +
    `&challenge=` +
    playerScore;

  toClipBoard(shareMsg);
}

function toClipBoard(_msg) {
  /*
  NEW COPY CODE SHOULD WORK SOME TIME IN THE FUTURE
  navigator.clipboard.writeText(shareMsg).then(
    () => {
      document.querySelector("#shareMsg").innerHTML = "copied to clipboard!";
    },
    () => {
      document.querySelector("#shareMsg").innerHTML = "couldn't copy";
    }
  );
  */

  //Elaborate legacy copy code that makes me very itchy
  var textArea = document.createElement("textarea");

  // Place in the top-left corner of screen regardless of scroll position.
  textArea.style.position = "fixed";
  textArea.style.top = 0;
  textArea.style.left = 0;

  // Ensure it has a small width and height. Setting to 1px / 1em
  // doesn't work as this gives a negative w/h on some browsers.
  textArea.style.width = "2em";
  textArea.style.height = "2em";

  // We don't need padding, reducing the size if it does flash render.
  textArea.style.padding = 0;

  // Clean up any borders.
  textArea.style.border = "none";
  textArea.style.outline = "none";
  textArea.style.boxShadow = "none";

  // Avoid flash of the white box if rendered for any reason.
  textArea.style.background = "transparent";

  textArea.value = _msg;

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    var successful = document.execCommand("copy");
    var msg = successful ? "successful" : "unsuccessful";
    document.querySelector("#shareMsg").innerHTML = "copied to clipboard!";
  } catch (err) {
    console.log("Oops, unable to copy");
  }

  document.body.removeChild(textArea);
}

function suggestDone() {
  document.querySelector("#done").classList.remove("gone");
}

function getWord() {
  let word = "";

  tumblers.forEach((w) => {
    word += w.getLetter();
  });

  return word;
}

function tumbleSpin() {
  document.querySelector("#steps").classList.add("rotate");
  setTimeout(function () {
    document.querySelector("#steps").classList.remove("rotate");
  }, 1500);
}

function checkWord() {
  
  //is the current word valid?
  //assemble the word
  let word = getWord();
  //is the word valid?
  let spellResults = find_similar(word, 0.999);
  if (spellResults[1][0] == 1 && !wordHistory[word] && stepsLeft >= 0) {
    //spell and identity check is good!
    //change score
    if (playerScore == 0) {
      addWord("<span class='firstWord'>" + seedWord + "<span>");
    }
    playerScore += word.length;
    setScore();
    //change steps
    lastSteps = stepsLeft;
    //reset word
    buildWord(word);
    //Put it in the list.
    addWord(word);
    setState();
    //bumps
    if (lastBump != 0) bumpTotal ++;

    //spin the tumbleweed
    tumbleSpin();
  } else {
    document.querySelector("#wordDisplay").classList.add("shake");
    document.querySelector("#wordDisplay").classList.add("shake-constant");
    shake = setInterval(stopShake, 500);
    if (stepsLeft < 0) {
      setMessage("Sorry, you're out of tumbles!");
    } else {
      if (wordHistory[word]) {
        setMessage("this is the same as a previous word");
      } else {
        console.log(getWord());
        setMessage("hmmm... is " + word + " a real word?");
      }
    }
    //spell or identity check failed
  }
}

function addWord(_word) {
  currentWord = _word;
  bumpCount = 0;
  turnBump = 0;
  if (wordHistoryCount > 0) doneWords.push(_word);
  wordHistoryCount++;
  bumpCount += abs(turnBump % referenceWord.length);
  bumpTotal = bumpCount;
  document.querySelector("#wordList").innerHTML =
    _word + "<br>" + document.querySelector("#wordList").innerHTML;
}

let scoreMessages = [
  "this is the average score of all players today.",
  "this is the score of the top 20% of players today.",
  "this is today's high score!",
];

function advanceScoreStage() {
  scoreStage++;
  if (scoreStage == 3) {
    if (playerScore < goodScore) {
      scoreStage = 0;
    } else if (playerScore < awesomeScore) {
      scoreStage = 1;
    } else {
      scoreStage = 2;
    }
  }

  console.log("ADVANCE");
  scoreMessage = scoreMessages[scoreStage];
  setMessage(scoreMessage);
  setScoreNotation();
  setScoreDisplay();
  //setScore();
}

function setScoreNotation() {
  let scoreTypes = [goodScore, awesomeScore, highScore];
  displayHigh = scoreTypes[scoreStage];
  if (scoreStage == 0) {
    document.querySelector("#highScoreLabel").classList.remove("gone");
    document.querySelector("#highScoreLabel").innerHTML = "good →";
  } else if (scoreStage == 1) {
    document.querySelector("#highScoreLabel").classList.remove("gone");
    document.querySelector("#highScoreLabel").innerHTML = "great →";
  } else if (scoreStage == 2) {
    document.querySelector("#highScoreLabel").classList.remove("gone");
    document.querySelector("#highScoreLabel").innerHTML = "best →";
  }
}

function setScore() {
  console.log("SET SCORE");
  if (tscorePos > 75) {
    document.querySelector("#medianLabel").classList.add("gone");
    document.querySelector("#highScoreLabel").classList.add("gone");
  }

  if (playerScore >= displayHigh) {
    advanceScoreStage();
    if (playerScore < awesomeScore) {
      setMessage("Great work! You beat today's average score.");
      scoreMessage = "this is the score of the top 20% of players today.";
      //scoreStage = 1;
      setScoreNotation();
    } else {
      scoreMessage = "this is today's high score!";
      setMessage("Holy cats! You beat 80% of today's players.");
      //scoreStage = 2;
      setScoreNotation();
    }
  }

  setScoreDisplay();
}

function setScoreDisplay() {
  document.querySelector("#scoreNew").innerHTML = playerScore;
  document.querySelector("#maxScoreNew").innerHTML = displayHigh;
  tscorePos = min(1.0, playerScore / displayHigh) * 90;
}

function setSteps() {
  document.querySelector("#steps").innerHTML = max(0, stepsLeft);

  if (stepsLeft < 4) {
    document.querySelector("#done").classList.remove("gone");
  } else {
    document.querySelector("#done").classList.add("gone");
  }
  if (stepsLeft <= cutCost) {
    document.querySelector("#cuts").classList.add("gone");
  } else {
    document.querySelector("#cuts").classList.remove("gone");
  }
}

function stopShake() {
  document.querySelector("#wordDisplay").classList.remove("shake");
  clearInterval(shake);
}

function stopShakeBump() {
  document.querySelector("#wordDisplay").classList.remove("shake-horizontal");
  clearInterval(shake);
}

function buildLetter(_letter, _i, _slide) {
  let ldiv = makeTumbler({
    visibleLetters: 7,
    tokens: alpha,
    width: isMobile ? 60 : 48,
    height: 90,
    letterSize: 48,
    oletter: _letter,
  });

  tumblers.push(ldiv);
  ldiv.setAndPosition();
  if (_slide) {
    ldiv.slideToLetter(_letter);
  } else {
    ldiv.setLetter(_letter);
  }

  ldiv.id("letter" + _i);
  select("#wordDisplay").child(ldiv);

  return ldiv;
}

function cutLetter(_elt) {
  document.querySelector("#enter").classList.remove("disabled");
  document.querySelector("#reset").classList.remove("disabled");
  console.log("CUT IT");
  if (scoreRule == 0) {
    cuts--;
    stepsLeft -= cutCost;
    lastSteps -= cutCost;
  } else if (scoreRule == 1) {
    cuts--;
    stepsLeft = floor(stepsLeft * 0.66);
    lastSteps = stepsLeft;
  }

  setSteps();

  _elt.remove();
  console.log("Tumbler cut at " + tumblers.indexOf(_elt));
  console.log(tumblers);
  tumblers.splice(tumblers.indexOf(_elt), 1);
  console.log(tumblers);
  referenceWord = getWord();

  hideMessage();
  cutting = false;
  document.querySelector("#cuts").classList.remove("toggle");
  currentWord = getWord();

  setCuts();
  setState();
}

function setCuts() {
  if (document.querySelector("#badge")) {
    if (cuts == 0) {
      document.querySelector("#cuts").classList.add("gone");
    } else {
      document.querySelector("#badge").innerHTML = cuts;
    }
  } else {
    document.querySelector("#cuts").innerHTML = "";
    for (var i = 0; i < cuts; i++) {
      document.querySelector("#cuts").innerHTML =
        document.querySelector("#cuts").innerHTML + "✂️";
    }
  }
}
function getLetterDistanceIndex(_i1, _i2) {
  let d = min(abs(_i1 - _i2), min(_i1, _i2) + (alpha.length - max(_i1, _i2)));
  return d;
}

function getLetterDistance(_l1, _l2) {
  return getLetterDistanceIndex(alpha.indexOf(_l1), alpha.indexOf(_l2));
}

function calcSteps() {
  var fc = 0;
  let c = 0;
  tumblers.forEach((d) => {
    fc += getLetterDistance(d.getLetter(), referenceWord.charAt(c));
    c++;
  });
  console.log(turnBump);
  stepsLeft = lastSteps - fc - abs(turnBump);
  setSteps();
}

function letterUp(_event) {
  event.preventDefault();
  clearInterval(moveInterval);
  htel.removeEventListener("touchend", letterUp);
  htel.removeEventListener("mouseup", letterUp);
}

/* TUMBLER STUFF */

function makeTumbler(_config) {
  //main div
  let d = createDiv("");
  d.elt.elt = d;
  d.addClass("tumbler");
  d.config = _config;
  d.oletter = _config.oletter;
  //letter block
  let lb = createDiv("");
  lb.addClass("tumblerBlock");
  d.child(lb);
  d.block = lb;
  //style for main div
  d.style("width", _config.width + "px");
  d.style("height", _config.height + "px");
  d.style("font-size", _config.letterSize + "px");
  //make visible letters
  d.letters = [];
  for (let i = 0; i < _config.visibleLetters; i++) {
    let l = createDiv("#");
    lb.child(l);
    d.letters.push(l);
  }

  //set vars
  d.slide = 0;
  d.tslide = 0;

  //functionality
  d.slideToLetter = function (_l) {
    this.tslide = this.config.tokens.indexOf(_l);
    this.snap(true);
    //console.log(this.config.tokens);
    //console.log("slide to " + _l + ":" + this.tslide);
    return this;
  };
  d.setLetter = function (_l) {
    this.slide = this.config.tokens.indexOf(_l);
    this.setAndPosition();

    return this;
  };
  d.getLetter = function () {
    if (this.slide == 26) {
      this.slide = 0;
    }
    return this.config.tokens.charAt(round(this.slide) % 26);
  };
  d.setAndPosition = function () {
    if (this.slide < 0) this.slide += this.config.tokens.length;
    if (this.slide >= this.config.tokens.length)
      this.slide -= this.config.tokens.length;
    this.setPosition(this.slide);
    this.setIndex(Math.round(this.slide));
  };
  d.setPosition = function () {
    let f = (this.slide + 0.5) % 1;
    let h = this.config.height;
    let lh = this.config.letterSize;
    let tp = map(f, 0, 1, -h / 4, h / 4) + h + lh;
    this.block.style("top", -tp + "px");
  };
  d.setSlide = function (_s) {
    document.querySelector("#enter").classList.remove("disabled");
    document.querySelector("#reset").classList.remove("disabled");
    this.slide += _s.deltaY * 0.02;
    bumpTrack += _s.deltaX;
    console.log(bumpTrack);
    this.setAndPosition();
    clearInterval(this.snapInterval);
    this.snapInterval = setInterval((i) => {
      this.snap();
    }, 200);
    calcSteps();
    return false;
  };

  d.snap = function (_far) {
    //console.log("snap");
    clearInterval(this.snapInterval);
    if (!_far) this.tslide = round(this.slide);
    this.snapInterval = setInterval(() => {
      this.slide += (this.tslide - this.slide) * 0.2;
      this.setAndPosition();
      if (abs(this.slide - this.tslide) < 0.01) {
        clearInterval(this.snapInterval);
        if (this.getLetter() == this.oletter) {
          this.removeClass("changed");
          this.removeClass("maxxed");
        } else {
          this.removeClass("maxxed");
          if (stepsLeft <= 0) {
            this.addClass("maxxed");
          } else {
            this.addClass("changed");
          }
        }
        calcSteps();
      }
    }, 30);
  };
  //set the letter blocks to the appropriate token
  d.setIndex = function (_i) {
    let sft = Math.floor(this.letters.length / 2);
    for (let i = 0; i < this.letters.length; i++) {
      let ai = _i - sft + i;
      if (ai < 0) ai += this.config.tokens.length;
      if (ai >= this.config.tokens.length) ai -= this.config.tokens.length;
      this.letters[i].html(this.config.tokens.charAt(ai));
    }
  };

  //events
  d.mouseWheel(d.setSlide);

  d.elt.addEventListener("scroll", function (_event) {
    console.log(_event.target.scrollTop);
  });
  d.elt.addEventListener("pointerover", disableScroll);
  d.elt.addEventListener("pointerout", enableScroll);
  d.elt.addEventListener("mousedown", addGlobalListenersNew);
  d.elt.addEventListener("touchstart", addGlobalListenersNew);

  d.moveHandler = function (_event) {};

  d.upHandler = function () {
    clearInterval(this.moveInterval);
  };

  return d;
}

let moveIntervalNew;
let currentLetterNew;

function addGlobalListenersNew(_event) {
  if (cutting) {
    cutLetter(_event.target.parentElement.parentElement.elt);
  } else {
    _event.preventDefault();

    currentLetterNew = _event.target.parentElement.parentElement.elt;
    currentLetterNew.lastY = mouseY;

    //is this a touch event?
    if (_event.touches) currentLetterNew.lastY = _event.touches[0].clientY;

    if (_event.target.hasPointerCapture(_event.pointerId)) {
      _event.target.releasePointerCapture(_event.pointerId);
    }

    if (_event.touches) {
      htel.addEventListener("touchmove", letterMoveNew);
    } else {
      moveIntervalNew = setInterval(letterMoveNew, 30);
    }

    htel.addEventListener("touchend", letterUpNew);
    htel.addEventListener("mouseup", letterUpNew);
  }
  disableScroll();
}

function letterMoveNew(_event) {
  document.querySelector("#enter").classList.remove("disabled");
  document.querySelector("#reset").classList.remove("disabled");
  let d;

  if (_event) {
    //touch
    d = _event.touches[0].clientY - currentLetterNew.lastY;
    currentLetterNew.lastY = _event.touches[0].clientY;
  } else {
    d = mouseY - currentLetterNew.lastY;
    currentLetterNew.lastY = mouseY;
  }

  currentLetterNew.slide -= d * (isMobile ? 0.015 : 0.03);
  currentLetterNew.setAndPosition();

  calcSteps();
}

function letterUpNew(_event) {
  bumpTrack = 0;
  currentLetterNew.snap();
  clearInterval(moveIntervalNew);
  enableScroll();
}

//Scroll fixes
let scrollTop;
let scrollLeft;
function disableScroll(_event) {
  console.log("disable scroll");
  // Get the current page scroll position
  scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  (scrollLeft = window.pageXOffset || document.documentElement.scrollLeft),
    // if any scroll is attempted, set this to the previous value
    (window.onscroll = function () {
      window.scrollTo(scrollLeft, scrollTop);
    });

  document.querySelector("body").style.overflow = "hidden";
}

function enableScroll(_event) {
  window.onscroll = function () {};
  document.querySelector("body").style.overflow = "scroll";
}

//Score tracking stuff
function reportScore(_score) {
  let human = document.querySelector("#isHuman").checked;

  let data = {
    word: seedWord,
    score: _score,
    isHuman: human,
    wordPath: doneWords.join("|"),
  };
  fetch("/score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => {
    let scoreObj = res.json().then((scoreObj) => {
      console.log(scoreObj);
      console.log("Request complete! response:", scoreObj.score);
      if (scoreObj.score > highScore && !challenge) {
        highScore = scoreObj.score;
        displayHigh = scoreObj.avg;
        goodScore = scoreObj.avg;
        awesomeScore = scoreObj.good;
        setScore();
      }
      if (scoreObj.avg) {
        console.log("Average:" + scoreObj.avg);

        if (scoreObj.avg > highScore) scoreObj.avg = highScore / 2;
        if (document.querySelector("#medianLabel")) {
          document.querySelector("#medianBack").style.width =
            (scoreObj.avg / highScore + 0.05) * 100 + "%";
          document.querySelector("#medianLabel").style.left =
            (scoreObj.avg / highScore + 0.05) * 100 + "%";
        } else {
          document.querySelector("#avgLabel").innerHTML = "average "; // + scoreObj.avg;
          document.querySelector("#avg").style.left =
            (scoreObj.avg / highScore) * 100 + "%";
          console.log((scoreObj.avg / highScore) * 100 + "%");
        }
      }
    });
  });
}

function bump(_right) {
  document.querySelector("#enter").classList.remove("disabled");
  document.querySelector("#reset").classList.remove("disabled");
  if (!isMobile) {
    document.querySelector("#wordDisplay").classList.add("shake-horizontal");
    document.querySelector("#wordDisplay").classList.add("shake-constant");
    shake = setInterval(stopShakeBump, 70);
  }

  document.querySelector("#enter").classList.remove("disabled");
  document.querySelector("#reset").classList.remove("disabled");
  let _letters = referenceWord.split("");
  if (_right) {
    _letters.push(_letters.shift());
    turnBump++;

    if (turnBump % referenceWord.length <= max(referenceWord.length / 2)) {
      //stepsLeft --;
    } else {
      //stepsLeft ++;
    }
    setSteps();
  } else {
    _letters.unshift(_letters.pop());
    turnBump--;
  }
  let bi = abs(turnBump % referenceWord.length);
  if (bi > floor(referenceWord.length / 2)) bi = referenceWord.length - bi;
  console.log(bi);
  stepsLeft -= bi - lastBump;
  setSteps();
  lastBump = bi;
  //oi -> [0,1,2,3,4]
  //bi -> [1,2,3,2,1]
  buildWord(_letters.join(""), false, true);
}

let focusIndex = 0;
let focused = false;

function setFocus() {
  tumblers.forEach((t) => {
    t.elt.classList.remove("focus");
  });
  tumblers[focusIndex].elt.classList.add("focus");
  focused = true;
}

function keyPressed() {
  if (keyCode === LEFT_ARROW) {
    if (!focused) {
      setFocus();
    } else {
      focusIndex--;
      if (focusIndex < 0) focusIndex = currentWord.length - 1;
      setFocus();
    }
  } else if (keyCode === RIGHT_ARROW) {
    if (!focused) {
      setFocus();
    } else {
      focusIndex++;
      if (focusIndex == currentWord.length) focusIndex = 0;
    }
    setFocus();
  } else if (keyCode == UP_ARROW) {
    document.querySelector("#enter").classList.remove("disabled");
    document.querySelector("#reset").classList.remove("disabled");
    let _i = tumblers[focusIndex].slide++;
    tumblers[focusIndex].snap();
    return false;
  } else if (keyCode == DOWN_ARROW) {
    document.querySelector("#enter").classList.remove("disabled");
    document.querySelector("#reset").classList.remove("disabled");
    let _i = tumblers[focusIndex].slide--;
    tumblers[focusIndex].snap();
    return false;
  } else if (keyCode == ENTER) {
    checkWord();
  } else if (keyCode == ESCAPE) {
    cutting = false;
    document.querySelector("#cuts").classList.remove("toggle");
  }
}
