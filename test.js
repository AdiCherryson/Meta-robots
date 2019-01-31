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

function writeResults(stream, Metrics) {
  stream.write(Metrics.url);
  stream.write(' ')
  //Performance metrics
  for(let key in Metrics.performance) {
    stream.write(Metrics.performance[key].toString());
    stream.write(' ');
  }
  //Indexability status
  for(let key in Metrics.indexability) {
    stream.write(Metrics.indexability[key].toString());
    stream.write(' ');
  }
  //Canonicalization status
  for(let key in Metrics.canonicalization) {
    stream.write(Metrics.canonicalization[key].toString());
    stream.write(' ');
  }
  //Number of tags With and Without JavaScript
  for(let key in Metrics.numberOfTags) {
    stream.write(Metrics.numberOfTags[key].toString());
    stream.write(' ');
  }
  stream.write("\n");
}

function isIndexable(robotsList) {
  let indexable = true;
  if (robotsList.toString().includes("noindex")) indexable = false;

  return indexable;
}
function isCanonicalised(url, canonicalsList) {
  let canonicalised = false;
  for (let i = 0; i < canonicalsList.length; i++) {
    if (canonicalsList[i].toString() != url) return true;      
    else canonicalised = 'self';
  }
  return canonicalised;
}

async function processFile() {
  let browser, page;
  let Metrics = {
    url: "",
    performance: {
      TTFB: "",
      trueTTFB: "",
    },
    indexability: {
      withoutJavascript: "",
      withJavaScript: "",
    },    
    canonicalization: {
      withoutJavaScript: "",
      withJavaScript: "",
    },
    numberOfTags: {
      canonicalsWithoutJavaScirpt: "",
      canonicalsWithJavaScirpt: "",
      robotsWithoutJavaScript: "",
      robotsWithJavaScriptS: ""
    }
  };
  let canonicalsList, robotsList;

  const lr = new LineByLineReader(".\\Adresy.csv");
  var stream = fs.createWriteStream(".\\Czasy.txt", {
    flags: "a",
    encoding: "utf8"
  });

  //File opened, initialize protocol
  lr.on("open", async function(err) {
    lr.pause();
    stream.write("URL TTFB trueTTFB indexable(noJS) indexable(js) canonicalised(nojs) canonicalised(js) canonicaltags(nojs) canonicaltags(js) robotsTags(nojs) robotstags(js)\n");
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
    Metrics.url = page.url();
    //Measure performance
    [Metrics.performance.TTFB, Metrics.performance.trueTTFB] = await performance.measurePerformance(
      page
    );

    canonicalsList = await tags.extractCanonicals(page);
    Metrics.numberOfTags.canonicalsWithJavaScirpt = canonicalsList.length;
    Metrics.canonicalization.withJavaScript = isCanonicalised(url, canonicalsList);

    robotsList = await tags.extractRobotsTag(page);
    Metrics.numberOfTags.robotsWithJavaScriptS = robotsList.length;
    Metrics.indexability.withJavaScript = isIndexable(robotsList);

    //Turn JavaScript OFF
    await page.setJavaScriptEnabled(false);
    await page.reload();

    canonicalsList = await tags.extractCanonicals(page);
    Metrics.numberOfTags.canonicalsWithoutJavaScirpt = canonicalsList.length;
    Metrics.canonicalization.withoutJavaScript = isCanonicalised(url, canonicalsList);

    robotsList = await tags.extractRobotsTag(page);
    Metrics.numberOfTags.robotsWithoutJavaScript = robotsList.length;
    Metrics.indexability.withoutJavascript = await isIndexable(robotsList);

    console.log(Metrics);
    writeResults(stream, Metrics);

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
processFile();
