"use strict";
const LineByLineReader = require("line-by-line");
const fs = require("fs");
const tags = require("./tags.js");
const performance = require("./performance.js");
const manipulate = require("./manipulate.js");

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
    },
    Lists: {
      canonicalsWithoutJavaScript: "",
      canonicalsWithJavaScript: "",
      robotsWithoutJavaScript: "",
      robotsWithJavaScript: ""
    } 
  };

async function processFile(Metrics) {
  let browser, page;

  const lr = new LineByLineReader(".\\Adresy.csv");
  var stream = fs.createWriteStream(".\\Czasy.txt", {
    flags: "a",
    encoding: "utf8"
  });

  //File opened, initialize protocol
  lr.on("open", async function(err) {
    lr.pause();
    stream.write("URL TTFB trueTTFB indexable(noJS) indexable(js) canonicalised(nojs) canonicalised(js) canonicaltags(nojs) canonicaltags(js) robotsTags(nojs) robotstags(js)\n");
    [browser, page] = await manipulate.initializeBrowser();
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

    Metrics.Lists.canonicalsWithJavaScript = await tags.extractCanonicals(page);
    Metrics.numberOfTags.canonicalsWithJavaScirpt = Metrics.Lists.canonicalsWithJavaScript.length;
    Metrics.canonicalization.withJavaScript = tags.isCanonicalised(url, Metrics.Lists.canonicalsWithJavaScript);

    Metrics.Lists.robotsWithJavaScript = await tags.extractRobotsTag(page);
    Metrics.numberOfTags.robotsWithJavaScriptS = Metrics.Lists.robotsWithJavaScript.length;
    Metrics.indexability.withJavaScript = tags.isIndexable(Metrics.Lists.robotsWithJavaScript);

    //Turn JavaScript OFF
    await page.setJavaScriptEnabled(false);
    await page.reload();

    Metrics.Lists.canonicalsWithoutJavaScript = await tags.extractCanonicals(page);
    Metrics.numberOfTags.canonicalsWithoutJavaScirpt = Metrics.Lists.canonicalsWithoutJavaScript.length;
    Metrics.canonicalization.withoutJavaScript = tags.isCanonicalised(url, Metrics.Lists.canonicalsWithoutJavaScript);

    Metrics.Lists.robotsWithoutJavaScript = await tags.extractRobotsTag(page);
    Metrics.numberOfTags.robotsWithoutJavaScript = Metrics.Lists.robotsWithoutJavaScript.length;
    Metrics.indexability.withoutJavascript = tags.isIndexable(Metrics.Lists.robotsWithoutJavaScript);

    console.log(Metrics);
    manipulate.writeResults(stream, Metrics);

    //Restart browser (because of persistent connection for TTFB measurements)
    await browser.close();
    manipulate.initializeBrowser()
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
processFile(Metrics);
