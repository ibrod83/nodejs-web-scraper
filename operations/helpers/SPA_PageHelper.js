const Operation = require('../Operation');//For jsdoc
const { stripTags } = require('../../utils/html');
const { CustomResponse } = require('../../request/request')//For jsdoc
const SPA_page = require('../../limitedSpa/SPA_Page');
const PageHelper = require('./PageHelper');



class SPA_PageHelper extends PageHelper {

    /**
     * 
     * @param {Operation} Operation 
     */
    constructor(Operation) {
        super(Operation)
        this.Operation = Operation;
    }


    /**
    * 
    * @param {string} href      
    * @param {boolean} shouldPaginate   
    * @return {Promise<{data:[],address:string}>}   
    */
    async processOneIteration(href, shouldPaginate) {//Will process one scraping object, including a pagination object. Used by Root and OpenLinks.
        // debugger;
        if (shouldPaginate) {//If the scraping object is actually a pagination one, a different function is called. 
            return this.paginate(href);
        }

        try {

            var iteration = {
                address: href,
                data: []
            }

            var SPA_Page = await this.getPage(href)
            // page = page;
            // const scrollToBottom = new ScrollToBottom({ numRepetitions: 10, delay: 1500 })
            for (let operation of this.Operation.operations) {
                SPA_Page.addOperation(operation)
            }

            // await page.scrape(page);
            const dataFromChildren = await SPA_Page.scrapeChildren();
            // debugger;
            const response = SPA_Page.getResponse();
            // debugger
            // const { status, statusText, headers, url } = response;


            // debugger
            // var response = await this.getPage(href);
            // debugger
            await this.runAfterResponseHooks(response)

            // debugger;
            // var dataFromChildren = await this.Operation.scrapeChildren(this.Operation.operations, response)

            await this.runGetPageObjectHook(href, dataFromChildren)

            iteration.data = dataFromChildren
        }
        catch (error) {
            console.log(error)
            // debugger;
            const errorString = `There was an error opening page ${href}, ${error}`;
            iteration.error = errorString;
            iteration.successful = false;
            this.Operation.errors.push(errorString);
            this.Operation.handleFailedScrapingIteration(errorString);
        } finally {
            // debugger;
            if(SPA_Page){
            //   SPA_Page.close();  
              await SPA_Page.close();  
            }
            
            return iteration
        }
    }

    
    /**
     * 
     * @param {string} href 
     * @return {Promise<SPA_page>}
     */
    async getPage(href) {

        const promiseFactory = async () => {

            await this.Operation.beforePromiseFactory('Opening page:' + href);

            // let resp;
            try {

                var page = new SPA_page(this.Operation.scraper.getPuppeteerSimpleInstance(), href);
                await page.init();
                // resp = await request({
                //     method: 'get', url: href,
                //     timeout: this.Operation.scraper.config.timeout,
                //     auth: this.Operation.scraper.config.auth,
                //     headers: this.Operation.scraper.config.headers,
                //     proxy: this.Operation.scraper.config.proxy

                // })
                // if (this.Operation.scraper.config.removeStyleAndScriptTags) {
                //     resp.data = stripTags(resp.data);
                // }

                if (this.Operation.config.getPageHtml) {
                    // debugger;
                    await this.Operation.config.getPageHtml(await page.getHtml(), page.url)
                }

            } catch (error) {
                // debugger;
                if(page){
                    await page.close();
                }
                throw error;
            }
            finally {
                this.Operation.afterPromiseFactory();
            }
            return page;
        }

        return await this.Operation.qyuFactory(() => this.Operation.repeatPromiseUntilResolved(promiseFactory, href));
    }


   


}

module.exports = SPA_PageHelper;