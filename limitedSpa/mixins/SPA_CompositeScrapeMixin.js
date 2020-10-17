
/**
 * Used by composite operations(operations that contain other operations)
 * @mixin
 */
const SPA_CompositeScrapeMixin = {

   
  
  
    async scrapeChildren(puppeteerSimplePage) {
        // debugger;
        const { url } = puppeteerSimplePage
        const html = await puppeteerSimplePage.getHtml()
        const scrapedData = []
        for (let operation of this.operations) {
            const dataFromChild = await operation.scrape({ html, url }, puppeteerSimplePage);

            scrapedData.push(dataFromChild);
        }

        return scrapedData;

    }
  
  };
  
  
  module.exports = SPA_CompositeScrapeMixin;