const Operation = require('./Operation')
var cheerio = require('cheerio');
var cheerioAdv = require('cheerio-advanced-selectors')
cheerio = cheerioAdv.wrap(cheerio)
// const fs = require('fs')
const { createElementList, getNodeContent } = require('../utils/cheerio')
// const { CustomResponse } = require('../request/request')

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
     * @param {Function} [config.getElementContent = null] Receives elementContentString, pageAddress, and element
     * @param {Function} [config.getAllItems = null] Receives all items collected from a specific page. Will run for each page.

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
    * @param {{url:string,html:string}} params
    * @return {Promise<{type:string,name:string,data:[]}>}
    */
    async scrape({ html, url }) {
        // this.scraper.log('colelcting content',url)
        // debugger;
        // if(this.config.name === 'videoLabel')
        // debugger;
        // const arr = url.split('/');
        // const fileName = arr[arr.length-1]
        // fs.writeFile(`${this.scraper.config.logPath}/${fileName}.html`,html,()=>{})

        const parentAddress = url


        this.config.contentType = this.config.contentType || 'text';
        // !responseObjectFromParent && this.scraper.log('Empty response from content operation', responseObjectFromParent)
        // debugger;
        var $ = cheerio.load(html);
        const elementList = await createElementList($, this.querySelector, { condition: this.config.condition, slice: this.config.slice });

        // if(this.config.name === 'videoLabel')
        // this.scraper.log(url,' Number of video elements: ',elementList.length)

        if (this.config.getElementList) {
            await this.config.getElementList(elementList, parentAddress);
        }

        const iterations = [];

        for (let element of elementList) {
            let content = getNodeContent(element, { shouldTrim: this.config.shouldTrim, contentType: this.config.contentType });
            if (this.config.getElementContent) {
                const contentFromCallback = await this.config.getElementContent(content, parentAddress, element)
                content = typeof contentFromCallback === 'string' ? contentFromCallback : content;
            }

            iterations.push(content);

        }

        if (this.config.getAllItems) {
            // await this.config.afterScrape(currentWrapper);
            await this.config.getAllItems(iterations, parentAddress);
        }

        this.data.push(...iterations)

        return { type: this.constructor.name, name: this.config.name, data: iterations };


    }




}

module.exports = CollectContent;
