
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



        // this.querySelector = querySelector;
        // this.config.name = this.getOperationName(this.config.name);
        this.scraper = null; //Scraper instance is passed later on.
        this.data = []; //Holds all data collected by this operation, in the form of possibly multiple "ScrapingWrappers".       
        this.errors = [];//Holds the overall communication errors, encountered by the operation.

    }

    getOperationName(providedName) {
        debugger;
        // return this.querySelector;
        if (!providedName) {
            debugger;
            console.warn(`Providing a "name" argument in the config object of  ${this.constructor.name} is highly recommended,
            for better readability of the final output!`)
            // this.config.name = this.querySelector;
            return this.querySelector;
        }
        return providedName;
    }


    /**
     * Being that all Operation objects are created independetly from the Scraper, a Scraper reference must be passed to them.
     * Due to the nature of the API, this cannot be done in the Operation constructor. 
     * @param {Scraper} ScraperInstance 
     */
    injectScraper(ScraperInstance) {

        this.scraper = ScraperInstance;

        this.handleNewOperationCreation(this)

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
     * @return {Operation} this 
     */
    referenceToOperationObject() {
        return this;
    }



    getData() {
        // debugger;
        return this.data;
    }




    /**
     * @return {string[]}
     */
    getErrors() {//gets overall errors of the operation, in all "contexts".
        return this.errors;
    }


}




module.exports = Operation;
