const fs = require("fs");
const merge = require('easy-pdf-merge')
const { folderPath, cookieOjbs,isMerge } = require("./config");
module.exports = (browser, url) => {
    return new Promise(async (resolve, reject) => {
        let listObj = {};
        let bookTitle = "";
        let sectionsElement = [];
        const page = await browser.newPage();
        await page.goto(url);
        await page.setCookie(...cookieOjbs);
        page.on("requestfinished", async (req) => {
            if (req.resourceType() == "xhr" || req.resourceType() == "fetch") {
                // 目录获取完成
                if (req.url().indexOf("api.juejin.cn/booklet_api/v1/booklet/get") + 1) {
                    sectionsElement = await page.$$(".section-list>.section .title-text");
                    // 移除遮挡元素，打印格式调整
                    await page.evaluate(() => {
                        document.querySelector(".dark-mode-notification")?.remove();
                        document.querySelector(".book-content__header")?.remove();
                        document.querySelector(".book-handle")?.remove();
                        // document.querySelector(".section-page").style.padding = "0";
                        document.querySelector(".book-body").style.padding = "0";
                    });
                    bookTitle = (await req.response().json()).data.booklet.base_info.title;
                    for (let i in sectionsElement) {
                        for (let section of (await req.response().json()).data.sections) {
                            if (!listObj[section.section_id]) listObj[section.section_id] = section;
                            if (listObj[section.section_id].title === (await (await sectionsElement[i].getProperty("innerHTML")).jsonValue())) {
                                listObj[section.section_id]["element"] = sectionsElement[i];
                                listObj[section.section_id]["index"] = Number(i) + 1;
                            }
                        }
                    }
                    
                }
                // 章节内容获取完成
                if (req.url().indexOf("api.juejin.cn/booklet_api/v1/section/get") + 1) {
                    setTimeout(async () => {
                        // TODO:先建个死循环，直到listObj[section_id]有值
                        let { section_id } = JSON.parse(req.postData());
                        while (true) {
                            if (listObj[section_id]) {
                                break;
                            }
                        }
                        await page.evaluate((x) => {
                            let h1 = document.createElement("h1");
                            h1.appendChild(document.createTextNode(x));
                            document.querySelector(".section-page")?.prepend(h1);
                        }, listObj[section_id].title);
                        let md = (await req.response().json()).data.section.markdown_show;
                        let html = (await req.response().json()).data.section.content;
                        try {
                            fs.statSync(`${folderPath}/${bookTitle}/md`);
                            fs.statSync(`${folderPath}/${bookTitle}/pdf`);
                            fs.statSync(`${folderPath}/${bookTitle}/html`);
                        } catch {
                            // stat = fs.mkdirSync(`${folderPath}/${bookTitle}`,{ recursive: true })
                            fs.mkdirSync(`${folderPath}/${bookTitle}/md`, { recursive: true });
                            fs.mkdirSync(`${folderPath}/${bookTitle}/pdf`, { recursive: true });
                            fs.mkdirSync(`${folderPath}/${bookTitle}/html`, { recursive: true });
                        }
                        fs.writeFileSync(`${folderPath}/${bookTitle}/md/${listObj[section_id].index}.${listObj[section_id].title}.md`, md);
                        fs.writeFileSync(`${folderPath}/${bookTitle}/html/${listObj[section_id].index}.${listObj[section_id].title}.html`, html);
                        await page.pdf({ path: `${folderPath}/${bookTitle}/pdf/${listObj[section_id].index}.${listObj[section_id].title}.pdf`, format: "A4" });
                        console.log(`${bookTitle}-${listObj[section_id].index}.${listObj[section_id].title}--ok哒！`)
                        listObj[section_id].isDone = true;
                        let count = 0;
                        let mergeArr = [];
                        for (let i in listObj) {
                            if (!listObj[i].isDone) {
                                if(!listObj[i].element){
                                    console.log(`缺失章节--${listObj[i].title}`)
                                    break;
                                }
                                await listObj[i].element.click({ delay: 100 });
                                break;
                            }
                            count++;
                            mergeArr.push(`${folderPath}/${bookTitle}/pdf/${listObj[i].index}.${listObj[i].title}.pdf`)
                            if (count == Object.keys(listObj).length) {

                                // resolve(`${bookTitle}--全部ok哒！`)
                                if(isMerge){
                                    mergeArr.sort((a,b)=>a.index<b.index? -1:1)
                                    await merge(mergeArr,`${folderPath}/${bookTitle}/${bookTitle}.pdf`,{maxBuffer:1024*1024*100},()=>console.log(`${bookTitle}--合并ok哒！`))
                                }
                                resolve(`${bookTitle}--全部ok哒！`)
                                page.close();
                            }
                        }
                    }, 500);
                }
            }
        });
    });
};

// (async () => {
//     let sectionsElement = [];
//     // const browser = await puppeteer.launch({
//     //     headless: false,
//     //     defaultViewport: { width: 1920, height: 5000 },
//     // });
//     const page = await browser.newPage();
//     await page.goto("https://juejin.cn/book/7049273428938850307/section/7049661680644522023?enter_from=course_center&utm_source=course_center");
//     await page.setCookie(...cookieOjbs);
//     page.on("requestfinished", async (req) => {
//         if (req.resourceType() == "xhr" || req.resourceType() == "fetch") {
//             // 目录获取完成
//             if (req.url().indexOf("api.juejin.cn/booklet_api/v1/booklet/get") + 1) {
//                 sectionsElement = await page.$$(".section-list>.section .title-text");
//                 bookTitle = (await req.response().json()).data.booklet.base_info.title;
//                 for (let i in sectionsElement) {
//                     for (let section of (await req.response().json()).data.sections) {
//                         if (!listObj[section.section_id]) listObj[section.section_id] = section;
//                         if (listObj[section.section_id].title === (await (await sectionsElement[i].getProperty("innerText")).jsonValue())) {
//                             listObj[section.section_id]["element"] = sectionsElement[i];
//                             listObj[section.section_id]["index"] = Number(i) + 1;
//                         }
//                     }
//                 }
//                 // 移除遮挡元素，打印格式调整
//                 await page.evaluate(() => {
//                     document.querySelector(".dark-mode-notification")?.remove();
//                     document.querySelector(".book-content__header")?.remove();
//                     document.querySelector(".book-handle")?.remove();
//                     // document.querySelector(".section-page").style.padding = "0";
//                     document.querySelector(".book-body").style.padding = "0";
//                 });
//             }
//             // 章节内容获取完成
//             if (req.url().indexOf("api.juejin.cn/booklet_api/v1/section/get") + 1) {
//                 setTimeout(async () => {
//                     let { section_id } = JSON.parse(req.postData());
//                     await page.evaluate((x) => {
//                         let h1 = document.createElement("h1");
//                         h1.appendChild(document.createTextNode(x));
//                         document.querySelector(".section-page")?.prepend(h1);
//                     }, listObj[section_id].title);
//                     let md = (await req.response().json()).data.section.markdown_show;
//                     let html = (await req.response().json()).data.section.content;
//                     try {
//                         fs.statSync(`${folderPath}/${bookTitle}/md`);
//                         fs.statSync(`${folderPath}/${bookTitle}/pdf`);
//                         fs.statSync(`${folderPath}/${bookTitle}/html`);
//                     } catch {
//                         // stat = fs.mkdirSync(`${folderPath}/${bookTitle}`,{ recursive: true })
//                         fs.mkdirSync(`${folderPath}/${bookTitle}/md`, { recursive: true });
//                         fs.mkdirSync(`${folderPath}/${bookTitle}/pdf`, { recursive: true });
//                         fs.mkdirSync(`${folderPath}/${bookTitle}/html`, { recursive: true });
//                     }
//                     fs.writeFileSync(`${folderPath}/${bookTitle}/md/${listObj[section_id].index}.${listObj[section_id].title}.md`, md);
//                     fs.writeFileSync(`${folderPath}/${bookTitle}/html/${listObj[section_id].index}.${listObj[section_id].title}.html`, html);
//                     await page.pdf({ path: `${folderPath}/${bookTitle}/pdf/${listObj[section_id].index}.${listObj[section_id].title}.pdf`, format: "A4" });
//                     listObj[section_id].isDone = true;
//                     let count = 0;
//                     for (let i in listObj) {
//                         if (!listObj[i].isDone) {
//                             console.log(await (await listObj[i].element.getProperty("innerText")).jsonValue());
//                             await listObj[i].element.click({ delay: 100 });
//                             break;
//                         }
//                         count++;
//                         if (count == Object.keys(listObj).length) {
//                             page.close();
//                         }
//                     }
//                 }, 1500);
//                 // 关闭浏览器
//                 // await browser.close();
//             }
//         }
//     });
// })();
