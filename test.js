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
  canonicalsList,
  robotsList,
  jsCanonicalsList,
  jsRobotsList
) {
  if (canonicalsList.toString() == jsCanonicalsList.toString()) {
    console.log("canonicale bez zmian");
  } else {
    console.log("canonicale zmienione");
  }
  if (robotsList.toString() == jsRobotsList.toString()) {
    console.log("meta-robots bez zmian");
  } else {
    console.log("meta-robots zmienione");
  }
}

async function readLines() {
  let browser, page;
  let robotsList = new Array();
  let canonicalsList = new Array();
  let jsRobotsList = new Array();
  let jsCanonicalsList = new Array();
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
      canonicalsList,
      robotsList,
      jsCanonicalsList,
      jsRobotsList
    );

    //Restart browser (because of persistent connection for TTFB measurements)
    await browser.close();
    [browser, page] = await initializeBrowser();

    setTimeout(async function() {
      // ...and continue emitting lines
      console.log();
      lr.resume();
    }, 10000);
  });

  //Error handling
  lr.on("error", function(err) {
    console.log(err);
  });

  //End of file. Cleaning
  lr.on("end", function() {
    // All lines are read, file is closed now.
    browser.close();
  });
}
readLines();
