
/**
 * Used by composite operations(operations that contain other operations)
 * @mixin
 */
const CompositeScrapeMixin = {


  scrapeChildren: async function (childOperations, { url, html }) {//Scrapes the child operations of this OpenLinks object.

    const scrapedData = []
    for (let operation of childOperations) {
      const dataFromChild = await operation.scrape({ url, html });

      scrapedData.push(dataFromChild);
    }
    return scrapedData;
  }

};


module.exports = CompositeScrapeMixin;