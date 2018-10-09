

const URL = require('url').URL;
const Promise = require('bluebird');

function RequestTrait() {//This constructor will be used by all Operations that require some internet functionality.

}

RequestTrait.prototype.createScrapingObjectsFromRefs = function (refs, type) {
  const scrapingObjects = [];

  refs.forEach((href) => {
    if (href) {
      var scrapingObject = this.createScrapingObject(href, type);
      scrapingObjects.push(scrapingObject);
    }

  })
  return scrapingObjects;
}

RequestTrait.prototype.executeScrapingObjects = async function (scrapingObjects, overwriteConcurrency) {//Will execute scraping objects with concurrency limitation.
  await Promise.map(scrapingObjects, (scrapingObject) => {
    return this.processOneScrapingObject(scrapingObject);
  }, { concurrency: overwriteConcurrency ? overwriteConcurrency : this.scraper.config.concurrency })
}

RequestTrait.prototype.handleFailedScrapingObject = function (scrapingObject, errorString) {
  // debugger;
  console.error(errorString);
  scrapingObject.error = errorString;
  if (!this.scraper.state.failedScrapingObjects.includes(scrapingObject)) {
    this.scraper.state.failedScrapingObjects.push(scrapingObject);
  }
}

RequestTrait.prototype.qyuFactory = function (promiseFunction) {//This function pushes promise-returning functions into the qyu. 
  if (!this.scraper.config.useQyu) {
    return promiseFunction();
  }
  return this.scraper.qyu(promiseFunction);

}

RequestTrait.prototype.createDelay = async function () {
  // let currentSpacer = this.requestSpacer;
  // this.requestSpacer = (async () => {
  //     await currentSpacer;
  //     await Promise.delay(this.delay);
  // })();
  let currentSpacer = this.scraper.requestSpacer;
  this.scraper.requestSpacer = currentSpacer.then(() => Promise.delay(this.scraper.config.delay));
  await currentSpacer;
}

RequestTrait.prototype.repeatPromiseUntilResolved = async function (promiseFactory, href, retries = 0) {//Repeats a given failed promise few times(not to be confused with "repeatErrors()").

  const errorCodesToSkip = [404];
  const randomNumber = this.scraper.config.fakeErrors ? Math.floor(Math.random() * (3 - 1 + 1)) + 1 : 3;
  if (this.scraper.state.numRequests > 3 && randomNumber == 1) {
    throw 'randomly generated error,' + href;
  }

  const maxRetries = this.scraper.config.maxRetries;
  try {
    // overallRequests++
    // console.log('overallRequests', overallRequests)

    return await promiseFactory();
  } catch (error) {


    const errorCode = error.response ? error.response.status : error
    console.log('error code', errorCode);
    if (errorCodesToSkip.includes(errorCode))
      throw `Skipping error ${errorCode}`;
    console.log('Retrying failed promise...error:', error, 'href:', href);
    const newRetries = retries + 1;
    console.log('Retreis', newRetries)
    if (newRetries > maxRetries) {//If it reached the maximum allowed number of retries, it throws an error.
      throw error;
    }
    return await this.repeatPromiseUntilResolved(promiseFactory, href, newRetries);//Calls it self, as long as there are retries left.
  }

}

RequestTrait.prototype.getAbsoluteUrl = function (base, relative) {//Handles the absolute URL.
  // debugger;
  const newUrl = new URL(relative, base).toString();
  return newUrl;

}

RequestTrait.prototype.getBaseUrlFromBaseTag = function ($) {
  let baseMetaTag = $('base');

  // debugger;
  if (baseMetaTag.length == 0 || baseMetaTag.length > 1) {
    baseMetaTag = null;
  }
  else {
    baseMetaTag = baseMetaTag[0];
    var baseUrlFromBaseTag = baseMetaTag.attribs.href || null;
  }

  if (baseUrlFromBaseTag) {
    if (baseUrlFromBaseTag === '/') {
      baseUrlFromBaseTag = this.scraper.config.baseSiteUrl
    }
  }

  return baseUrlFromBaseTag;


}

RequestTrait.prototype.createScrapingObject = function (href, type) {//Creates a scraping object, for all operations.
  const scrapingObject = {
    address: href,//The image href            
    referenceToOperationObject: this.referenceToOperationObject.bind(this),
    successful: false,
    data: []
  }
  if (type)
    scrapingObject.type = type;

  this.scraper.state.scrapingObjects.push(scrapingObject)

  return scrapingObject;
}

RequestTrait.prototype.stripTags = function (responseObject) {//Cleans the html string from script and style tags.

  responseObject.data = responseObject.data.replace(/<style[^>]*>[\s\S]*?(<\/style[^>]*>|$)/ig, '').replace(/<\s*script[^>]*>[\s\S]*?(<\s*\/script[^>]*>|$)/ig)

}

RequestTrait.prototype.processOneScrapingObject = async function (scrapingObject) {//Will process one scraping object, including a pagination object.

  if (scrapingObject.type === 'pagination') {//If the scraping object is actually a pagination one, a different function is called. 
    return this.paginate(scrapingObject);
  }

  let href = scrapingObject.address;
  try {
    // if (this.state.fakeErrors && scrapingObject.type === 'pagination') { throw 'faiiiiiiiiiil' };
    if (this.processUrl) {
      try {
        href = await this.processUrl(href)
        // console.log('new href', href)
      } catch (error) {
        console.error('Error processing URL, continuing with original one: ', href);
      }

    }


    var response = await this.getPage(href);
    // debugger;
    if (this.beforeOneLinkScrape) {//If a "getResponse" callback was provided, it will be called
      if (typeof this.beforeOneLinkScrape !== 'function')
        throw "'beforeOneLinkScrape' callback must be a function";
      await this.beforeOneLinkScrape(response)
    }
    // console.log('response.data after callback',response.data)
    scrapingObject.successful = true


  } catch (error) {
    const errorString = `There was an error opening page ${href}, ${error}`;
    this.errors.push(errorString);
    this.handleFailedScrapingObject(scrapingObject, errorString);
    return;

  }

  try {
    var dataFromChildren = await this.scrapeChildren(this.operations, response)
    response = null;

    if (this.afterOneLinkScrape) {
      if (typeof this.afterOneLinkScrape !== 'function')
        throw "'afterOneLinkScrape' callback must be a function";

      const cleanData = {
        address: href,
        data: []
      };

      dataFromChildren.forEach((dataFromChild) => {
        // cleanData.data.push(this.createPresentableData(dataFromChild));
        cleanData.data.push(dataFromChild);
        // cleanData.push(dataFromChild)
      })
      await this.afterOneLinkScrape(cleanData);
    }
    scrapingObject.data = [...dataFromChildren];
  } catch (error) {
    console.error(error);
  }

}



module.exports = RequestTrait;