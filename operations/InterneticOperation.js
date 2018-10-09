const Operation = require('./Operation');
var cheerio = require('cheerio');
var cheerioAdv = require('cheerio-advanced-selectors');
cheerio = cheerioAdv.wrap(cheerio);
const URL = require('url').URL;
const Promise = require('bluebird');


class InterneticOperation extends Operation{//Base class for all operations that require reaching out to the internet.
    stripTags(responseObject) {//Cleans the html string from script and style tags.

        responseObject.data = responseObject.data.replace(/<style[^>]*>[\s\S]*?(<\/style[^>]*>|$)/ig, '').replace(/<\s*script[^>]*>[\s\S]*?(<\s*\/script[^>]*>|$)/ig)

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

    async processOneScrapingObject(scrapingObject) {//Will process one scraping object, including a pagination object.

        if (scrapingObject.type === 'pagination') {//If the scraping object is actually a pagination one, a different function is called. 
            return this.paginate(scrapingObject);
        }

        let href = scrapingObject.address;
        try {
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
            if (this.beforeOneLinkScrape) {//If a "getResponse" callback was provided, it will be called
                if (typeof this.beforeOneLinkScrape !== 'function')
                    throw "'beforeOneLinkScrape' callback must be a function";
                await this.beforeOneLinkScrape(response)
            }
            // console.log('response.data after callback',response.data)
            scrapingObject.successful = true


        } catch (error) {
            // debugger;
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

    async repeatPromiseUntilResolved(promiseFactory, href, retries = 0) {//Repeats a given failed promise few times(not to be confused with "repeatErrors()").

        const errorCodesToSkip = [404];
        const randomNumber = this.scraper.config.fakeErrors ? Math.floor(Math.random() * (3 - 1 + 1)) + 1 : 3;
        if (this.scraper.state.numRequests > 3 && randomNumber == 1) {
            throw 'randomly generated error,' + href;
        }

        const maxRetries = this.scraper.config.maxRetries;
        try {
            // overallRequests++
            // console.log('overallRequests', overallRequests)

            return await promiseFactory();
        } catch (error) {


            const errorCode = error.response ? error.response.status : error
            console.log('error code', errorCode);
            if (errorCodesToSkip.includes(errorCode))
                throw `Skipping error ${errorCode}`;
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

    handleFailedScrapingObject(scrapingObject, errorString) {
        // debugger;
        console.error(errorString);
        scrapingObject.error = errorString;
        if (!this.scraper.state.failedScrapingObjects.includes(scrapingObject)) {
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

module.exports= InterneticOperation;