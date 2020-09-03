
const DownloadContent = require('../../operations/DownloadContent');
const Page = require('../Page');

class DowbloadContentAdapter{
    /**
     * 
     * @param {DownloadContent} downloadContent 
     */
    constructor(downloadContent){
        this.originalDownloadContent = downloadContent
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

       await this.originalDownloadContent.scrape(mockReponseObjectFromParent)

    }

   
}

module.exports = DowbloadContentAdapter;