const CompositeOperation = require('./CompositeOperation');

class Root extends CompositeOperation {

    async scrape() {
        // this.emit('scrape')
        console.log(this)


        const scrapingObject = this.createScrapingObject(this.scraper.config.startUrl, this.pagination && 'pagination')
        this.data = scrapingObject;
        await this.processOneScrapingObject(scrapingObject);

    }

    getErrors() {//Will get the errors from all registered operations.
        let errors = [...this.errors];

        this.scraper.state.registeredOperations.forEach((operation) => {
            if (operation.constructor.name !== 'Root')
                errors = [...operation.getErrors()]
        })
        return errors;
    }




}

module.exports = Root;