
const Operation = require('../operations/Operation');
// const Adapter = require('./Adapter')
// const { createDelay } = require('../utils/delay')
const SPA_CompositeScrapeMixin = require('./mixins/SPA_CompositeScrapeMixin')
const CompositeInjectMixin = require('../operations/mixins/CompositeInjectMixin')
// let counter = 0
/**
 * @mixes SPA_CompositeScrapeMixin
 * @mixes CompositeInjectMixin
 */
class ScrollToBottom extends Operation {

    /**
     * 
     * @param {Object} [config] 
     * @param {number} [config.numRepetitions = 1] 
     * @param {number} [config.delay = 0] 
     * @param {number} [config.scrapeChildrenAfterNumRepetitions = 1] 
     */
    constructor(config = {}) {
        const defaultConfig = {
            numRepetitions: 1, delay: 0, scrapeChildrenAfterNumRepetitions: 1
        }
        // debugger;
        super({ ...defaultConfig, ...config })
        // debugger;
        this.operations = [];

    }



    addOperation(operation) {
        // debugger;
        this.operations.push(operation);
    }


    async performScroll(puppeteerSimplePage) {
        await puppeteerSimplePage.focus();
        await puppeteerSimplePage.scrollToBottom({ numRepetitions: 1, delay: this.config.delay });
    }

    /**
     * 
     * @param {PuppeteerSimplePage} puppeteerSimplePage 
     * @param {boolean} scrapeChildren 
     * @return {Promise<array>}
     */
    async processOneIteration(puppeteerSimplePage, scrapeChildren) {

        try {
            var dataFromChildren = [];
            await this.performScroll(puppeteerSimplePage);

            if (scrapeChildren && this.operations.length) {
                // counter++
                // console.log('counter', counter)
                dataFromChildren = await this.scrapeChildren(puppeteerSimplePage)
            }


        } catch (error) {
            // debugger;
            const errorString = `There was an error scrolling down:, ${puppeteerSimplePage.url}, ${error}`
            this.errors.push(errorString);
            this.handleFailedScrapingIteration(errorString);
            if (this.config.getException)
                await this.getException(error)


        } finally {
            return dataFromChildren;
        }



    }

    /**
     * The first parameter is not actually used. It's here to conform with the Operation.scrape() interface.    
     * @param {PuppeteerSimplePage} puppeteerSimplePage 
     */
    async scrape({ html, url }, puppeteerSimplePage) {

        const iterations = []
        const { numRepetitions, scrapeChildrenAfterNumRepetitions } = this.config;
        for (let i = 1; i <= numRepetitions; i++) {

            const div = i / scrapeChildrenAfterNumRepetitions//A whole number means this itteration should also scrape children.

            const scrapeChildren = Number.isInteger(div);

            const dataFromIteration = await this.processOneIteration(puppeteerSimplePage, scrapeChildren);

            iterations.push(dataFromIteration);

        }

        this.data.push(...iterations)
        return { type: this.constructor.name, name: this.config.name, data: iterations };
    }

    validateOperationArguments() {

    }


}

Object.assign(ScrollToBottom.prototype, SPA_CompositeScrapeMixin)
Object.assign(ScrollToBottom.prototype, CompositeInjectMixin)


module.exports = ScrollToBottom;