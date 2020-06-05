const CompositeOperation = require('./CompositeOperation');
var cheerio = require('cheerio');
var cheerioAdv = require('cheerio-advanced-selectors');
cheerio = cheerioAdv.wrap(cheerio);

class OpenLinks extends CompositeOperation {//This operation is responsible for collecting links in a given page, then fetching their HTML and scraping them, according to the child operations.

    
    /**
     * 
     * @param {string} querySelector cheerio-advanced-selectors selector 
     * @param {Object} [config]
     * @param {string} [config.name = 'Default OpenLinks name']   
     * @param {Object} [config.pagination = null] Look at the pagination API for more details.  
     * @param {number[]} [config.slice = null]
     * @param {Function} [config.condition = null] Receives a Cheerio node.  Use this hook to decide if this node should be included in the scraping. Return true or false
     * @param {Function} [config.getElementList = null] Receives an elementList array
     * @param {Function} [config.afterScrape = null] Receives a data object
     * @param {Function} [config.getPageData = null] Receives a cleanData object
     * @param {Function} [config.getPageObject = null] Receives a pageObject object
     * @param {Function} [config.getPageResponse = null] Receives an axiosResponse object    
     * @param {Function} [config.getHtml = null] Receives htmlString and pageAddress
     */
    constructor(querySelector, config) {
        super(config);

        this.querySelector = querySelector;
        // debugger;
        this.validateOperationArguments();

    }

    async scrape(responseObjectFromParent) {

        // debugger;
        const currentWrapper = this.createWrapper(responseObjectFromParent.config.url);
        // debugger
        var scrapingObjects = [];

        const refs = await this.createLinkList(responseObjectFromParent)
        responseObjectFromParent = {};

        scrapingObjects = this.createScrapingObjectsFromRefs(refs, this.pagination && 'pagination');//If the operation is paginated, will pass a flag.
        const hasOpenLinksOperation = this.operations.filter(child => child.constructor.name === 'OpenLinks').length > 0;//Checks if the current page operation has any other page operations in it. If so, will force concurrency limitation.

        const forceConcurrencyLimit = hasOpenLinksOperation && 3;
        await this.executeScrapingObjects(scrapingObjects, forceConcurrencyLimit);

        currentWrapper.data = [...currentWrapper.data, ...scrapingObjects];
        if (this.afterScrape) {
            await this.afterScrape(currentWrapper);
        }
        this.data = [...this.data, ...currentWrapper.data]

        return currentWrapper;
    }


    async createLinkList(responseObjectFromParent) {
        var $ = cheerio.load(responseObjectFromParent.data);
        // debugger;
        // const nodeList = await this.createNodeList($);
        const elementList = await this.createElementList($);
        // debugger;
        const baseUrlFromBaseTag = this.getBaseUrlFromBaseTag($);
        // debugger;
        $ = null;
        const refs = [];
        // debugger;
        elementList.forEach((link) => {
            // const absoluteUrl = this.getAbsoluteUrl(baseUrlFromBaseTag || responseObjectFromParent.request.res.responseUrl, link[0].attribs.href)
            const absoluteUrl = this.getAbsoluteUrl(baseUrlFromBaseTag || responseObjectFromParent.url, link[0].attribs.href)
            refs.push(absoluteUrl)

        })

        return refs;
    }


}

module.exports = OpenLinks;