const request = require('../../request/request.js');
const { stripTags } = require('../../utils/html');
const ScrapingObject = require('../../ScrapingObject')
const SPA_page = require('../../limitedSpa/Page');


/**
 * @mixin
 */
const PageMixin = {
    

    paginate:async function(scrapingObject) {//Divides a given page to multiple pages.
        
        delete scrapingObject.successful;
        const scrapingObjects = [];
        const numPages = this.pagination.numPages;
        const firstPage = typeof this.pagination.begin !== 'undefined' ? this.pagination.begin : 1;
        const lastPage = this.pagination.end || numPages;
        const offset = this.pagination.offset || 1;

        for (let i = firstPage; i <= lastPage; i = i + offset) {

            const mark = scrapingObject.address.includes('?') ? '&' : '?';
            var paginationUrl;
            var paginationObject;
            // debugger;
            if (this.pagination.queryString) {
                paginationUrl = `${scrapingObject.address}${mark}${this.pagination.queryString}=${i}`;
            } else {

                paginationUrl = `${scrapingObject.address}/${this.pagination.routingString}/${i}`.replace(/([^:]\/)\/+/g, "$1");


            }
            if (this.pagination.processPaginationUrl) {
                try {
                    paginationUrl = await this.pagination.processPaginationUrl(paginationUrl)
                    // console.log('new href', url)
                } catch (error) {

                    console.error('Error processing URL, continuing with original one: ', paginationUrl);

                }

            }
            // paginationObject = this.createScrapingObject(paginationUrl);
            paginationObject = new ScrapingObject(paginationUrl,null,this.referenceToOperationObject.bind(this));
            this.scraper.state.scrapingObjects.push(scrapingObject)
            scrapingObjects.push(paginationObject);

        }

        scrapingObject.data = [...scrapingObjects];
        await this.executeScrapingObjects(scrapingObjects, 3);//The argument 3 forces lower promise limitation on pagination.
    },
    
    getPage:async function(href) {//Fetches the html of a given page.

        const promiseFactory = async () => {

            await this.beforePromiseFactory('Opening page:' + href);

            let resp;
            try {

                resp = await request({
                    method: 'get', url: href,
                    timeout: this.scraper.config.timeout,
                    auth: this.scraper.config.auth,
                    headers: this.scraper.config.headers,
                    proxy: this.scraper.config.proxy

                })
                if (this.scraper.config.removeStyleAndScriptTags) {
                    resp.data = stripTags(resp.data);
                }

                if (this.getHtml) {
                    await this.getHtml(resp.data, resp.url)
                }

            } catch (error) {
                // debugger;
                throw error;
            }
            finally {
                this.afterPromiseFactory();
            }
            return resp;
        }

        return await this.qyuFactory(() => this.repeatPromiseUntilResolved(promiseFactory, href));
    },

    SPA_getPage:async function(href, bypassError) {
        const promiseFactory = async () => {

            await this.beforePromiseFactory('Opening page:' + href);

            let mockResponse;
            try {

                // debugger;
                // var page = await this.scraper.puppeteer.createPage(href);
                // await page.init();
                // const data = await page.getHtml();
                // debugger;
                var page = new SPA_page(this.scraper.getPuppeteerSimpleInstance(), href);
                // page = page;
                // const scrollToBottom = new ScrollToBottom({ numRepetitions: 10, delay: 1500 })
                for (let virtualOperation of this.virtualOperations) {
                    page.addOperation(virtualOperation)
                }

                await page.scrape(page);
                const response = page.getResponse();
                const {status,statusText,headers,url} = response;
                const data = await page.getHtml();
                // debugger;
                // console.log(response.status)
                // debugger;
                // if (!data) {
                //     debugger
                //     console.log('no html from httpoperation');
                //     // process.exit()

                // }
                //status,statusText,headers,url
                mockResponse = {//Mocking the "request" response object, to pass to the child operation.
                    url,
                    config: {
                        url: href
                    },
                    headers,
                    statusText,
                    originalResponse: response,
                    data,
                    status,
                    // statusText: statusTexturl,
                    // headers: headers
                }

                // debugger;


                if (this.scraper.config.removeStyleAndScriptTags) {
                    stripTags(mockResponse.data);
                }

                if (this.getHtml) {
                    // await this.getHtml(resp.data, resp.request.res.responseUrl)
                    await this.getHtml(mockResponse.data, mockResponse.url)
                }
                // await page.close();
                return mockResponse;

            } catch (error) {
                // await page.close();
                debugger;
                throw error;
            } finally {
                debugger;
                // console.log('finally!')
                this.counter++;
                console.log('counter', this.counter)
                // debugger;
                // await page.close();
                page.close();
                this.afterPromiseFactory();
            }
            // return resp;
            // debugger;
            // return mockResponse;
        }

        // return await this.repeatPromiseUntilResolved(() => { return this.qyuFactory(promiseFactory) }, href, bypassError);

        return await this.qyuFactory(() => this.repeatPromiseUntilResolved(promiseFactory, href, bypassError));
    }
};


module.exports = PageMixin;