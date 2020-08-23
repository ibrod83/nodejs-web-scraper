const Operation = require("./Operation");


const Operation = require('./Operation');

class CompositeOperation extends Operation{

    constructor(config){
        super(config);
        this.operations = []
    }

    async scrapeChildren(childOperations, passedData, responseObjectFromParent) {//Scrapes the child operations of this OpenLinks object.

        const scrapedData = []
        for (let operation of childOperations) {
            const dataFromChild = await operation.scrape(passedData, responseObjectFromParent);

            scrapedData.push(dataFromChild);//Pushes the data from the child

        }
        responseObjectFromParent = null;
        return scrapedData;
    }

    addOperation(operationObject) {//Adds a reference to an operation object     
        // console.log(operationObject instanceof Object.getPrototypeOf(HttpOperation))
        if (!(operationObject instanceof Object.getPrototypeOf(HttpOperation))) {
            throw 'Child operation must be of type Operation! Check your "addOperation" calls.'
        }
        this.operations.push(operationObject)
    }
}

module.exports = CompositeOperation;