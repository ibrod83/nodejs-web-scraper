
const URL = require('url').URL;
const Scraper = require('../Scraper.js');
const Promise = require('bluebird');
const _ = require('lodash');



class Operation {//Base abstract class for operations. "leaf" operations will inherit directly from it.

    constructor(objectConfig) {
        // debugger;
        this.scraper = Scraper.getScraperInstance();//Reference to the scraper main object.

        this.handleNewOperationCreation(this);

        if (objectConfig) {
            for (let i in objectConfig) {
                this[i] = objectConfig[i];
            }
        }
        if (!this.name)
            this.name = `Default ${this.constructor.name} name`;

        this.data = [];
        this.operations = [];//References to child operation objects.
        this.errors = [];//Holds the overall communication errors, encountered by the operation.

        // debugger;
        // console.log(this.prototype)


    }

    static useTrait(Trait,Class) {
       
        Object.keys(Trait.prototype).forEach((prop) => {
            if (Trait.prototype.hasOwnProperty(prop)) {
                Class.prototype[prop] = Class.prototype[prop] || Trait.prototype[prop];
            }
        })
       

    }

    // static extend(Trait,Class) {
        
    //     Object.keys(Trait.prototype).forEach((prop) => {
    //         if (Trait.prototype.hasOwnProperty(prop)) {
    //             Class.prototype[prop] = Class.prototype[prop] || Trait.prototype[prop];
    //         }
    //     })
       

    // }



    validateOperationArguments() {

        // debugger;
        const operationClassName = this.constructor.name;
        switch (operationClassName) {

            case 'Inquiry':
                if (typeof this.condition !== 'function')
                    throw 'Inquiry operation must be provided with a condition function.';
                break;

            case 'DownloadContent':
                if (!this.scraper.config.filePath && !this.filePath)
                    throw `DownloadContent operation Must be provided with a filePath, either locally or globally.`;
                if (!this.querySelector || typeof this.querySelector !== 'string')
                    throw `DownloadContent operation must be provided with a querySelector.`;
                break;

            case 'OpenLinks':
            case 'CollectContent':
                if (!this.querySelector || typeof this.querySelector !== 'string')
                    throw `${operationClassName} operation must be provided with a querySelector.`;
                break;

            default:
                break;
        }
    }

    handleNewOperationCreation(Operation) {
        this.scraper.state.registeredOperations.push(Operation);
    }


    createElementList($) {
        const nodeList = this.createNodeList($);
        const elementList = [];
        nodeList.each((index, node) => {

            elementList.push($(node))

        })
        if (this.getElementList) {
            this.getElementList(elementList);
        }
        return elementList;
    }

    createNodeList($) {//Gets a cheerio object and creates a nodelist. Checks for "getNodeList" user callback.       

        const nodeList = this.slice ? $(this.querySelector).slice(typeof this.slice === 'number' ? this.slice : this.slice[0], this.slice[1]) : $(this.querySelector);

        return nodeList;
    }

    // processRelativeSrc(src) {
    //     let newSrc;
    //     const isRelativeUrl = !src.includes('http') && !src.includes('www.')
    //     if (isRelativeUrl && src.charAt(0) !== "/") {
    //         newSrc = "/" + src;
    //     } else {
    //         newSrc = src;
    //     }
    //     return newSrc;
    // }

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

    createWrapper(address) {
        const currentWrapper = {//The envelope of all scraping objects, created by this operation. Relevant when the operation is used as a child, in more than one place.
            type: this.constructor.name,
            name: this.name,
            address,
            data: []
        }
        return currentWrapper;
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





    referenceToOperationObject() {//Gives a scraping object reference to the operation object, in which it was created. Used only in "repeatErrors()", after the initial scraping procedure is done.
        return this;
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

    getData() {
        return this.data;
    }

    createMinimalData(currentWrapper) {

        return { type: currentWrapper.type, name: currentWrapper.name, data: currentWrapper.data };
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

    getErrors() {//gets overall errors of the operation, in all "contexts".
        return this.errors;
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

    // resolveActualBaseUrl(currentAddress) {
    //     const currentHost = new URL(currentAddress).host;
    //     const originalHost = new URL(this.scraper.config.baseSiteUrl).host;

    //     // console.log('currentHost', currentHost);

    //     return currentHost === originalHost ? this.scraper.config.baseSiteUrl : currentAddress

    // }



}

// Operation.prototype.yoyo = () => {
//     console.log('yoyoyoyoyoyoyoy')
// }


module.exports = Operation;
// debugger;