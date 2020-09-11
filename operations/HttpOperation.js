const Operation = require('./Operation');
var cheerio = require('cheerio');
// const { Qyu } = require('qyu');
// const {CustomResponse} = require('../request/request')//For jsdoc
var cheerioAdv = require('cheerio-advanced-selectors');
cheerio = cheerioAdv.wrap(cheerio);
const { mapPromisesWithLimitation } = require('../utils/concurrency');
const { createDelay } = require('../utils/delay');
const rpur = require('repeat-promise-until-resolved')
const ScrapingAction = require('./structures/ScrapingAction');



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
     * @param {string[]} refs 
     * @param {string} type 
     */
    createScrapingActionsFromRefs(refs, type) {

        const scrapingActions = [];

        refs.forEach((href) => {
            if (href) {
                // const absoluteUrl = this.getAbsoluteUrl(baseUrlOfCurrentDomain, href)
                // var scrapingAction = this.createScrapingAction(href, type);
                // const scrapingAction = new ScrapingAction(href, type, this.referenceToOperationObject.bind(this))
                const scrapingAction = new ScrapingAction({address:href, type },this.referenceToOperationObject.bind(this))

                this.scraper.state.scrapingActions.push(scrapingAction)
                scrapingActions.push(scrapingAction);
            }

        })
        return scrapingActions;
    }


    /**
     * 
     * @param {ScrapingAction[]} scrapingActions 
     * @param {Function} executionFunc
     * @param {number} overwriteConcurrency 
     */
    async executeScrapingActions(scrapingActions, executionFunc, overwriteConcurrency) {//Will execute scraping objects with concurrency limitation.

        await mapPromisesWithLimitation(scrapingActions, executionFunc, overwriteConcurrency ? overwriteConcurrency : this.scraper.config.concurrency)

    }



    /**
     * 
     * @param {ScrapingAction} scrapingAction 
     * @param {string} errorString 
     * @param {number} errorCode 
     */
    handleFailedScrapingAction(scrapingAction, errorString, errorCode) {
        console.error(errorString);
        scrapingAction.setError(errorString, errorCode)
        this.scraper.reportFailedScrapingAction(scrapingAction);

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