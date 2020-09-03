
const CollectContent = require('../../operations/CollectContent');
const Page = require('../Page');

class CollectContentAdapter{
    /**
     * 
     * @param {CollectContent} collectContent 
     */
    constructor(collectContent){
        this.originalCollectContent = collectContent
    }

    // addOperation(operation) {
    //     this.operations.push(operation)
    // }

    /**
     * 
     * @param {Page} puppeteerSimplePage 
     */
    async scrape(puppeteerSimplePage){
        const data = await puppeteerSimplePage.getHtml();
        const mockReponseObjectFromParent = {
            data,
            url:puppeteerSimplePage.url,
            originalResponse:null,
            status:200,
            statusText:'OK',
            headers:{},
            config:{}
        }

       await this.originalCollectContent.scrape(mockReponseObjectFromParent)

    }

   
}

module.exports = CollectContentAdapter;