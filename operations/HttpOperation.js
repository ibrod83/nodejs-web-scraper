const Operation = require('./Operation');
const { Qyu } = require('qyu');
const rpur = require('repeat-promise-until-resolved');
const { createDelay } = require('../utils/delay');
const ScrapingObject = require('../ScrapingObject');


/**
 * Base class for all operations that require reaching out to the internet.
 */
class HttpOperation extends Operation {

    constructor(config) {
        super(config)

        this.virtualOperations = [];//Will hold "virtual operations" performed by Puppeteer, which are out of the normal scraping flow.

        if (this.condition) {
            const type = typeof this.condition;
            if (config && config.condition) {
                const type = typeof config.condition;
                if (type !== 'function') {
                    throw new Error(`"condition" hook must receive a function, got: ${type}`)
                }
            }

            this.counter = 0;

        }
    }



    async emitError(error) {
        if (this.getException)
            await this.getException(error);
    }

    async repeatPromiseUntilResolved(promiseFactory, href) {
        // debugger;
        const maxAttempts = this.scraper.config.maxRetries + 1;//Note that "maxRetries refers" to the number of retries, whereas 
        //"maxAttempts" is the overall number of iterations, therefore adding 1.
        const onError = async (error, attempts) => {
            console.log('Retrying failed request, error: ', error, 'href:', href);

            console.log('Attempt number: ', attempts)
            await this.emitError(error);

        }

        const shouldStop = (error) => {
            debugger;
            const errorCode = error.response ? error.response.status : error
            if (this.scraper.config.errorCodesToSkip.includes(errorCode)) {
                // debugger;
                const error = new Error();
                error.message = `Skipping error ${errorCode}`;
                // debugger;
                error.code = errorCode;
                return true
            }
            return false;
        }

        // return await this.qyuFactory(() => this.repeatPromiseUntilResolved(promiseFactory, url));

        return await rpur(promiseFactory, { maxAttempts, shouldStop, onError, timeout: 0 });
    }

    

    createScrapingObjectsFromRefs(refs, type) {

        const scrapingObjects = [];

        refs.forEach((href) => {
            if (href) {

                const scrapingObject = new ScrapingObject(href, type, this.referenceToOperationObject.bind(this))
                this.scraper.state.scrapingObjects.push(scrapingObject)
                scrapingObjects.push(scrapingObject);
            }

        })
        return scrapingObjects;
    }

 
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



async processOneScrapingObject(scrapingObject) {//Will process one scraping object, including a pagination object. Used by Root and OpenLinks.

    if (scrapingObject.type === 'pagination') {//If the scraping object is actually a pagination one, a different function is called. 
        return this.paginate(scrapingObject);
        // return PageMixin.paginate(scrapingObject)
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

        if (this.scraper.config.usePuppeteer) {
            var response = await this.SPA_getPage(href);
        } else {
            var response = await this.getPage(href);
        }

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
        debugger;
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
        // var dataFromChildren = await this.scrapeChildren(this.operations, response)
        var dataFromChildren = await this.scrapeChildren(response)
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

                tree[child.name] = child.data.length <= 1 ? child.data[0] : child.data
            }
            await this.getPageObject(tree)
        }


        scrapingObject.data = [...dataFromChildren];
    } catch (error) {

        console.error(error);
    }

}


}
// Object.assign(HttpOperation.prototype,PageMixin)
module.exports = HttpOperation;