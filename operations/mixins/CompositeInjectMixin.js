
/**
 * Used by composite operations(operations that contain other operations)
 * @mixin
 */
const CompositeInjectMixin = {

  injectScraper: function (ScraperInstance) {//Override the original init function of Operation
    this.scraper = ScraperInstance;

    ScraperInstance.registerOperation(this);
    for (let operation of this.operations) {
      operation.injectScraper(ScraperInstance);
    }
    this.validateOperationArguments();
  },

};


module.exports = CompositeInjectMixin;