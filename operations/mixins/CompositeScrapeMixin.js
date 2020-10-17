
/**
 * Used by composite operations(operations that contain other operations)
 * @mixin
 */
const CompositeScrapeMixin = {  


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


module.exports = CompositeScrapeMixin;