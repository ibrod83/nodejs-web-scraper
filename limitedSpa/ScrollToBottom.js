const CollectContentAdapter = require('./adapters/CollectContentAdapter')
const DownloadContentAdapter = require('./adapters/DownloadContentAdapter')
const Operation  = require('../operations/Operation');

const adapterMap = {
    'CollectContent':CollectContentAdapter,
    'DownloadContent':DownloadContentAdapter,
}

class ScrollToBottom extends Operation{
    constructor(config={numRepetitions:1,delay:0}){
        super(config)
        this.scraperInstance = null;
        this.puppeteerSimplePage = null;
        this.operations = [];
        // this.scraper = null;
        // this.puppeteerSimplePage = puppeteerSimplePage;
        this.config={};
        for(let i in config){
            this.config[i] = config[i];
        }
    }

    // init(ScraperInstance){
    //     debugger;
    //     // this.reset()
    //     this.scraper = ScraperInstance;
    //     // this.handleNewOperationCreation(this)
    //     for(let operation of this.operations){
    //         operation.init(ScraperInstance);
    //     }

    //     // this.validateOperationArguments();
        
    // }

    init(ScraperInstance){
        debugger;
        // this.reset()
        this.scraper = ScraperInstance;
        this.handleNewOperationCreation(this)
        for(let operation of this.operations){
            operation.init(ScraperInstance);
        }

        // for(let operation of this.virtualOperations){
        //     operation.init(ScraperInstance);
        // }

        this.validateOperationArguments();
        
    }

    addOperation(operation) {
        const operationName = operation.constructor.name;
        if(adapterMap[operationName]){
            const adapter = new adapterMap[operationName](operation)//Create the adapter, and pass the original object.
            this.operations.push(adapter)    
        }else{
          this.operations.push(operation)  
        }

        
    }

    async scrapeChildren() {
        console.log('scrtaping children of scrollToBottom')
        for (let operation of this.operations) {
            // debugger;
            await operation.scrape(this.puppeteerSimplePage);
        }
    }

    async performSelfIteration(){
        await this.puppeteerSimplePage.scrollToBottom({numRepetitions:1,delay:this.config.delay});
        await this.scrapeChildren()
    }

    async scrape(puppeteerSimplePage,scraperInstance){
        // debugger;
        this.scraperInstance = scraperInstance;
        for(let childOperation of this.operations){
            childOperation.init(scraperInstance);
        }
        this.puppeteerSimplePage = puppeteerSimplePage;
        const {numRepetitions} = this.config;
        for(let i=0;i<numRepetitions;i++){
            // await puppeteerSimplePage.scrollToBottom({numRepetitions:1,delay});    
            await this.performSelfIteration()
        }

        // await puppeteerSimplePage.scrollToBottom({numRepetitions,delay});
    }
}



module.exports = ScrollToBottom;