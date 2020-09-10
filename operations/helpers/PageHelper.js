const Operation = require('../Operation');//For jsdoc
const { request } = require('../../request/request.js');
const { stripTags } = require('../../utils/html');
const ScrapingAction = require('../../structures/ScrapingAction')
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
    * @param {ScrapingAction} scrapingAction      
    */
    async processOneScrapingAction(scrapingAction) {//Will process one scraping object, including a pagination object. Used by Root and OpenLinks.
        // debugger;
        if (scrapingAction.type === 'pagination') {//If the scraping object is actually a pagination one, a different function is called. 
            return this.paginate(scrapingAction);
        }

        let href = scrapingAction.address;
        try {

            href = await this.runProcessUrlHook(href);

            var response = await this.getPage(href);

            await this.runAfterResponseHooks(response)

            scrapingAction.successful = true

            var dataFromChildren = await this.Operation.scrapeChildren(this.Operation.operations, response)

            response = null;

            scrapingAction.data = [...dataFromChildren];

            await this.runGetPageDataHook(scrapingAction)
        }
        catch (error) {
            // debugger;
            const errorCode = error.code
            const errorString = `There was an error opening page ${href}, ${error}`;
            this.Operation.errors.push(errorString);
            this.Operation.handleFailedScrapingAction(scrapingAction, errorString, errorCode);
        }
    }


    /**
     * 
     * @param {ScrapingAction} scrapingAction 
     */
    async paginate(scrapingAction) {//Divides a given page to multiple pages.
        const pagination = this.Operation.config.pagination;
        delete scrapingAction.successful;
        const scrapingActions = [];
        const numPages = pagination.numPages;
        const firstPage = typeof pagination.begin !== 'undefined' ? pagination.begin : 1;
        const lastPage = pagination.end || numPages;
        const offset = pagination.offset || 1;

        for (let i = firstPage; i <= lastPage; i = i + offset) {

            const mark = scrapingAction.address.includes('?') ? '&' : '?';
            var paginationUrl;
            var paginationObject;
            // debugger;
            if (pagination.queryString) {
                paginationUrl = `${scrapingAction.address}${mark}${pagination.queryString}=${i}`;
            } else {

                paginationUrl = `${scrapingAction.address}/${pagination.routingString}/${i}`.replace(/([^:]\/)\/+/g, "$1");


            }
            if (pagination.processPaginationUrl) {
                try {
                    paginationUrl = await pagination.processPaginationUrl(paginationUrl)
                    // console.log('new href', url)
                } catch (error) {

                    console.error('Error processing URL, continuing with original one: ', paginationUrl);

                }

            }
            // paginationObject = this.Operation.createScrapingAction(paginationUrl);
            paginationObject = new ScrapingAction(paginationUrl, 'paginationPage', this.Operation.referenceToOperationObject.bind(this));
            this.Operation.scraper.state.scrapingActions.push(scrapingAction)
            scrapingActions.push(paginationObject);

        }

        scrapingAction.data = [...scrapingActions];
        await this.Operation.executeScrapingActions(scrapingActions, (scrapingAction) => {
            return this.processOneScrapingAction(scrapingAction)
        }, 3);//The argument 3 forces lower promise limitation on pagination.
    }



    /**
     * 
     * @param {string} href 
     * @return {CustomResponse}
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
     * @param {string} href
     * @return {Promise<string>} 
     */
    async runProcessUrlHook(href) {
        if (this.Operation.config.processUrl) {
            let finalHref;
            try {
                finalHref = await this.Operation.config.processUrl(href)
                // console.log('new href', href)
            } catch (error) {
                console.error('Error processing URL, continuing with original one: ', href);
                finalHref = href;
            } finally {
                return finalHref;
            }

        }
        return href;
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