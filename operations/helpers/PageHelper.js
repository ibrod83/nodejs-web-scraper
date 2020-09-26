const Operation = require('../Operation');//For jsdoc
const { request } = require('../../request/request.js');
const { stripTags } = require('../../utils/html');
const { mapPromisesWithLimitation } = require('../../utils/concurrency');
const { getDictionaryKey } = require('../../utils/objects');
const { CustomResponse } = require('../../request/request')//For jsdoc
// require('../typedef.js'); 

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
            // debugger
            var response = await this.getPage(href);
            // debugger
            await this.runAfterResponseHooks(response)

            // debugger;
            var dataFromChildren = await this.Operation.scrapeChildren(this.Operation.operations, response)

            await this.runGetPageObjectHook(href, dataFromChildren)

            iteration.data = dataFromChildren
        }
        catch (error) {

            debugger;
            const errorString = `There was an error opening page ${href}, ${error}`;
            iteration.error = errorString;
            iteration.successful = false;
            this.Operation.errors.push(errorString);
            this.Operation.handleFailedScrapingIteraeration(errorString);
        } finally {
            return iteration
        }
    }

    


    /**
     * 
     * @param {string} address 
     * @param {Object} config
     * @return {string[]}
     */
    getPaginationUrls(address, { numPages, begin, end, offset = 1, queryString, routingString }) {
        // const numPages = pagination.numPages;
        const firstPage = typeof begin !== 'undefined' ? begin : 1;
        const lastPage = end || numPages;
        // const offset = offset || 1;
        const paginationUrls = []
        for (let i = firstPage; i <= lastPage; i = i + offset) {

            const mark = address.includes('?') ? '&' : '?';
            var paginationUrl;

            if (queryString) {
                paginationUrl = `${address}${mark}${queryString}=${i}`;
            } else {
                paginationUrl = `${address}/${routingString}/${i}`.replace(/([^:]\/)\/+/g, "$1");
            }
            paginationUrls.push(paginationUrl)

        }

        return paginationUrls;
    }



    /**
     * 
     * @param {string} address 
     * @return {Promise<string[]>} paginationUrls
     */
    async paginate(address) {//Divides a given page to multiple pages.
        const paginationConfig = this.Operation.config.pagination;
        const paginationUrls = this.getPaginationUrls(address, paginationConfig)


        const dataFromChildren = [];

        await mapPromisesWithLimitation(paginationUrls, async (url) => {
            const data = await this.processOneIteration(url, false);

            dataFromChildren.push(data);

        }, 3);//The argument 3 forces lower promise limitation on pagination.
        // return dataFromChildren;
        return {
            address: address,
            data: dataFromChildren
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
                    // debugger;
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
     * @param {string} address 
     * @param {Array} dataFromChildren 
     */
    async runGetPageObjectHook(address, dataFromChildren) {
        if (this.Operation.config.getPageObject) {
            // debugger;

            const tree = {
                _address:address
            }
            for (let child of dataFromChildren) {
                // debugger;
                // tree[child.name] = child.data
                const func = getDictionaryKey(child.name);
                tree[func(child.name, tree)] = child.data
            }
            await this.Operation.config.getPageObject(tree)
        }
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



}

module.exports = PageHelper;