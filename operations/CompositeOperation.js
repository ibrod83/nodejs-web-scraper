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
            // console.log('delay from page', this.state.delay)
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
                    // httpAgent: new http.Agent({ keepAlive: true }),
                    // httpsAgent: new https.Agent({ keepAlive: true }),
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


}


module.exports = CompositeOperation;