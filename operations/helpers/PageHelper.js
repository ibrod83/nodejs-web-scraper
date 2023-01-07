const { request } = require('../../request/request.js');
const { stripTags } = require('../../utils/html');
const { mapPromisesWithLimitation } = require('../../utils/concurrency');
const { getDictionaryKey } = require('../../utils/objects');
const { getPaginationUrls } = require('../../utils/pagination');


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

        if (shouldPaginate) {//If the scraping object is actually a pagination one, a different function is called. 
            return this.paginate(href);
        }

        try {

            var iteration = {
                address: href,
                data: []
            }

            var response = await this.getPage(href);
            await this.runAfterResponseHooks(response)


            var dataFromChildren = await this.Operation.scrapeChildren(this.Operation.operations, { html: response.data, url: response.url })

            await this.runGetPageObjectHook(href, dataFromChildren)

            iteration.data = dataFromChildren
        }
        catch (error) {

            const errorString = `There was an error opening page ${href}, ${error}`;
            iteration.error = errorString;
            iteration.successful = false;
            this.Operation.errors.push(errorString);
            this.Operation.handleFailedScrapingIteration(errorString);
        } finally {
            return iteration
        }
    }



    /**
     * 
     * @param {string} address 
     * @return {Promise<string[]>} paginationUrls
     */
    async paginate(address) {//Divides a given page to multiple pages.
        const paginationConfig = this.Operation.config.pagination;
        const paginationUrls = getPaginationUrls(address, paginationConfig)


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
     * @return {Promise<string>}
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
                    proxy: this.Operation.scraper.config.proxy,
                    agent: this.Operation.scraper.config.agent

                })
                if (this.Operation.scraper.config.removeStyleAndScriptTags) {
                    resp.data = stripTags(resp.data);
                }

                if (this.Operation.config.getPageHtml) {

                    await this.Operation.config.getPageHtml(resp.data, resp.url)
                }

            } catch (error) {

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

            const tree = {}
            for (let child of dataFromChildren) {

                const func = getDictionaryKey(child.name);
                tree[func(child.name, tree)] = child.data
            }
            await this.Operation.config.getPageObject(tree, address)
        }
    }





    /**
     * 
     * @param {CustomResponse} response 
     * @return {Promise<void>}
     */
    async runAfterResponseHooks(response) {
        if (this.Operation.config.getPageResponse) {//If a "getResponse" callback was provided, it will be called

            if (typeof this.Operation.config.getPageResponse !== 'function')
                throw "'getPageResponse' callback must be a function";
            await this.Operation.config.getPageResponse(response);

        }
    }



}

module.exports = PageHelper;