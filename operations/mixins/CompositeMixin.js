// const Operation = require('../Operation')
/**
 * This provides methods used for event handling. It's not meant to
 * be used directly.
 *
 * @mixin
 */
const CompositeMixin = {

  injectScraper: function (ScraperInstance) {//Override the original init function of Operation
    // debugger;
    // this.reset()
    this.scraper = ScraperInstance;
    // this.handleNewOperationCreation(this)
    ScraperInstance.registerOperation(this);
    for (let operation of this.operations) {
      operation.injectScraper(ScraperInstance);
    }

    this.validateOperationArguments();

  },

  _addOperation: function (operationObject) {//Adds a reference to an operation object     
    
    let next = Object.getPrototypeOf(operationObject);

    while (next.constructor.name !== "Object") {
      if (next.constructor.name === 'Operation'){
        this.operations.push(operationObject)
        return;
      }
       
      next = Object.getPrototypeOf(next);
    }
    throw 'Child operation must be of type Operation! Check your "addOperation" calls.'
   
  },

  scrapeChildren: async function (childOperations, passedData, responseObjectFromParent) {//Scrapes the child operations of this OpenLinks object.

    const scrapedData = []
    for (let operation of childOperations) {
      const dataFromChild = await operation.scrape(passedData, responseObjectFromParent);

      scrapedData.push(dataFromChild);//Pushes the data from the child

    }
    responseObjectFromParent = null;
    return scrapedData;
  }

};


module.exports = CompositeMixin;