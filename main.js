const puppeteer = require("puppeteer");
const { bookLinks } = require("./config");
const runCrawling = require("./runCrawling");
(async () => {
    const browser = await puppeteer.launch({
        // headless: false,
        headless:true,
        defaultViewport: { width: 1920, height: 5000 },
    });
    for(bookLink of bookLinks){
        let res = await runCrawling(browser,bookLink);
        console.log(res);
    }
    // Promise.all(bookLinks.map((item) => runCrawling(browser, item)))
    //     .then((res) => {
    //         console.log(res);
    //     })
    //     .catch((err) => {
    //         console.log(err);
    //     });
    browser.close();
})();
