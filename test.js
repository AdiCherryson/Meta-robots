"use strict";
const fs = require("fs");
const puppeteer = require("puppeteer");
const LineByLineReader = require("line-by-line");
const tags = require("./tags.js");
const performance = require("./performance.js");
const lr = new LineByLineReader("C:\\Users\\Marcin\\Desktop\\Adresy.csv");
var stream = fs.createWriteStream("C:\\Users\\Marcin\\Desktop\\Czasy.txt", {
  flags: "a",
  encoding: "utf8"
});
let browser, page;
let robotsList, canonicalsList;
let TTFB, trueTTFB;

async function InitializeBrowser() {
  browser = await puppeteer.launch({ headless: true });
  page = await browser.newPage();
}

lr.on("open", async function(err) {
  lr.pause();
  stream.write("URL TTFB trueTTFB\n");
  await InitializeBrowser();
  lr.resume();
});

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
  console.log("TTFB: ", TTFB);
  console.log("trueTTFB: ", trueTTFB);
  stream.write(page.url());
  stream.write(" ");
  stream.write(TTFB);
  stream.write(" ");
  stream.write(trueTTFB);
  stream.write("\n");

  robotsList = await tags.extractRobotsTag(page);
  canonicalsList = await tags.extractCanonicals(page);
  console.log(robotsList);
  console.log(canonicalsList);

  //Turn JavaScript OFF
  await page.setJavaScriptEnabled(false);
  await page.reload();
  
  robotsList = await tags.extractRobotsTag(page);
  canonicalsList = await tags.extractCanonicals(page);
  console.log(robotsList);
  console.log(canonicalsList);

  console.log();

  setTimeout(async function() {
    // ...and continue emitting lines.
    await browser.close();
    await InitializeBrowser();
    lr.resume();
  }, 10000);
});

lr.on("error", function(err) {
  console.log(err);
});

lr.on("end", function() {
  // All lines are read, file is closed now.
  browser.close();
});
