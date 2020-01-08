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

    stripTags(responseObject) {//Cleans the html string from script and style tags.


        if (this.scraper.config.removeStyleAndScriptTags) {
            responseObject.data = responseObject.data.replace(/<\s*script[^>]*>[\s\S]*?(<\s*\/script[^>]*>|$)/ig, '');
            responseObject.data = responseObject.data.replace(/<style[^>]*>[\s\S]*?(<\/style[^>]*>|$)/ig, '');

        }
        // console.log('after strip', sizeof(responseObject.data))

    }



    async getPage(href, bypassError) {//Fetches the html of a given page.

        const promiseFactory = async () => {

            await this.beforePromiseFactory('Opening page:' + href);

            let resp;
            try {             
                resp = await axios({
                    method: 'get', url: href,
                    timeout: this.scraper.config.timeout,
                    auth: this.scraper.config.auth,
                    headers: this.scraper.config.headers,

                })         

                if (this.scraper.config.removeStyleAndScriptTags) {
                    this.stripTags(resp);
                }

                if (this.getHtml) {
                    await this.getHtml(resp.data, resp.request.res.responseUrl)
                }
               
            } catch (error) {
                throw error;
            }
            finally {
                this.afterPromiseFactory();
            }
            return resp;
        }

        return await this.repeatPromiseUntilResolved(() => { return this.qyuFactory(promiseFactory) }, href, bypassError);

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
            if (this.getPageResponse) {//If a "getResponse" callback was provided, it will be called
                if (typeof this.getPageResponse !== 'function')
                    throw "'getPageResponse' callback must be a function";
                await this.getPageResponse(response);

            }else if (this.beforeOneLinkScrape) {//Backward compatibility
                if (typeof this.beforeOneLinkScrape !== 'function')
                    throw "'beforeOneLinkScrape' callback must be a function";
                await this.beforeOneLinkScrape(response);
            }
            
            scrapingObject.successful = true


        } catch (error) {
            // debugger;
            const errorCode = error.code
            const errorString = `There was an error opening page ${href}, ${error}`;
            this.errors.push(errorString);
            this.handleFailedScrapingObject(scrapingObject, errorString, errorCode);
            return;

        }

        try {
            var dataFromChildren = await this.scrapeChildren(this.operations, response)
            response = null;
            let callback;
            // debugger;
            callback = this.getPageData || this.afterOneLinkScrape;//For backward compatibility. 
            if (callback) {
                // debugger;
                if (typeof callback !== 'function')
                    throw  "callback must be a function";

                const cleanData = {
                    address: href,
                    data: []
                };

                dataFromChildren.forEach((dataFromChild) => {
                    // cleanData.data.push(this.createPresentableData(dataFromChild));
                    cleanData.data.push(dataFromChild);
                    // cleanData.push(dataFromChild)
                })
                await callback(cleanData);
            }

            if(this.getPageObject){
                
                
                const tree = {}
                for(let child of dataFromChildren){                    
                    debugger;
                    if(child.type === 'DownloadContent'){
                        const data = child.data.map(d=>d.address);
                        
                        tree[child.name] = data.length <= 1  ? data[0] : data     
                        continue;
                    }
                    // const type = typeof child
                    // console.log(type)
                    tree[child.name] = child.data.length <= 1  ? child.data[0] : child.data
                }
                this.getPageObject(tree)
            }

            
            scrapingObject.data = [...dataFromChildren];
        } catch (error) {
            console.error(error);
        }

    }


}


module.exports = CompositeOperation;