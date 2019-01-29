const puppeteer = require("puppeteer");
const URL = "http://botbenchmarking.com/marcin/noindex/";
let trace;

async function extractRobotsTag(page) {
  let xpath = await page.$x("//meta[@name='robots']/@content");
  let list = new Array;

  for (i = 0; i < xpath.length; i++) {
    let robotsContent = await page.evaluate(el => el.textContent, xpath[i]);
    list.push(robotsContent)
// 
  }
  return list
}

async function run() {
  let browser = await puppeteer.launch({ headless: true });
  let page = await browser.newPage();

  // JavaScript on
  console.log("JavaScript on");
  await page.goto(URL);
  let list = await extractRobotsTag(page);
  console.log("number of meta-robots tags on page: ", list.length);
  console.log("Meta-robots content",":", list, '\n');
  page.close();

  //JavaScript off
  page = await browser.newPage();
  await page.setJavaScriptEnabled(false);

  console.log("JavaScript off");
  await page.goto(URL);
  await extractRobotsTag(page);
  list = await extractRobotsTag(page);
  console.log("number of meta-robots tags on page: ", list.length);
  console.log("Meta-robots content",":", list);

  browser.close();
}
run();
