const Operation = require('./Operation');
var cheerio = require('cheerio');
var cheerioAdv = require('cheerio-advanced-selectors');
cheerio = cheerioAdv.wrap(cheerio);
const URL = require('url').URL;
const Promise = require('bluebird');




class InterneticOperation extends Operation {//Base class for all operations that require reaching out to the internet.

    
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

    async executeScrapingObjects(scrapingObjects, overwriteConcurrency) {//Will execute scraping objects with concurrency limitation.
        // console.log('overwriteConcurrency', overwriteConcurrency)
        await Promise.map(scrapingObjects, (scrapingObject) => {
            return this.processOneScrapingObject(scrapingObject);
        }, { concurrency: overwriteConcurrency ? overwriteConcurrency : this.scraper.config.concurrency })
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
        // let currentSpacer = this.requestSpacer;
        // this.requestSpacer = (async () => {
        //     await currentSpacer;
        //     await Promise.delay(this.delay);
        // })();
        let currentSpacer = this.scraper.requestSpacer;
        this.scraper.requestSpacer = currentSpacer.then(() => Promise.delay(this.scraper.config.delay));
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

}

module.exports = InterneticOperation;