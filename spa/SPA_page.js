const PuppeteerSimple = require('puppeteer-simple').default;//For intellisense

class Page {
    /**
     * 
     * @param {PuppeteerSimple} puppeteerSimple 
     * @param {string} url 
     * @param {object} config 
     */
    constructor(puppeteerSimple, url, config = {}) {
        this.puppeteerSimple = puppeteerSimple;//PuppeteerSimple instance.
        this.url = url;
        this.puppeteerSimplePage = null;//The PuppeteerSimple PAGE instance
        this.operations = [];
        this.html = null;
    }

    addOperation(operation){
        this.operations.push(operation)
    }

    /**
     * Perform all operations on the page, and return the final HTML
     */
    async scrape() {
        
        var puppeteerSimplePage = await this.puppeteerSimple.createPage(this.url);
        this.puppeteerSimplePage = puppeteerSimplePage;
        await puppeteerSimplePage.init();
        await this.scrapeChildren(this.puppeteerSimplePage);
        const html = await puppeteerSimplePage.getHtml();
        this.html = html;
        // return data;
    }

    async scrapeChildren(puppeteerSimplePage){
        for(let operation of this.operations){
            debugger;
            await operation.scrape(puppeteerSimplePage);
        }
    }

    async getHtml(){
        return this.html;
    }

    async close(){
        await this.puppeteerSimplePage.close()
    }


}

module.exports = Page;