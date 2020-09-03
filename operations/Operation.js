
class Operation {//Base class for all operations.

    constructor(objectConfig) {


        if (objectConfig) {
            for (let i in objectConfig) {
                this[i] = objectConfig[i];
            }
        }
        if (!this.name)
            this.name = `Default ${this.constructor.name} name`;
   
        this.data = [];
        this.operations = [];//References to child operation objects.
        this.errors = [];//Holds the overall communication errors, encountered by the operation.

    }

    reset(){
        // const name = this.constructor.name;
        // debugger;
        this.data = [];
        this.errors = [];
    }


    injectScraper(ScraperInstance){
        // debugger;
        this.scraper = ScraperInstance;
        
        for(let operation of this.operations){
            operation.injectScraper(ScraperInstance);
        }
    }

    init(ScraperInstance){
        // this.reset()
        this.scraper = ScraperInstance;
        this.handleNewOperationCreation(this)
        for(let operation of this.operations){
            operation.init(ScraperInstance);
        }

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



    handleNewOperationCreation(Operation) {
        this.scraper.state.registeredOperations.push(Operation);
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
