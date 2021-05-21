const HttpOperation = require('./HttpOperation');
const CompositeInjectMixin = require('./mixins/CompositeInjectMixin');
const CompositeScrapeMixin = require('./mixins/CompositeScrapeMixin');
// const Operation = require('./Operation')//For jsdoc
var cheerio = require('cheerio');
var cheerioAdv = require('cheerio-advanced-selectors');
cheerio = cheerioAdv.wrap(cheerio);
const { getBaseUrlFromBaseTag, createElementList } = require('../utils/cheerio');
const { getAbsoluteUrl } = require('../utils/url');
const PageHelper = require('./helpers/PageHelper');
// const SPA_PageHelper = require('./helpers/SPA_PageHelper');
// const { CustomResponse } = require('../request/request');//For jsdoc
const { mapPromisesWithLimitation } = require('../utils/concurrency');


/**
 * 
 * @mixes CompositeInjectMixin
 * @mixes CompositeScrapeMixin
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
     * @param {Function} [config.getPageObject = null] Receives a dictionary of children, and an address argument
     * @param {Function} [config.getPageResponse = null] Receives an axiosResponse object    
     * @param {Function} [config.getPageHtml = null] Receives htmlString and pageAddress
     * @param {Function} [config.getException = null] Listens to every exception. Receives the Error object. 
     *    
     */

    constructor(querySelector, config) {

        super(config);
        // this.pageHelper = new PageHelper(this);
        this.pageHelper = null;
        // this.compositeHelper = new CompositeHelper(this);
        // this.virtualOperations = []
        this.operations = [];//References to child operation objects.
        this.querySelector = querySelector;

    }

    /**
     * 
     * @param {Operation} Operation 
     */
    addOperation(Operation) {
        // this._addOperation(Operation);
        this.operations.push(Operation)
    }

    initPageHelper() {
        if (!this.scraper.config.usePuppeteer) {
            this.pageHelper = new PageHelper(this)
        }else{
            this.pageHelper = new SPA_PageHelper(this);
        }
    }


    validateOperationArguments() {
        if (!this.querySelector || typeof this.querySelector !== 'string')
            throw new Error(`OpenLinks operation must be provided with a querySelector.`);
    }



    /**
     * 
     * @param {{url:string,html:string}} params 
     * @return {Promise<{type:string,name:string,data:[]}>}
     */
    async scrape({url,html}) {
        if (!this.pageHelper)
            this.initPageHelper();
        // debugger;
        const refs = await this.createLinkList(html,url)

        const hasOpenLinksOperation = this.operations.filter(child => child.constructor.name === 'OpenLinks').length > 0;//Checks if the current page operation has any other page operations in it. If so, will force concurrency limitation.
        let forceConcurrencyLimit = false;
        if (hasOpenLinksOperation) {
            forceConcurrencyLimit = 3;
        }
        // debugger;
        const shouldPaginate = this.config.pagination ? true : false;
        const iterations = [];

        await mapPromisesWithLimitation(refs, async (href) => {
            // debugger;
            const data = await this.pageHelper.processOneIteration(href, shouldPaginate)

            if (this.config.getPageData)
                await this.config.getPageData(data);


            iterations.push(data)
        }, forceConcurrencyLimit ? forceConcurrencyLimit : this.scraper.config.concurrency)


        this.data.push(...iterations)
        return { type: this.constructor.name, name: this.config.name, data: iterations };

    }


    async createLinkList(html,url) {
        // debugger;
        var $ = cheerio.load(html);
        // debugger;
        const elementList = await createElementList($, this.querySelector, { condition: this.config.condition, slice: this.config.slice });
        if (this.config.getElementList) {
            await this.config.getElementList(elementList);
        }
        const baseUrlFromBaseTag = getBaseUrlFromBaseTag($, this.scraper.config.baseSiteUrl);

        const refs = [];
        elementList.forEach((link) => {

            const absoluteUrl = getAbsoluteUrl(baseUrlFromBaseTag || url, link[0].attribs.href)
            refs.push(absoluteUrl)

        })

        return refs;
    }



}

Object.assign(OpenLinks.prototype, CompositeInjectMixin)
Object.assign(OpenLinks.prototype, CompositeScrapeMixin)

module.exports = OpenLinks;