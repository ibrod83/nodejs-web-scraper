const HttpOperation = require('./HttpOperation');
const CompositeMixin = require('./mixins/CompositeMixin');
const Operation = require('./Operation')//For jsdoc
var cheerio = require('cheerio');
var cheerioAdv = require('cheerio-advanced-selectors');
cheerio = cheerioAdv.wrap(cheerio);
const { getBaseUrlFromBaseTag, createElementList } = require('../utils/cheerio');
const { getAbsoluteUrl } = require('../utils/url');
const PageHelper = require('./helpers/PageHelper');
const {CustomResponse} = require('../request/request')


/**
 * 
 * @mixes CompositeMixin
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
     * @param {Function} [config.getPageData = null] 
     * @param {Function} [config.getAllPagesData = null] 
     * @param {Function} [config.getPageResponse = null] Receives an axiosResponse object    
     * @param {Function} [config.getPageHtml = null] Receives htmlString and pageAddress
     * @param {Function} [config.getException = null] Listens to every exception. Receives the Error object. 
     *    
     */

    //  * @param {Function} [config.afterScrape = null] Receives a data object
    //  * @param {Function} [config.getPageObject = null] Receives a pageObject object
    constructor(querySelector, config) {

        super(config);
        this.pageHelper = new PageHelper(this);
        // this.compositeHelper = new CompositeHelper(this);

        this.operations = [];//References to child operation objects.
        this.querySelector = querySelector;

    }

    /**
     * 
     * @param {Operation} Operation 
     */
    addOperation(Operation) {
        this._addOperation(Operation);
    }


    validateOperationArguments() {
        if (!this.querySelector || typeof this.querySelector !== 'string')
            throw new Error(`OpenLinks operation must be provided with a querySelector.`);
    }

    

    /**
     * 
     * @param {CustomResponse} responseObjectFromParent 
     * @return {Array} dataFromChildren
     */
    async scrape(responseObjectFromParent) {


        const refs = await this.createLinkList(responseObjectFromParent)
        responseObjectFromParent = {};
        const hasOpenLinksOperation = this.operations.filter(child => child.constructor.name === 'OpenLinks').length > 0;//Checks if the current page operation has any other page operations in it. If so, will force concurrency limitation.
        let forceConcurrencyLimit = false;
        if (hasOpenLinksOperation) {
            forceConcurrencyLimit = 3;
        }
        // debugger;
        const shouldPaginate =  this.config.pagination ? true : false;
        const dataFromChildren = [];
        await this.executeScrapingActions(refs, async (href) => {
            const data = await this.pageHelper.processOneScrapingAction(href, shouldPaginate) 

            if(this.config.getPageData)
                await this.config.getPageData(data);

            dataFromChildren.push(data)

        }, forceConcurrencyLimit);

        if (this.config.getAllPagesData)
            await this.config.getAllPagesData(dataFromChildren);

        this.data.push(...dataFromChildren)
        return dataFromChildren

    }


    async createLinkList(responseObjectFromParent) {
        var $ = cheerio.load(responseObjectFromParent.data);

        const elementList = await createElementList($, this.querySelector, { condition: this.config.condition, slice: this.config.slice });
        if (this.config.getElementList) {
            await this.config.getElementList(elementList);
        }
        const baseUrlFromBaseTag = getBaseUrlFromBaseTag($, this.scraper.config.baseSiteUrl);
        $ = null;
        const refs = [];
        elementList.forEach((link) => {

            const absoluteUrl = getAbsoluteUrl(baseUrlFromBaseTag || responseObjectFromParent.url, link[0].attribs.href)
            refs.push(absoluteUrl)

        })

        return refs;
    }

    

}

Object.assign(OpenLinks.prototype, CompositeMixin)

module.exports = OpenLinks;