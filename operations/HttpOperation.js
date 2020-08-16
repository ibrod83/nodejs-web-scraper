const Operation = require('./Operation');
var cheerio = require('cheerio');
const { Qyu } = require('qyu');
var cheerioAdv = require('cheerio-advanced-selectors');
cheerio = cheerioAdv.wrap(cheerio);
const URL = require('url').URL;
// const Promise = require('bluebird');
const request = require('../request/request.js');
const {createDelay} = require('../utils/delay');




class HttpOperation extends Operation {//Base class for all operations that require reaching out to the internet.

    constructor(config) {
        // debugger;
        super(config)
        if (this.condition) {
            const type = typeof this.condition;
            if (type !== 'function') {
                throw new Error(`"condition" hook must receive a function, got: ${type}`)
            }
        }
    }

    createScrapingObject(href, type) {//Creates a scraping object, for all operations.
        const scrapingObject = {
            address: href,//The image href            
            referenceToOperationObject: this.referenceToOperationObject.bind(this),
            successful: false,
            data: []
        }
        if (type)
            scrapingObject.type = type;

        this.scraper.state.scrapingObjects.push(scrapingObject)

        return scrapingObject;
    }

    async emitError(error) {
        if (this.getException)
            await this.getException(error);
    }


    async repeatPromiseUntilResolved(promiseFactory, href, retries = 0) {//Repeats a given failed promise few times(not to be confused with "repeatErrors()").

        // debugger;
        const randomNumber = this.scraper.config.fakeErrors && Math.floor(Math.random() * (3 - 1 + 1)) + 1;
        // debugger;
        if (this.scraper.state.numRequests > 3 && randomNumber === 1) {

            throw 'randomly generated error,' + href;
        }

        const maxRetries = this.scraper.config.maxRetries;
        try {
            // overallRequests++
            // console.log('overallRequests', overallRequests)

            return await promiseFactory();
        } catch (error) {

            await this.emitError(error)

            // debugger;
            const errorCode = error.response ? error.response.status : error
            // console.log('Error code', errorCode);
            if (this.scraper.config.errorCodesToSkip.includes(errorCode)) {
                // debugger;
                const error = new Error();
                error.message = `Skipping error ${errorCode}`;
                // debugger;
                error.code = errorCode;
                throw error;
            }

            console.log('Retrying failed promise...error:', error, 'href:', href);
            // console.log('Retrying failed promise...error:', error);
            const newRetries = retries + 1;
            console.log('Retreis', newRetries)
            if (newRetries > maxRetries) {//If it reached the maximum allowed number of retries, it throws an error.
                throw error;
            }
            return await this.repeatPromiseUntilResolved(promiseFactory, href, newRetries);//Calls it self, as long as there are retries left.
        }

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
            paginationObject = this.createScrapingObject(paginationUrl);
            scrapingObjects.push(paginationObject);

        }

        scrapingObject.data = [...scrapingObjects];
        await this.executeScrapingObjects(scrapingObjects, 3);//The argument 3 forces lower promise limitation on pagination.
    }

    createScrapingObjectsFromRefs(refs, type) {

        const scrapingObjects = [];

        refs.forEach((href) => {
            if (href) {
                // const absoluteUrl = this.getAbsoluteUrl(baseUrlOfCurrentDomain, href)
                var scrapingObject = this.createScrapingObject(href, type);
                scrapingObjects.push(scrapingObject);
            }

        })
        return scrapingObjects;
    }

    // async executeScrapingObjects(scrapingObjects, overwriteConcurrency) {//Will execute scraping objects with concurrency limitation.
    //     // console.log('overwriteConcurrency', overwriteConcurrency)
    //     // debugger;
    //     await Promise.map(scrapingObjects, (scrapingObject) => {
    //         return this.processOneScrapingObject(scrapingObject);
    //     }, { concurrency: overwriteConcurrency ? overwriteConcurrency : this.scraper.config.concurrency })
    // }

    async executeScrapingObjects(scrapingObjects, overwriteConcurrency) {//Will execute scraping objects with concurrency limitation.

        const q = new Qyu({ concurrency: overwriteConcurrency ? overwriteConcurrency : this.scraper.config.concurrency })
        await q(scrapingObjects, (scrapingObject) => {
            return this.processOneScrapingObject(scrapingObject)
        }) 

    }


    handleFailedScrapingObject(scrapingObject, errorString, errorCode) {
        // debugger;
        // console.log('error code from handle', errorCode);
        console.error(errorString);
        scrapingObject.error = errorString;
        // debugger;
        const shouldNotBeSkipped = !this.scraper.config.errorCodesToSkip.includes(errorCode);
        if (!this.scraper.state.failedScrapingObjects.includes(scrapingObject) && shouldNotBeSkipped) {
            // console.log('scrapingObject not included,pushing it!')
            this.scraper.state.failedScrapingObjects.push(scrapingObject);
        }
    }


    qyuFactory(promiseFunction) {//This function pushes promise-returning functions into the qyu. 
        if (!this.scraper.config.useQyu) {
            return promiseFunction();
        }
        return this.scraper.qyu(promiseFunction);

    }

    async beforePromiseFactory(message) {//Runs at the beginning of the promise-returning function, that is sent to repeatPromiseUntilResolved().

        this.scraper.state.currentlyRunning++;
        console.log(message);
        console.log('currentlyRunning:', this.scraper.state.currentlyRunning);
        await this.createDelay()
        this.scraper.state.numRequests++
        console.log('overall requests', this.scraper.state.numRequests)
    }

    afterPromiseFactory() {//Runs at the end of the promise-returning function, that is sent to repeatPromiseUntilResolved().
        this.scraper.state.currentlyRunning--;
        console.log('currentlyRunning:', this.scraper.state.currentlyRunning);
    }

    async createDelay() {

        let currentSpacer = this.scraper.requestSpacer;
        // this.scraper.requestSpacer = currentSpacer.then(() => Promise.delay(this.scraper.config.delay));
        this.scraper.requestSpacer = currentSpacer.then(() => createDelay(this.scraper.config.delay));
        await currentSpacer;
    }

    getAbsoluteUrl(base, relative) {//Handles the absolute URL.
        // debugger;
        const newUrl = new URL(relative, base).toString();
        return newUrl;

    }

    getBaseUrlFromBaseTag($) {
        let baseMetaTag = $('base');

        // debugger;
        if (baseMetaTag.length == 0 || baseMetaTag.length > 1) {
            baseMetaTag = null;
        }
        else {
            baseMetaTag = baseMetaTag[0];
            var baseUrlFromBaseTag = baseMetaTag.attribs.href || null;
        }

        if (baseUrlFromBaseTag) {
            if (baseUrlFromBaseTag === '/') {
                baseUrlFromBaseTag = this.scraper.config.baseSiteUrl
            }
        }

        return baseUrlFromBaseTag;


    }

    addOperation(operationObject) {//Adds a reference to an operation object     
        // console.log(operationObject instanceof Object.getPrototypeOf(HttpOperation))
        if (!(operationObject instanceof Object.getPrototypeOf(HttpOperation))) {
            throw 'Child operation must be of type Operation! Check your "addOperation" calls.'
        }
        this.operations.push(operationObject)
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

    stripTags(responseObject) {//Cleans the html string from script and style tags.


        if (this.scraper.config.removeStyleAndScriptTags) {
            responseObject.data = responseObject.data.replace(/<\s*script[^>]*>[\s\S]*?(<\s*\/script[^>]*>|$)/ig, '');
            responseObject.data = responseObject.data.replace(/<style[^>]*>[\s\S]*?(<\/style[^>]*>|$)/ig, '');

        }
        // console.log('after strip', sizeof(responseObject.data))

    }



    async getPage(href, bypassError) {//Fetches the html of a given page.

        const promiseFactory = async () => {

            await this.beforePromiseFactory('Opening page:' + href);

            let resp;
            try {
                // resp = await axios({
                //     method: 'get', url: href,
                //     timeout: this.scraper.config.timeout,
                //     auth: this.scraper.config.auth,
                //     headers: this.scraper.config.headers,
                //     proxy:this.scraper.config.proxy
                // }) 
                resp = await request({
                    method: 'get', url: href,
                    timeout: this.scraper.config.timeout,
                    auth: this.scraper.config.auth,
                    headers: this.scraper.config.headers,
                    proxy: this.scraper.config.proxy
                    // proxy:true

                })

                // debugger;

                if (this.scraper.config.removeStyleAndScriptTags) {
                    this.stripTags(resp);
                }

                if (this.getHtml) {
                    // await this.getHtml(resp.data, resp.request.res.responseUrl)
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

        // return await this.repeatPromiseUntilResolved(() => { return this.qyuFactory(promiseFactory) }, href, bypassError);

        return await this.qyuFactory(() => this.repeatPromiseUntilResolved(promiseFactory, href, bypassError));
    }

    async processOneScrapingObject(scrapingObject) {//Will process one scraping object, including a pagination object. Used by Root and OpenLinks.

        if (scrapingObject.type === 'pagination') {//If the scraping object is actually a pagination one, a different function is called. 
            return this.paginate(scrapingObject);
        }



        let href = scrapingObject.address;
        try {
            // const rand = Math.floor(Math.random() * 10) + 1;
            // if (rand == 1) {
            //     throw new Error('yoyo')
            // }
            // if (this.state.fakeErrors && scrapingObject.type === 'pagination') { throw 'faiiiiiiiiiil' };
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
            if (this.getPageResponse) {//If a "getResponse" callback was provided, it will be called
                // debugger;
                if (typeof this.getPageResponse !== 'function')
                    throw "'getPageResponse' callback must be a function";
                await this.getPageResponse(response);

            } else if (this.beforeOneLinkScrape) {//Backward compatibility
                if (typeof this.beforeOneLinkScrape !== 'function')
                    throw "'beforeOneLinkScrape' callback must be a function";
                await this.beforeOneLinkScrape(response);
            }

            scrapingObject.successful = true


        } catch (error) {
            // debugger;
            // console.log(error)
            const errorCode = error.code
            const errorString = `There was an error opening page ${href}, ${error}`;
            this.errors.push(errorString);
            this.handleFailedScrapingObject(scrapingObject, errorString, errorCode);
            return;

        }

        try {
            // const rand = Math.floor(Math.random() * 10) + 1;
            // if(rand == 1){
            //     throw 'yoyo'
            // }
            var dataFromChildren = await this.scrapeChildren(this.operations, response)
            response = null;
            let callback;
            // debugger;
            callback = this.getPageData || this.afterOneLinkScrape;//For backward compatibility. 
            if (callback) {
                // debugger;
                if (typeof callback !== 'function')
                    throw "callback must be a function";

                const cleanData = {
                    address: href,
                    data: []
                };

                dataFromChildren.forEach((dataFromChild) => {
                    // cleanData.data.push(this.createPresentableData(dataFromChild));
                    cleanData.data.push(dataFromChild);
                    // cleanData.push(dataFromChild)
                })
                await callback(cleanData);
            }

            if (this.getPageObject) {
                // debugger;

                const tree = {
                    address: scrapingObject.address
                }
                for (let child of dataFromChildren) {
                    // debugger;
                    if (child.type === 'DownloadContent') {
                        const data = child.data.map(d => d.address);

                        tree[child.name] = data.length <= 1 ? data[0] : data
                        continue;
                    }
                    // const type = typeof child
                    // console.log(type)
                    tree[child.name] = child.data.length <= 1 ? child.data[0] : child.data
                }
                await this.getPageObject(tree)
            }


            scrapingObject.data = [...dataFromChildren];
        } catch (error) {
            // if(error.message.includes('type')){
            //     debugger;
            // }
            // debugger;
            console.error(error);
        }

    }

}

module.exports = HttpOperation;