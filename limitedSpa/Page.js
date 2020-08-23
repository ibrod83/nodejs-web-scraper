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

    addOperation(operation) {
        this.operations.push(operation)
    }

    /**
     * Perform all operations on the page
     */
    async scrape() {
        try {
            // process.exit('yoyoyoyoyo')
            var puppeteerSimplePage = await this.puppeteerSimple.createPage(this.url);
            this.puppeteerSimplePage = puppeteerSimplePage;
            await puppeteerSimplePage.init();
            await this.scrapeChildren(this.puppeteerSimplePage);
            // const html = await puppeteerSimplePage.getHtml();
            // if (!html) {
            //     debugger
            //     console.log('no html from SPA_page');
            //     process.exit()
    
            // }
            // this.html = html;
        } catch (error) {
            debugger;
            throw error;
        }

        // return data;
    }

    async scrapeChildren(puppeteerSimplePage) {
        for (let operation of this.operations) {
            debugger;
            await operation.scrape(puppeteerSimplePage);
        }
    }

    async getHtml() {
        const html = await this.puppeteerSimplePage.getHtml();
        this.html = html;
        if(!this.html){
            debugger;
        }
        // return this.html;
        return html;
    }

    async close() {
        await this.puppeteerSimplePage.close()
    }


}

module.exports = Page;