const { CustomResponse } = require('../../request/request')//For jsdoc

/**
 * Used by composite operations(operations that contain other operations)
 * @mixin
 */
const CompositeMixin = {

  injectScraper: function (ScraperInstance) {//Override the original init function of Operation
    this.scraper = ScraperInstance;
    // debugger;
    ScraperInstance.registerOperation(this);
    for (let operation of this.operations) {
      operation.injectScraper(ScraperInstance);
    }

    // for (let operation of this.virtualOperations) {
    //   operation.injectScraper(ScraperInstance);
    // }

    this.validateOperationArguments();

  },



  // _addOperation: function (operationObject) {//Adds a reference to an operation object     

  //   let next = Object.getPrototypeOf(operationObject);

  //   while (next.constructor.name !== "Object") {
  //     if (next.constructor.name === 'Operation') {
  //       this.operations.push(operationObject)
  //       return;
  //     }

  //     next = Object.getPrototypeOf(next);
  //   }
  //   throw 'Child operation must be of type Operation! Check your "addOperation" calls.'

  // },

  _addOperation:function(operationObject){
    this.operations.push(operationObject)
  },

  // _addOperation: function (operationObject) {//Adds a reference to an operation object     
  //   // this.scraper.log(operationObject instanceof Object.getPrototypeOf(HttpOperation))
  //   // debugger;

  //   const SPA_operationNames = ['ScrollToBottom', 'Click'];
  //   const operationName = operationObject.constructor.name;
  //   // debugger;
  //   if (SPA_operationNames.includes(operationName)) {

  //     this.virtualOperations.push(operationObject)

  //   }
  //   else {

  //     let next = Object.getPrototypeOf(operationObject);

  //     while (next.constructor.name !== "Object") {
  //       if (next.constructor.name === 'Operation') {
  //         this.operations.push(operationObject)
  //         return;
  //       }

  //       next = Object.getPrototypeOf(next);
  //     }
  //     throw 'Child operation must be of type Operation! Check your "addOperation" calls.'
  //   }




  // },

  /**
   * 
   * @param {Operation[]} childOperations 
   * @param {*} passedData 
   * @param {CustomResponse} responseObjectFromParent 
   * @return {Promise<[]>} scrapedData
   */
  scrapeChildren: async function (childOperations, {url,html}) {//Scrapes the child operations of this OpenLinks object.

    // debugger;
    const scrapedData = []
    for (let operation of childOperations) {
      // const dataFromChild = await operation.scrape(responseObjectFromParent);
      const dataFromChild = await operation.scrape({url,html});

      scrapedData.push(dataFromChild);
    }
    // responseObjectFromParent = null;
    return scrapedData;
  }

};


module.exports = CompositeMixin;