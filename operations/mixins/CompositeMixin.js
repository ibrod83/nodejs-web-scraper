const HttpOperation = require('../HttpOperation')
/**
 * This provides methods used for event handling. It's not meant to
 * be used directly.
 *
 * @mixin
 */
const CompositeMixin = {

  addOperation: function (operationObject) {//Adds a reference to an operation object     
    // console.log(operationObject instanceof Object.getPrototypeOf(HttpOperation))
    if (!(operationObject instanceof Object.getPrototypeOf(HttpOperation))) {
      throw 'Child operation must be of type Operation! Check your "addOperation" calls.'
    }
    
    this.operations.push(operationObject)
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