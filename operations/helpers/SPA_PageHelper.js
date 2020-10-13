const Operation = require('../Operation');//For jsdoc
const { stripTags } = require('../../utils/html');
// const { CustomResponse } = require('../../request/request')//For jsdoc
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

        if (shouldPaginate) {//If the scraping object is actually a pagination one, a different function is called. 
            return this.paginate(href);
        }
        try {

            var iteration = {
                address: href,
                data: []
            }

            var SPA_Page = await this.getPage(href)

            for (let operation of this.Operation.operations) {
                SPA_Page.addOperation(operation)
            }

            const dataFromChildren = await SPA_Page.scrapeChildren();

            const response = await SPA_Page.getResponse();

            await this.runAfterResponseHooks(response)


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
            if (SPA_Page) {
                await SPA_Page.close();
            }

            return iteration
        }
    }

    /**
     * 
     * @param {SPA_page} Page 
     */
    async runGetPageHtmlHook(Page){
        if (this.Operation.config.getPageHtml) {
            let html = await Page.getHtml();
            if (this.Operation.scraper.config.removeStyleAndScriptTags) {
                html = stripTags(html);
            }
            // debugger;
            await this.Operation.config.getPageHtml(html, Page.url)
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

                await this.runGetPageHtmlHook(page)


            } catch (error) {
                // debugger;
                if (page) {
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