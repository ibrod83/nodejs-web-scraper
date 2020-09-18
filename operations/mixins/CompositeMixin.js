const { CustomResponse } = require('../../request/request')//For jsdoc

/**
 * This provides methods used for event handling. It's not meant to
 * be used directly.
 *
 * @mixin
 */
const CompositeMixin = {

  injectScraper: function (ScraperInstance) {//Override the original init function of Operation
    this.scraper = ScraperInstance;
    ScraperInstance.registerOperation(this);
    for (let operation of this.operations) {
      operation.injectScraper(ScraperInstance);
    }

    this.validateOperationArguments();

  },

 

  _addOperation: function (operationObject) {//Adds a reference to an operation object     

    let next = Object.getPrototypeOf(operationObject);

    while (next.constructor.name !== "Object") {
      if (next.constructor.name === 'Operation') {
        this.operations.push(operationObject)
        return;
      }

      next = Object.getPrototypeOf(next);
    }
    throw 'Child operation must be of type Operation! Check your "addOperation" calls.'

  },

  /**
   * 
   * @param {Operation[]} childOperations 
   * @param {*} passedData 
   * @param {CustomResponse} responseObjectFromParent 
   * @return {Promise<Object>} scrapedData
   */
  scrapeChildren: async function (childOperations, passedData, responseObjectFromParent) {//Scrapes the child operations of this OpenLinks object.

    
    const scrapedData = {}
    for (let operation of childOperations) {
      const dataFromChild = await operation.scrape(passedData, responseObjectFromParent);

      scrapedData[operation.config.name] = dataFromChild;
    }
    responseObjectFromParent = null;
    return scrapedData;
  }

};


module.exports = CompositeMixin;