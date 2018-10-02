const Operation = require('./Operation');
const axios = require('axios');
var cheerio = require('cheerio');
var cheerioAdv = require('cheerio-advanced-selectors');
cheerio = cheerioAdv.wrap(cheerio);
// debugger;
//***for debugging *******/
var overallSeconds = 0;
//*********************** */
class CompositeOperation extends Operation {//Abstract class, that deals with "composite" operations, like a link(a link can hold other links, or "leaves", like data or image operations).

    addOperation(operationObject) {//Ads a reference to a operation object
        // debugger;
        // const yoyo = operationObject instanceof Operation;
        if (!(operationObject instanceof Operation)) {
            throw 'Child operation must be of type Operation! Check your "addOperation" calls.'
        }
        // console.log(operationObject instanceof Operation)
        this.operations.push(operationObject)
    }

    stripTags(responseObject) {//Cleans the html string from script and style tags.

        responseObject.data = responseObject.data.replace(/<style[^>]*>[\s\S]*?(<\/style[^>]*>|$)/ig, '').replace(/<\s*script[^>]*>[\s\S]*?(<\s*\/script[^>]*>|$)/ig)

    }

    async processOneScrapingObject(scrapingObject) {//Will process one scraping object, including a pagination object.

        if (scrapingObject.type === 'pagination') {//If the scraping object is actually a pagination one, a different function is called. 
            return this.paginate(scrapingObject);
        }

        let href = scrapingObject.address;
        try {
            // if (this.scraper.fakeErrors && scrapingObject.type === 'pagination') { throw 'faiiiiiiiiiil' };
            if (this.processUrl) {
                try {
                    href = await this.processUrl(href)
                    // console.log('new href', href)
                } catch (error) {
                    console.error('Error processing URL, continuing with original one: ', href);
                }

            }


            var response = await this.getPage(href);
            // debugger;
            if (this.beforeOneLinkScrape) {//If a "getResponse" callback was provided, it will be called
                if (typeof this.beforeOneLinkScrape !== 'function')
                    throw "'beforeOneLinkScrape' callback must be a function";
                await this.beforeOneLinkScrape(response)
            }
            // console.log('response.data after callback',response.data)
            scrapingObject.successful = true


        } catch (error) {
            const errorString = `There was an error opening page ${href}, ${error}`;
            this.errors.push(errorString);
            this.handleFailedScrapingObject(scrapingObject, errorString);
            return;

        }

        try {
            var dataFromChildren = await this.scrapeChildren(this.operations, response)
            response = null;

            if (this.afterOneLinkScrape) {
                if (typeof this.afterOneLinkScrape !== 'function')
                    throw "'afterOneLinkScrape' callback must be a function";

                const cleanData = {
                    address:href,
                    data:[]
                };

                dataFromChildren.forEach((dataFromChild) => {
                    // cleanData.data.push(this.createPresentableData(dataFromChild));
                    cleanData.data.push(dataFromChild);
                    // cleanData.push(dataFromChild)
                })
                await this.afterOneLinkScrape(cleanData);
            }
            scrapingObject.data = [...dataFromChildren];
        } catch (error) {
            console.error(error);
        }

    }

    async scrapeChildren(childOperations, passedData, responseObjectFromParent) {//Scrapes the child operations of this OpenLinks object.

        const scrapedData = []
        for (let operation of childOperations) {
            const dataFromChild = await operation.scrape(passedData, responseObjectFromParent);

            scrapedData.push(dataFromChild);//Pushes the data from the child

        }
        responseObjectFromParent = null;
        return scrapedData;
    }

    async paginate(scrapingObject) {//Divides a given page to multiple pages.

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
            if (this.pagination.queryString) {
                paginationUrl = `${scrapingObject.address}${mark}${this.pagination.queryString}=${i}`;
            } else {
                paginationUrl = `${scrapingObject.address}/${this.pagination.routingString}/${i}`;

            }
            if (this.pagination.processPaginationUrl) {
                try {
                    paginationUrl = await this.pagination.processPaginationUrl(paginationUrl)
                    // console.log('new href', url)
                } catch (error) {
                    console.error('Error processing URL, continuing with original one: ', paginationUrl);

                }

            }
            paginationObject = this.createScrapingObject(paginationUrl);
            scrapingObjects.push(paginationObject);

        }

        scrapingObject.data = [...scrapingObjects];
        await this.executeScrapingObjects(scrapingObjects, 3);//The argument 3 forces lower promise limitation on pagination.
    }





    async getPage(href, bypassError) {//Fetches the html of a given page.

        const asyncFunction = async () => {
            this.scraper.currentlyRunning++;
            console.log('opening page', href);
            console.log('currentlyRunning:', this.scraper.currentlyRunning);
            // console.log('delay from page', this.scraper.delay)
            await this.createDelay();
            this.scraper.numRequests++
            console.log('overall requests', this.scraper.numRequests)
            let resp;
            try {
                var begin = Date.now()


                resp = await axios({
                    method: 'get', url: href,
                    timeout: this.scraper.config.timeout,
                    auth: this.scraper.config.auth,
                    headers: this.scraper.config.headers,
                    // httpAgent: new http.Agent({ keepAlive: true }),
                    // httpsAgent: new https.Agent({ keepAlive: true }),
                })
                console.log(resp)
                // console.log('before strip',sizeof(resp.data))                           
                this.stripTags(resp);
                // console.log('after strip',sizeof(resp.data))
                // console.log(resp.data)
            } catch (error) {
                // console.error('error code from axios',error.response.status);
                throw error;
            }
            finally {
                const end = Date.now();
                const seconds = (end - begin) / 1000
                // console.log('seconds: ', seconds);
                overallSeconds += seconds;
                // overallPageRequests++
                this.scraper.currentlyRunning--;
                console.log('this.scraper.currentlyRunning:', this.scraper.currentlyRunning);
            }
            return resp;
        }

        return await this.repeatPromiseUntilResolved(() => { return this.qyuFactory(asyncFunction) }, href, bypassError);

    }


}


module.exports = CompositeOperation;