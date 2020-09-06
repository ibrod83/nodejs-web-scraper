const HttpOperation = require('./HttpOperation');
const CompositeMixin = require('./mixins/CompositeMixin');

var cheerio = require('cheerio');
var cheerioAdv = require('cheerio-advanced-selectors');
cheerio = cheerioAdv.wrap(cheerio);
const { getBaseUrlFromBaseTag, createElementList } = require('../utils/cheerio');
const { getAbsoluteUrl } = require('../utils/url');
const PageMixin = require('./mixins/PageMixin');
const ScrapingWrapper = require('../structures/ScrapingWrapper');



/**
 * //Methods are added after class declaration.
 * @mixes CompositeMixin
 * @mixes PageMixin
 * 
 */
class OpenLinks extends HttpOperation {//This operation is responsible for collecting links in a given page, then fetching their HTML and scraping them, according to the child operations.


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
     * @param {Function} [config.getException = null] Listens to every exception. Receives the Error object. 
     */
    constructor(querySelector, config) {
        
        super(config);

        this.operations = [];//References to child operation objects.
        this.querySelector = querySelector;

    }

    validateOperationArguments() {
        if (!this.querySelector || typeof this.querySelector !== 'string')
            throw new Error(`OpenLinks operation must be provided with a querySelector.`);
    }

    async scrape(responseObjectFromParent) {

        
        const currentWrapper = new ScrapingWrapper('OpenLinks', this.config.name, responseObjectFromParent.config.url);

        var scrapingObjects = [];

        const refs = await this.createLinkList(responseObjectFromParent)
        responseObjectFromParent = {};

        scrapingObjects = this.createScrapingObjectsFromRefs(refs, this.config.pagination && 'pagination');//If the operation is paginated, will pass a flag.
        const hasOpenLinksOperation = this.operations.filter(child => child.constructor.name === 'OpenLinks').length > 0;//Checks if the current page operation has any other page operations in it. If so, will force concurrency limitation.
        let forceConcurrencyLimit = false;
        if (hasOpenLinksOperation) {
            forceConcurrencyLimit = 3;
        }
        // const forceConcurrencyLimit = hasOpenLinksOperation && 3;
        await this.executeScrapingObjects(scrapingObjects,(scrapingObject)=>{
            return this.processOneScrapingObject(scrapingObject)
        }, forceConcurrencyLimit);
        // await this.executeScrapingObjects(scrapingObjects);

        currentWrapper.data = [...currentWrapper.data, ...scrapingObjects];
        // currentWrapper.data.push(...scrapingObjects);
        if (this.config.afterScrape) {
            await this.config.afterScrape(currentWrapper);
        }
        this.data = [...this.data, ...currentWrapper.data]

        return currentWrapper;
    }


    async createLinkList(responseObjectFromParent) {
        var $ = cheerio.load(responseObjectFromParent.data);
        // debugger;
        // const nodeList = await this.createNodeList($);
        // const elementList = await this.createElementList($);
        const elementList = await createElementList($, this.querySelector, { condition: this.config.condition, slice: this.config.slice });
        if (this.config.getElementList) {
            await this.config.getElementList(elementList);
        }
        // debugger;
        // const baseUrlFromBaseTag = this.getBaseUrlFromBaseTag($);
        const baseUrlFromBaseTag = getBaseUrlFromBaseTag($, this.scraper.config.baseSiteUrl);
        // debugger;
        $ = null;
        const refs = [];
        // debugger;
        elementList.forEach((link) => {
            // const absoluteUrl = this.getAbsoluteUrl(baseUrlFromBaseTag || responseObjectFromParent.request.res.responseUrl, link[0].attribs.href)
            // const absoluteUrl = this.getAbsoluteUrl(baseUrlFromBaseTag || responseObjectFromParent.url, link[0].attribs.href)
            const absoluteUrl = getAbsoluteUrl(baseUrlFromBaseTag || responseObjectFromParent.url, link[0].attribs.href)
            refs.push(absoluteUrl)

        })

        return refs;
    }


}

Object.assign(OpenLinks.prototype, CompositeMixin)
Object.assign(OpenLinks.prototype, PageMixin)

module.exports = OpenLinks;