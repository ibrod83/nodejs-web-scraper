
class Operation {//Base class for all operations.

    constructor(objectConfig) {


        this.scraper = null;//Will hold the reference to the current Scraper instance.

        if (objectConfig) {
            for (let i in objectConfig) {
                this[i] = objectConfig[i];
            }
        }
        if (!this.name)
            this.name = `Default ${this.constructor.name} name`;
   
        this.data = [];//All collected data by this operation.
        this.errors = [];//Holds the overall communication errors, encountered by the operation.

    }

    reset(){
        // const name = this.constructor.name;
        // debugger;
        this.data = [];
        this.errors = [];
    }


   

    /**
     * Inject the operation with the Scraper instance. This cannot be done in the constructor, due to the nature of the API
     * Exposed to the client.
     * @param {Scraper} ScraperInstance 
     */
    injectScraper(ScraperInstance){
        debugger;
        // this.reset()
        this.scraper = ScraperInstance;
        ScraperInstance.registerOperation(this);

        this.validateOperationArguments();
        
    }


    validateOperationArguments() {

        // debugger;
        // console.log('VALIDATING!', this.constructor.name)
        const operationClassName = this.constructor.name;
        switch (operationClassName) {

            case 'Inquiry':
                if (typeof this.condition !== 'function')
                    throw 'Inquiry operation must be provided with a condition function.';
                break;

            case 'DownloadContent':
                if (!this.scraper.config.filePath && !this.filePath)
                    throw `DownloadContent operation Must be provided with a filePath, either locally or globally.`;
                if (!this.querySelector || typeof this.querySelector !== 'string')
                    throw `DownloadContent operation must be provided with a querySelector.`;
                break;

            case 'OpenLinks':
            case 'CollectContent':
                if (!this.querySelector || typeof this.querySelector !== 'string')
                    throw `${operationClassName} operation must be provided with a querySelector.`;
                break;

            default:
                break;
        }
    }

   

    createWrapper(address) {
        const currentWrapper = {//The envelope of all scraping objects, created by this operation. Relevant when the operation is used as a child, in more than one place.
            type: this.constructor.name,
            name: this.name,
            address,
            data: []
        }
        return currentWrapper;
    }


    referenceToOperationObject() {//Gives a scraping object reference to the operation object, in which it was created. Used only in "repeatErrors()", after the initial scraping procedure is done.
        return this;
    }


    getData() {
        return this.data;
    }

    createMinimalData(currentWrapper) {

        return { type: currentWrapper.type, name: currentWrapper.name, data: currentWrapper.data };
    }


    getErrors() {//gets overall errors of the operation, in all "contexts".
        return this.errors;
    }


}




module.exports = Operation;
