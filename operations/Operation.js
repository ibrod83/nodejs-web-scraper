
const Scraper = require('../Scraper');//For jsdoc

/**
 * Base class for all operations(not including limitedSpa).
 * Every Operation must implement its own scrape() method.
 */
class Operation {//Base class for all operations.

    constructor(objectConfig) {


        this.config = {}
        if (objectConfig) {
            for (let i in objectConfig) {
                this.config[i] = objectConfig[i];
            }
        }

        if(!this.config.name)
            this.config.name = `Default ${this.constructor.name} name`

        // this.querySelector = querySelector;
        // this.config.name = this.getOperationName(this.config.name);
        this.scraper = null; //Scraper instance is passed later on.
        this.data = []; //Holds all data collected by this operation, in the form of possibly multiple "ScrapingWrappers".       
        this.errors = [];//Holds the overall communication errors, encountered by the operation.

    }

    


    /**
     * Being that all Operation objects are created independetly from the Scraper, a Scraper reference must be passed to them.
     * Due to the nature of the API, this cannot be done in the Operation constructor. 
     * @param {Scraper} ScraperInstance 
     */
    injectScraper(ScraperInstance) {

        this.scraper = ScraperInstance;

        this.handleNewOperationCreation(this)
        // debugger;

        this.validateOperationArguments();//Implemented by all Operation objects

    }



    /**
     * 
     * @param {Operation} Operation 
     */
    handleNewOperationCreation(Operation) {
        this.scraper.state.registeredOperations.push(Operation);
    }

    /**
     * 
     * @param {string} errorString    
     *     
     */
    handleFailedScrapingIteration(errorString) {
        // handleFailedScrapingIteration(error) {
        this.scraper.log(errorString);
        // scrapingAction.setError(errorString, errorCode)
        this.scraper.reportFailedScrapingAction(errorString);

    }


    /**
     * @return {Operation} this 
     */
    referenceToOperationObject() {
        return this;
    }



    /**
     * Get the entire data collected by this operation
     * @return {Array}
     */
    getData() {
        // debugger;
        return this.data;
    }




    /**
     * @return {string[]}
     */
    getErrors() {//gets overall errors of the operation.
        return this.errors;
    }


}




module.exports = Operation;
