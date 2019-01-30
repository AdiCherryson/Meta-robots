"use strict";
const fs = require("fs");
const puppeteer = require("puppeteer");
const LineByLineReader = require("line-by-line");
const tags = require("./tags.js");
const performance = require("./performance.js");

function initializeBrowser() {
  return new Promise(async (resolve, reject) => {
    try {
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
      await resolve([browser, page]);
    } catch (err) {
      reject(err);
    }
  });
}

function writePeroformanceResults(stream, TTFB, trueTTFB, page) {
  console.log("TTFB: ", TTFB);
  console.log("trueTTFB: ", trueTTFB);
  stream.write(page.url());
  stream.write(" ");
  stream.write(TTFB);
  stream.write(" ");
  stream.write(trueTTFB);
  stream.write("\n");
}

function writeTagsResults(
  URL,
  canonicalsList,
  robotsList,
  jsCanonicalsList,
  jsRobotsList
) {
  if (canonicalsList.toString() == jsCanonicalsList.toString()) {
    console.log("JavaScript doesn't change canonical links");
  } else {
    console.log("JavaScript changed canonical links!");
  }
  if (robotsList.toString() == jsRobotsList.toString()) {
    console.log("JavaScript doesn't change meta-robots tags");
  } else {
    console.log("JavaScript changed meta-robots tags!");
  }
  console.log(
    "The page has",
    canonicalsList.length,
    "Canonical link(s) with the Javascript turned off, and ",
    jsCanonicalsList.length,
    "with JS turned ON."
  );
  console.log(
    "The page has",
    robotsList.length,
    "meta-robots tag(s) with the Javascript turned off, and ",
    jsRobotsList.length,
    "with JS turned ON."
  );
  if (
    isIndexable(URL, canonicalsList, robotsList, jsCanonicalsList, jsRobotsList)
  )
    console.log("The page is indexable");
  else console.log("The page is not indexable");
}

function isIndexable(
  URL,
  canonicalsList,
  robotsList,
  jsCanonicalsList,
  jsRobotsList
) {
  let indexable = true;
  for (i = 0; i < canonicalsList.legth; i++) {
    if (canonicalsList[i].toString() != URL) indexable = false;
  }
  for (i = 0; i < jsCanonicalsList.legth; i++) {
    if (jsCanonicalsList[i].toString() != URL) indexable = false;
  }
  if (robotsList.toString().includes("noindex")) indexable = false;
  if (jsRobotsList.toString().includes("noindex")) indexable = false;

  return indexable;
}

async function readLines() {
  let browser, page;
  let robotsList, canonicalsList, jsRobotsList, jsCanonicalsList;
  let TTFB, trueTTFB;

  const lr = new LineByLineReader(".\\Adresy.csv");
  var stream = fs.createWriteStream(".\\Czasy.txt", {
    flags: "a",
    encoding: "utf8"
  });

  //File opened, initialize protocol
  lr.on("open", async function(err) {
    lr.pause();
    stream.write("URL TTFB trueTTFB\n");
    [browser, page] = await initializeBrowser();
    lr.resume();
  });

  //New line intercepted
  lr.on("line", async function(url) {
    // pause emitting of lines...
    lr.pause();

    try {
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 300000
      });
    } catch (error) {
      console.log(error, "at ", url);
    }
    //Measure performance
    [TTFB, trueTTFB] = await performance.measurePerformance(page);
    //Log and write results
    writePeroformanceResults(stream, TTFB, trueTTFB, page);

    jsCanonicalsList = await tags.extractCanonicals(page);
    jsRobotsList = await tags.extractRobotsTag(page);
    //Turn JavaScript OFF
    await page.setJavaScriptEnabled(false);
    await page.reload();

    canonicalsList = await tags.extractCanonicals(page);
    robotsList = await tags.extractRobotsTag(page);

    writeTagsResults(
      url,
      canonicalsList,
      robotsList,
      jsCanonicalsList,
      jsRobotsList
    );

    //Restart browser (because of persistent connection for TTFB measurements)
    await browser.close();
    initializeBrowser()
      .then(results => {
        [browser, page] = results;
      })
      .catch(err => {
        console.log("Cannot initialize browser");
      });

    setTimeout(async function() {
      // ...and continue emitting lines
      console.log();
      lr.resume();
    }, 10000);
  });

  //File reader error handling
  lr.on("error", function(err) {
    console.log(err);
  });

  lr.on("end", function() {
    // All lines are read, file is closed now.
    browser.close();
  });
}
readLines();
