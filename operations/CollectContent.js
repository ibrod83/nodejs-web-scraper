const Operation = require('./Operation')
var cheerio = require('cheerio');
var cheerioAdv = require('cheerio-advanced-selectors')
cheerio = cheerioAdv.wrap(cheerio)
const { createElementList,getNodeContent } = require('../utils/cheerio')
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
     
     */
    constructor(querySelector, config) {
        super(config);
        this.querySelector = querySelector;
        // this.validateOperationArguments();
        if (typeof this.shouldTrim !== 'undefined') {//Checks if the user passed a "shouldTrim" property.
            this.shouldTrim = this.shouldTrim;
        } else {
            this.shouldTrim = true;
        }

    }

    async scrape(responseObjectFromParent) {

        const parentAddress = responseObjectFromParent.url
        const currentWrapper = this.createWrapper(parentAddress);

        this.contentType = this.contentType || 'text';
        !responseObjectFromParent && console.log('Empty response from content operation', responseObjectFromParent)

        var $ = cheerio.load(responseObjectFromParent.data);
        // const elementList = await this.createElementList($);
        const elementList = await createElementList($,this.querySelector,{condition:this.condition,slice:this.slice});

        if (this.getElementList) {
            await this.getElementList(elementList);
        }

        for (let element of elementList) {
            let content = getNodeContent(element,{shouldTrim:this.shouldTrim,contentType:this.contentType});
            if (this.getElementContent) {
                const contentFromCallback = await this.getElementContent(content, parentAddress)
                content = typeof contentFromCallback === 'string' ? contentFromCallback : content;
            }
            // debugger;
            currentWrapper.data.push(content);
        }

        $ = null;

        if (this.afterScrape) {
            await this.afterScrape(currentWrapper);
        }

        // this.overallCollectedData.push(this.currentlyScrapedData);
        this.data = [...this.data, currentWrapper];

        return this.createMinimalData(currentWrapper);

    }

    

}

module.exports = CollectContent;