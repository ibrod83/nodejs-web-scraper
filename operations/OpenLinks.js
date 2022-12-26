const HttpOperation = require('./HttpOperation');
const CompositeInjectMixin = require('./mixins/CompositeInjectMixin');
const CompositeScrapeMixin = require('./mixins/CompositeScrapeMixin');
var cheerio = require('cheerio')
const { getBaseUrlFromBaseTag, createElementList } = require('../utils/cheerio');
const { getAbsoluteUrl } = require('../utils/url');
const PageHelper = require('./helpers/PageHelper');
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
     * @param {(href: string) => string} [config.transformHref = undefined] Callback that receives the href before it is opened.
     *
     */

    constructor(querySelector, config) {

        super(config);
        this.pageHelper = null;
        this.operations = [];//References to child operation objects.
        this.querySelector = querySelector;

        if (typeof config === 'object' && typeof config.transformHref === 'function') {
            this.transformHref = config.transformHref
        } else {
            this.transformHref = function (href) {
                return href
            }
        }
    }

    /**
     *
     * @param {Operation} Operation
     */
    addOperation(Operation) {
        this.operations.push(Operation)
    }

    initPageHelper() {
        this.pageHelper = new PageHelper(this)
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
    async scrape({ url, html }) {
        if (!this.pageHelper)
            this.initPageHelper();

        const refs = await this.createLinkList(html, url)

        const hasOpenLinksOperation = this.operations.filter(child => child.constructor.name === 'OpenLinks').length > 0;//Checks if the current page operation has any other page operations in it. If so, will force concurrency limitation.
        let forceConcurrencyLimit = false;
        if (hasOpenLinksOperation) {
            forceConcurrencyLimit = 3;
        }

        const shouldPaginate = this.config.pagination ? true : false;
        const iterations = [];

        await mapPromisesWithLimitation(refs, async (href) => {

            const data = await this.pageHelper.processOneIteration(
                this.transformHref(href),
                shouldPaginate
            )

            if (this.config.getPageData)
                await this.config.getPageData(data);


            iterations.push(data)
        }, forceConcurrencyLimit ? forceConcurrencyLimit : this.scraper.config.concurrency)


        this.data.push(...iterations)
        return { type: this.constructor.name, name: this.config.name, data: iterations };

    }


    async createLinkList(html, url) {

        var $ = cheerio.load(html);

        const elementList = await createElementList($, this.querySelector, {
            condition: this.config.condition,
            slice: this.config.slice
        });
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
