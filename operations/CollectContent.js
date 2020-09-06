const Operation = require('./Operation')
var cheerio = require('cheerio');
var cheerioAdv = require('cheerio-advanced-selectors')
cheerio = cheerioAdv.wrap(cheerio)
const { createElementList, getNodeContent } = require('../utils/cheerio')
const ScrapingWrapper = require('../structures/ScrapingWrapper')
const MinimalData = require('../structures/MinimalData')
// const YoyoTrait = require('../YoyoTrait');


class CollectContent extends Operation {




    /**
     * 
     * @param {string} querySelector cheerio-advanced-selectors selector 
     * @param {Object} [config] 
     * @param {string} [config.name = 'Default CollectContent name']
     * @param {string} [config.contentType = 'text']
     * @param {number[]} [config.slice = null]
     * @param {boolean} [config.shouldTrim = true] Will trim the string, if "shouldTrim" is true.
     * @param {Function} [config.getElementList = null] Receives an elementList array
     * @param {Function} [config.getElementContent = null] Receives elementContentString and pageAddress
     * @param {Function} [config.afterScrape = null] Receives a data object
     * @param {Function} [config.getElementList = null] Receives
     
     */
    constructor(querySelector, config) {
        super(config);
        this.querySelector = querySelector;
        // this.validateOperationArguments();
        if (typeof this.config.shouldTrim !== 'undefined') {//Checks if the user passed a "shouldTrim" property.
            this.config.shouldTrim = this.config.shouldTrim;
        } else {
            this.config.shouldTrim = true;
        }

    }

    validateOperationArguments() {

        if (!this.querySelector || typeof this.querySelector !== 'string')
            throw new Error(`CollectContent operation must be provided with a querySelector.`);

    }

 
    async scrape(responseObjectFromParent) {

        const parentAddress = responseObjectFromParent.url
        // const currentWrapper = this.createWrapper(parentAddress);
        const currentWrapper = new ScrapingWrapper('CollectContent',this.config.name,parentAddress);

        this.config.contentType = this.config.contentType || 'text';
        !responseObjectFromParent && console.log('Empty response from content operation', responseObjectFromParent)

        var $ = cheerio.load(responseObjectFromParent.data);
        // const elementList = await this.createElementList($);
        const elementList = await createElementList($, this.querySelector, { condition: this.config.condition, slice: this.config.slice });

        if (this.config.getElementList) {
            await this.config.getElementList(elementList);
        }

        for (let element of elementList) {
            let content = getNodeContent(element, { shouldTrim: this.config.shouldTrim, contentType: this.config.contentType });
            if (this.config.getElementContent) {
                const contentFromCallback = await this.config.getElementContent(content, parentAddress)
                content = typeof contentFromCallback === 'string' ? contentFromCallback : content;
            }
            // debugger;
            currentWrapper.data.push(content);
        }

        $ = null;

        if (this.config.afterScrape) {
            await this.config.afterScrape(currentWrapper);
        }

        // this.overallCollectedData.push(this.currentlyScrapedData);
        this.data = [...this.data, currentWrapper];

        // return this.createMinimalData(currentWrapper);
        return new MinimalData(currentWrapper.type,currentWrapper.name,currentWrapper.data)
      

    }



}

module.exports = CollectContent;