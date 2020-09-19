const Operation = require('../Operation');//For jsdoc
const { request } = require('../../request/request.js');
const { stripTags } = require('../../utils/html');
const { CustomResponse } = require('../../request/request')//For jsdoc

class PageHelper {

    /**
     * 
     * @param {Operation} Operation 
     */
    constructor(Operation) {
        this.Operation = Operation;
    }




    /**
    * 
    * @param {string} scrapingAction      
    * @param {boolean} shouldPaginate   
    * @return {Promise<{_address:string,dataFromChildren:[]}>}   
    */
    async processOneScrapingAction(href, shouldPaginate) {//Will process one scraping object, including a pagination object. Used by Root and OpenLinks.
        // debugger;
        if (shouldPaginate) {//If the scraping object is actually a pagination one, a different function is called. 
            return this.paginate(href);
        }

        try {


            var scrapingActionResult = {
                _address:href
            }
            // debugger
            var response = await this.getPage(href);
            // debugger
            await this.runAfterResponseHooks(response)

            // debugger;
            var dataFromChildren = await this.Operation.scrapeChildren(this.Operation.operations, response)

            scrapingActionResult = {
                ...scrapingActionResult,
                ...dataFromChildren
                // data:dataFromChildren
            }
           
        }
        catch (error) {
           
            debugger;
            const errorString = `There was an error opening page ${href}, ${error}`;
            scrapingActionResult._error= errorString;
            scrapingActionResult._successful= false;
            this.Operation.errors.push(errorString);
            this.Operation.handleFailedScrapingAction(errorString);
        }finally{
            // debugger;
           
            return scrapingActionResult
        }
    }


    /**
     * 
     * @param {string} address 
     * @return {Promise<string[]>} paginationUrls
     */
    async paginate(address) {//Divides a given page to multiple pages.
        const pagination = this.Operation.config.pagination;

        const numPages = pagination.numPages;
        const firstPage = typeof pagination.begin !== 'undefined' ? pagination.begin : 1;
        const lastPage = pagination.end || numPages;
        const offset = pagination.offset || 1;
        const paginationUrls = []
        for (let i = firstPage; i <= lastPage; i = i + offset) {

            const mark = address.includes('?') ? '&' : '?';
            var paginationUrl;
            // var paginationObject;
            // debugger;
            if (pagination.queryString) {
                paginationUrl = `${address}${mark}${pagination.queryString}=${i}`;
            } else {
                paginationUrl = `${address}/${pagination.routingString}/${i}`.replace(/([^:]\/)\/+/g, "$1");
            }            
            paginationUrls.push(paginationUrl)

        }

        const dataFromChildren = [];

        await this.Operation.executeScrapingActions(paginationUrls, async (url) => {
            const data = await this.processOneScrapingAction(url, false);

            dataFromChildren.push(data);

        }, 3);//The argument 3 forces lower promise limitation on pagination.
        // return dataFromChildren;
        return {
            _address:address,
            _pagination:dataFromChildren
        }
    }



    /**
     * 
     * @param {string} href 
     * @return {Promise<CustomResponse>}
     */
    async getPage(href) {//Fetches the html of a given page.

        const promiseFactory = async () => {

            await this.Operation.beforePromiseFactory('Opening page:' + href);

            let resp;
            try {

                resp = await request({
                    method: 'get', url: href,
                    timeout: this.Operation.scraper.config.timeout,
                    auth: this.Operation.scraper.config.auth,
                    headers: this.Operation.scraper.config.headers,
                    proxy: this.Operation.scraper.config.proxy

                })
                if (this.Operation.scraper.config.removeStyleAndScriptTags) {
                    resp.data = stripTags(resp.data);
                }

                if (this.Operation.config.getPageHtml) {
                    await this.Operation.config.getPageHtml(resp.data, resp.url)
                }

            } catch (error) {
                // debugger;
                throw error;
            }
            finally {
                this.Operation.afterPromiseFactory();
            }
            return resp;
        }

        return await this.Operation.qyuFactory(() => this.Operation.repeatPromiseUntilResolved(promiseFactory, href));
    }



    

    /**
     * 
     * @param {CustomResponse} response 
     * @return {Promise<void>}
     */
    async runAfterResponseHooks(response) {
        if (this.Operation.config.getPageResponse) {//If a "getResponse" callback was provided, it will be called
            // debugger;
            if (typeof this.Operation.config.getPageResponse !== 'function')
                throw "'getPageResponse' callback must be a function";
            await this.Operation.config.getPageResponse(response);

        }
    }

    async runGetPageDataHook(ScrapingAction) {
        const getPageData = this.Operation.config.getPageData;
        if (getPageData) {
            // debugger;
            if (typeof getPageData !== 'function')
                throw "callback must be a function";

            // const cleanData = ScrapingAction.getCleanData();
            await getPageData(ScrapingAction);
        }
    }

}

module.exports = PageHelper;