const Operation = require('./Operation');
var cheerio = require('cheerio');

var cheerioAdv = require('cheerio-advanced-selectors');
cheerio = cheerioAdv.wrap(cheerio);
const { mapPromisesWithLimitation } = require('../utils/concurrency');
const { createDelay } = require('../utils/delay');
const rpur = require('repeat-promise-until-resolved')



class HttpOperation extends Operation {//Base class for all operations that require reaching out to the internet.

    constructor(config) {
        // debugger;
        super(config)
        if (config && config.condition) {
            const type = typeof config.condition;
            if (type !== 'function') {
                throw new Error(`"condition" hook must receive a function, got: ${type}`)
            }
        }
    }


    /**
     * 
     * @param {Error} error 
     */
    async emitError(error) {
        if (this.config.getException)
            await this.config.getException(error);
    }

    async repeatPromiseUntilResolved(promiseFactory, href) {
        const maxAttempts = this.scraper.config.maxRetries + 1;
        const shouldStop = (error) => {
            const errorCode = error.response ? error.response.status : error
            // console.log('Error code', errorCode);
            if (this.scraper.config.errorCodesToSkip.includes(errorCode)) {
                // debugger;
                const error = new Error();
                error.message = `Skipping error ${errorCode}`;
                // debugger;
                error.code = errorCode;
                return true;
            }
            return false;
        }
        const onError = async (error, retries) => {


            console.log('Retrying failed promise...error:', error, 'href:', href);
            const newRetries = retries + 1;
            console.log('Retreis', newRetries)
            await this.emitError(error)
        }

        // return await this.repeatPromiseUntilResolved(() => { return this.qyuFactory(promiseFactory) }, url)
        // return await this.qyuFactory(() => this.repeatPromiseUntilResolved(promiseFactory, url));
        return await rpur(promiseFactory, { maxAttempts, onError, shouldStop });
    }



   

    /**
     * 
     * @param {string[]} hrefs 
     * @param {Function} executionFunc
     * @param {number} overwriteConcurrency 
     */
    async executeScrapingActions(hrefs, executionFunc, overwriteConcurrency) {//Will execute scraping objects with concurrency limitation.

        await mapPromisesWithLimitation(hrefs, executionFunc, overwriteConcurrency ? overwriteConcurrency : this.scraper.config.concurrency)

    }



    /**
     * 
     * @param {Error} href    
     *     
     */
    handleFailedScrapingAction(errorString) {
    // handleFailedScrapingAction(error) {
        console.error(errorString);
        // scrapingAction.setError(errorString, errorCode)
        this.scraper.reportFailedScrapingAction(errorString);

    }


    /**
     * 
     * @param {Function} promiseFunction 
     * @return {Qyu}
     * 
     */
    qyuFactory(promiseFunction) {//This function pushes promise-returning functions into the qyu. 

        return this.scraper.qyu(promiseFunction);

    }

    

    /**
     * 
     * @param {string} message 
     */
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



   


}
// Object.assign(HttpOperation.prototype,PageMixin)
module.exports = HttpOperation;