"use strict";
const LineByLineReader = require("line-by-line");
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
  let browser, page, stream;
  const lineReader = new LineByLineReader(".\\Adresy.csv");

  //File opened, initialize protocol
  lineReader.on("open", async function() {
    lineReader.pause();
    stream = await manipulate.initializeWriteStream();
    [browser, page] = await manipulate.initializeBrowser();
    stream.write("URL TTFB trueTTFB indexable(noJS) indexable(js) canonicalised(nojs) canonicalised(js) canonicaltags(nojs) canonicaltags(js) robotsTags(nojs) robotstags(js)\n");
    lineReader.resume();
  });

  //New line intercepted
  lineReader.on("line", async function(url) {
    // pause emitting of lines...
    lineReader.pause();
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
    Metrics.canonicalization.withJavaScript = tags.isCanonicalised(Metrics.url, Metrics.Lists.canonicalsWithJavaScript);

    Metrics.Lists.robotsWithJavaScript = await tags.extractRobotsTag(page);
    Metrics.numberOfTags.robotsWithJavaScriptS = Metrics.Lists.robotsWithJavaScript.length;
    Metrics.indexability.withJavaScript = tags.isIndexable(Metrics.Lists.robotsWithJavaScript);

    //Turn JavaScript OFF
    await page.setJavaScriptEnabled(false);
    await page.reload();

    Metrics.Lists.canonicalsWithoutJavaScript = await tags.extractCanonicals(page);
    Metrics.numberOfTags.canonicalsWithoutJavaScirpt = Metrics.Lists.canonicalsWithoutJavaScript.length;
    Metrics.canonicalization.withoutJavaScript = tags.isCanonicalised(Metrics.url, Metrics.Lists.canonicalsWithoutJavaScript);

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
      lineReader.resume();
    }, 10000);
  });

  //File reader error handling
  lineReader.on("error", function(err) {
    console.log(err);
  });

  lineReader.on("end", function() {
    // All lines are read, file is closed now.
    browser.close();
  });
}
processFile(Metrics);
