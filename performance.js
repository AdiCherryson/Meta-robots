const puppeteer = require("puppeteer");

function evaluatePerformance(page) {
    try {
      return page.evaluate(() => {
        return performance.toJSON();
      });
    } catch (error) {
      console.log("evaluate");
      console.log(error);
    }
  }

  exports. measurePerformance = async function measurePerformance(page) {
    //Evaluate performance
    var perf = await evaluatePerformance(page);
    var TTFB = JSON.stringify(
      perf.timing.responseStart - perf.timing.requestStart
    );
    var trueTTFB = JSON.stringify(
      perf.timing.responseStart - perf.timing.fetchStart
    );
    return([TTFB, trueTTFB])
}