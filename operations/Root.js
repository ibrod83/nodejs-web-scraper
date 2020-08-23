const HttpOperation = require('./HttpOperation');

class Root extends HttpOperation {//Fetches the initial page, and starts the scraping process.

    /**
     * 
     * @param {string} querySelector cheerio-advanced-selectors selector 
     * @param {Object} [config]    
     * @param {Object} [config.pagination = null] Look at the pagination API for more details.      
     * @param {Function} [config.getElementList = null] Receives an elementList array    
     * @param {Function} [config.getPageData = null] Receives a cleanData object
     * @param {Function} [config.getPageObject = null] Receives a pageObject object
     * @param {Function} [config.getPageResponse = null] Receives an axiosResponse object
     * @param {Function} [config.getHtml = null] Receives htmlString and pageAddress
     * @param {Function} [config.getException = null] Listens to every exception. Receives the Error object. 

     */
    constructor(config){
        super(config)
    }

    
    
    async scrape() {
        debugger;
        const scrapingObject = this.createScrapingObject(this.scraper.config.startUrl, this.pagination && 'pagination')
        this.data = scrapingObject;
        await this.processOneScrapingObject(scrapingObject);

    }

    getErrors() {//Will get the errors from all registered operations.
        // debugger;
        let errors = [...this.errors];

        this.scraper.state.registeredOperations.forEach((operation) => {
            if (operation.constructor.name !== 'Root')
                errors = [...errors,...operation.getErrors()]
        })
        return errors;
    }




}

module.exports = Root;