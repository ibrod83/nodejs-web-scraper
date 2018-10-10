const CompositeOperation = require('./CompositeOperation');

class Root extends CompositeOperation {//Fetches the initial page, and starts the scraping process.

    constructor(objectConfig){
        super(objectConfig)
    }
    
    async scrape() {

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