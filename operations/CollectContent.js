const Operation = require('./Operation')
var cheerio = require('cheerio');
var cheerioAdv = require('cheerio-advanced-selectors')
cheerio = cheerioAdv.wrap(cheerio)
const { createElementList, getNodeContent } = require('../utils/cheerio')
const {CustomResponse} = require('../request/request')

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
  
    


     /**
     * 
     * @param {CustomResponse} responseObjectFromParent 
     * @return {string[]} items
     */
    async scrape(responseObjectFromParent) {

        const parentAddress = responseObjectFromParent.url


        this.config.contentType = this.config.contentType || 'text';
        !responseObjectFromParent && console.log('Empty response from content operation', responseObjectFromParent)

        var $ = cheerio.load(responseObjectFromParent.data);
        const elementList = await createElementList($, this.querySelector, { condition: this.config.condition, slice: this.config.slice });

        if (this.config.getElementList) {
            await this.config.getElementList(elementList);
        }

        const items = [];

        for (let element of elementList) {
            let content = getNodeContent(element, { shouldTrim: this.config.shouldTrim, contentType: this.config.contentType });
            if (this.config.getElementContent) {
                const contentFromCallback = await this.config.getElementContent(content, parentAddress)
                content = typeof contentFromCallback === 'string' ? contentFromCallback : content;
            }
            items.push(content);
   
        }

        $ = null;

        if (this.config.afterScrape) {
            // await this.config.afterScrape(currentWrapper);
            await this.config.afterScrape(scrapingActions);
        }

        this.data.push(...items)

        return items;



    }

    


}

module.exports = CollectContent;