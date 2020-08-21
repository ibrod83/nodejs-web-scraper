class ScrollToBottom{
    constructor(config={numRepetitions:1,delay:0}){
        this.puppeteerSimplePage = null;
        // this.puppeteerSimplePage = puppeteerSimplePage;
        this.config={};
        for(let i in config){
            this.config[i] = config[i];
        }
    }

    async scrape(puppeteerSimplePage){
        debugger;
        this.puppeteerSimplePage = puppeteerSimplePage;
        const {numRepetitions,delay} = this.config;
        await puppeteerSimplePage.scrollToBottom({numRepetitions,delay});
    }
}

module.exports = ScrollToBottom;