const CompositeOperation = require('./CompositeOperation');
var cheerio = require('cheerio');
var cheerioAdv = require('cheerio-advanced-selectors');
cheerio = cheerioAdv.wrap(cheerio);

class OpenLinks extends CompositeOperation {

    constructor(querySelector, config) {
        super(config);

        this.querySelector = querySelector;
        // debugger;
        this.validateOperationArguments();

    }

    async scrape(responseObjectFromParent) {
        // this.emit('scrape')
        // console.log(this)
        const currentWrapper = {//The envelope of all scraping objects, created by this operation. Relevant when the operation is used as a child, in more than one place.
            type: 'Link Opener',
            name: this.name,
            address: responseObjectFromParent.config.url,
            data: []
        }

        var scrapingObjects = [];
        // debugger;
        // if(this.beforeScrape){
        //     await this.beforeScrape(responseObjectFromParent);
        // }

        // const baseUrlOfCurrentDomain = this.resolveActualBaseUrl(responseObjectFromParent.request.res.responseUrl);
        const refs = await this.createLinkList(responseObjectFromParent)
        responseObjectFromParent = {};

        scrapingObjects = this.createScrapingObjectsFromRefs(refs, this.pagination && 'pagination');//If the operation is paginated, will pass a flag.
        const hasOpenLinksOperation = this.operations.filter(child => child.constructor.name === 'OpenLinks').length > 0;//Checks if the current page operation has any other page operations in it. If so, will force concurrency limitation.
        // console.log('hasOpenLinksOperation', hasOpenLinksOperation)

        const forceConcurrencyLimit = hasOpenLinksOperation && 3;
        // console.log('forceConcurrencyLimit', forceConcurrencyLimit)
        await this.executeScrapingObjects(scrapingObjects, forceConcurrencyLimit);

        currentWrapper.data = [...currentWrapper.data, ...scrapingObjects];
        this.data = [...this.data, ...currentWrapper.data]

        return currentWrapper;
    }


    async createLinkList(responseObjectFromParent) {
        var $ = cheerio.load(responseObjectFromParent.data);
        // const nodeList = await this.createNodeList($);
        const elementList =  this.createElementList($);
        // debugger;
        $ = null;
        const refs = [];

        elementList.forEach((link) => {
            const absoluteUrl = this.getAbsoluteUrl(responseObjectFromParent.request.res.responseUrl, link[0].attribs.href)
            refs.push(absoluteUrl)

        })

        return refs;
    }


}

module.exports = OpenLinks;