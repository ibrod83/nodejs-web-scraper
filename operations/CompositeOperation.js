const InterneticOperation = require('./InterneticOperation');
const axios = require('axios');

class CompositeOperation extends InterneticOperation {//Base class for all operations that are composite, meaning they hold references to other Operations.

    addOperation(operationObject) {//Ads a reference to a operation object     
        // console.log(operationObject instanceof Object.getPrototypeOf(InterneticOperation))
        if (!(operationObject instanceof Object.getPrototypeOf(InterneticOperation))) {
            throw 'Child operation must be of type Operation! Check your "addOperation" calls.'
        }
        this.operations.push(operationObject)
    }

    
    async scrapeChildren(childOperations, passedData, responseObjectFromParent) {//Scrapes the child operations of this OpenLinks object.

        const scrapedData = []
        for (let operation of childOperations) {
            const dataFromChild = await operation.scrape(passedData, responseObjectFromParent);

            scrapedData.push(dataFromChild);//Pushes the data from the child

        }
        responseObjectFromParent = null;
        return scrapedData;
    }

  

    async getPage(href, bypassError) {//Fetches the html of a given page.

        const asyncFunction = async () => {
            this.scraper.state.currentlyRunning++;
            console.log('opening page', href);
            console.log('currentlyRunning:', this.scraper.state.currentlyRunning);
            await this.createDelay();
            this.scraper.state.numRequests++
            console.log('overall requests', this.scraper.state.numRequests)
            let resp;
            try {
                var begin = Date.now()


                resp = await axios({
                    method: 'get', url: href,
                    timeout: this.scraper.config.timeout,
                    auth: this.scraper.config.auth,
                    headers: this.scraper.config.headers,

                })
                // console.log(resp)
                // console.log('before strip',sizeof(resp.data))                           
                this.stripTags(resp);
                // console.log('after strip',sizeof(resp.data))
                // console.log(resp.data)
            } catch (error) {
                // console.error('error code from axios',error.response.status);
                throw error;
            }
            finally {
                // const end = Date.now();
                // const seconds = (end - begin) / 1000
                // console.log('seconds: ', seconds);
                // overallSeconds += seconds;
                // overallPageRequests++
                this.scraper.state.currentlyRunning--;
                console.log('currentlyRunning:', this.scraper.state.currentlyRunning);
            }
            return resp;
        }

        return await this.repeatPromiseUntilResolved(() => { return this.qyuFactory(asyncFunction) }, href, bypassError);

    }

    async processOneScrapingObject(scrapingObject) {//Will process one scraping object, including a pagination object. Used by Root and OpenLinks.

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
            // debugger;
            const errorCode = error.code
            const errorString = `There was an error opening page ${href}, ${error}`;
            this.errors.push(errorString);
            this.handleFailedScrapingObject(scrapingObject, errorString,errorCode);
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


}


module.exports = CompositeOperation;