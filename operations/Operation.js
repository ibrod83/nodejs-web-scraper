
const Scraper = require('../Scraper.js');


class Operation {//Base class for all operations.

    constructor(objectConfig) {
      
        // debugger;
        // console.log(arguments)
        this.scraper = Scraper.getScraperInstance();//Reference to the scraper main object.
      
        this.handleNewOperationCreation(this);

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

    



    validateOperationArguments() {

        // debugger;
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


    createElementList($) {
        const nodeList = this.createNodeList($);
        const elementList = [];
        nodeList.each((index, node) => {

            elementList.push($(node))

        })
        if (this.getElementList) {
            this.getElementList(elementList);
        }
        return elementList;
    }

    createNodeList($) {//Gets a cheerio object and creates a nodelist. Checks for "getNodeList" user callback.       

        const nodeList = this.slice ? $(this.querySelector).slice(typeof this.slice === 'number' ? this.slice : this.slice[0], this.slice[1]) : $(this.querySelector);

        return nodeList;
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

// var handler = {
//     construct(target, args) {
//         debugger
//         console.log(args)
//         console.log('DownloadContent constructor called');
//         // expected output: "monster1 constructor called"

//         return new target();

//     }
// };

// Operation= new Proxy(Operation,handler)


module.exports = Operation;
