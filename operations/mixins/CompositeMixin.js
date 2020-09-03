
//For intelissence
const HttpOperation = require('../HttpOperation')
const Scraper = require('../../Scraper')


/**
 * Used by composite operations(operations that contain other operations)
 * @mixin
 */
const CompositeMixin = {

  /**
   * 
   * @param {Scraper} ScraperInstance 
   */
  injectScraper:function(ScraperInstance) {//Override the original init function of Operation
    debugger;
    // this.reset()
    this.scraper = ScraperInstance;
    // this.handleNewOperationCreation(this)
    ScraperInstance.registerOperation(this);
    for (let operation of this.operations) {
      operation.injectScraper(ScraperInstance);
    }

    this.validateOperationArguments();

  },


  addOperation: function (operationObject) {//Adds a reference to an operation object     
    // console.log(operationObject instanceof Object.getPrototypeOf(HttpOperation))
    if (!(operationObject instanceof Object.getPrototypeOf(HttpOperation))) {
      throw 'Child operation must be of type Operation! Check your "addOperation" calls.'
    }

    this.operations.push(operationObject)
  },

  scrapeChildren: async function (responseObjectFromParent) {//Scrapes the child operations of this OpenLinks object.

    const scrapedData = []
    for (let operation of this.operations) {
      const dataFromChild = await operation.scrape(responseObjectFromParent);

      scrapedData.push(dataFromChild);//Pushes the data from the child

    }
    responseObjectFromParent = null;
    return scrapedData;
  }

};


module.exports = CompositeMixin;