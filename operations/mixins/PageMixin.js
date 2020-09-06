const {request} = require('../../request/request.js');
const { stripTags } = require('../../utils/html');
const ScrapingObject = require('../../structures/ScrapingObject')
const {CustomResponse} = require('../../request/request')//For jsdoc


/**
 * @mixin
 */
const PageMixin = {

     /**
     * 
     * @param {ScrapingObject} scrapingObject      
     */
    processOneScrapingObject: async function(scrapingObject) {//Will process one scraping object, including a pagination object. Used by Root and OpenLinks.

        if (scrapingObject.type === 'pagination') {//If the scraping object is actually a pagination one, a different function is called. 
            return this.paginate(scrapingObject);
        }

        let href = scrapingObject.address;
        try {

            href = await this.runProcessUrlHook(href);

            var response = await this.getPage(href);

            await this.runAfterResponseHooks(response)

            scrapingObject.successful = true

            //this.scrapeChildren comes from compositeMixin.
            var dataFromChildren = await this.scrapeChildren(this.operations, response)

            response = null;
         
            await this.runGetPageDataHook(href,dataFromChildren)           

            await this.runGetPageObjectHook(scrapingObject,dataFromChildren);
           
            scrapingObject.data = [...dataFromChildren];

        }
        catch (error) {
            const errorCode = error.code
            const errorString = `There was an error opening page ${href}, ${error}`;
            this.errors.push(errorString);
            this.handleFailedScrapingObject(scrapingObject, errorString, errorCode);           
        }
    },   


    paginate:async function(scrapingObject) {//Divides a given page to multiple pages.
        const pagination = this.config.pagination;
        delete scrapingObject.successful;
        const scrapingObjects = [];
        const numPages = pagination.numPages;
        const firstPage = typeof pagination.begin !== 'undefined' ? pagination.begin : 1;
        const lastPage = pagination.end || numPages;
        const offset = pagination.offset || 1;

        for (let i = firstPage; i <= lastPage; i = i + offset) {

            const mark = scrapingObject.address.includes('?') ? '&' : '?';
            var paginationUrl;
            var paginationObject;
            // debugger;
            if (pagination.queryString) {
                paginationUrl = `${scrapingObject.address}${mark}${pagination.queryString}=${i}`;
            } else {

                paginationUrl = `${scrapingObject.address}/${pagination.routingString}/${i}`.replace(/([^:]\/)\/+/g, "$1");


            }
            if (pagination.processPaginationUrl) {
                try {
                    paginationUrl = await pagination.processPaginationUrl(paginationUrl)
                    // console.log('new href', url)
                } catch (error) {

                    console.error('Error processing URL, continuing with original one: ', paginationUrl);

                }

            }
            // paginationObject = this.createScrapingObject(paginationUrl);
            paginationObject = new ScrapingObject(paginationUrl,null,this.referenceToOperationObject.bind(this));
            this.scraper.state.scrapingObjects.push(scrapingObject)
            scrapingObjects.push(paginationObject);

        }

        scrapingObject.data = [...scrapingObjects];
        await this.executeScrapingObjects(scrapingObjects,(scrapingObject)=>{
            return this.processOneScrapingObject(scrapingObject)
        }, 3);//The argument 3 forces lower promise limitation on pagination.
    },



    getPage:async function(href) {//Fetches the html of a given page.

        const promiseFactory = async () => {

            await this.beforePromiseFactory('Opening page:' + href);

            let resp;
            try {

                resp = await request({
                    method: 'get', url: href,
                    timeout: this.scraper.config.timeout,
                    auth: this.scraper.config.auth,
                    headers: this.scraper.config.headers,
                    proxy: this.scraper.config.proxy

                })
                if (this.scraper.config.removeStyleAndScriptTags) {
                    resp.data = stripTags(resp.data);
                }

                if (this.config.getHtml) {
                    await this.config.getHtml(resp.data, resp.url)
                }

            } catch (error) {
                // debugger;
                throw error;
            }
            finally {
                this.afterPromiseFactory();
            }
            return resp;
        }

        return await this.qyuFactory(() => this.repeatPromiseUntilResolved(promiseFactory, href));
    },


    
    /**
     * 
     * @param {string} href
     * @return {Promise<string>} 
     */
    runProcessUrlHook: async function(href) {
        if (this.config.processUrl) {
            let finalHref;
            try {
                finalHref = await this.config.processUrl(href)
                // console.log('new href', href)
            } catch (error) {
                console.error('Error processing URL, continuing with original one: ', href);
                finalHref = href;
            } finally {
                return finalHref;
            }

        }
        return href;
    },

    
    /**
     * 
     * @param {CustomResponse} response 
     * @return {Promise<void>}
     */
    runAfterResponseHooks: async function(response) {
        if (this.config.getPageResponse) {//If a "getResponse" callback was provided, it will be called
            // debugger;
            if (typeof this.config.getPageResponse !== 'function')
                throw "'getPageResponse' callback must be a function";
            await this.config.getPageResponse(response);

        } else if (this.config.beforeOneLinkScrape) {//Backward compatibility
            if (typeof this.config.beforeOneLinkScrape !== 'function')
                throw "'beforeOneLinkScrape' callback must be a function";
            await this.config.beforeOneLinkScrape(response);
        }
    },


    /**
     * 
     * @param {string} href
     * @param {Array} dataFromChildren 
     * @return {Promise<void>}
     */
    runGetPageDataHook:async function(href,dataFromChildren) {
        const getPageData = this.config.getPageData;
        if (getPageData) {
            // debugger;
            if (typeof getPageData !== 'function')
                throw "callback must be a function";

            const cleanData = {
                address: href,
                data: []
            };

            dataFromChildren.forEach((dataFromChild) => {
                // cleanData.data.push(this.createPresentableData(dataFromChild));
                cleanData.data.push(dataFromChild);
                // cleanData.push(dataFromChild)
            })
            await getPageData(cleanData);
        }
    },


    /**
     * 
     * @param {ScrapingObject} scrapingObject 
     * @param {Array} dataFromChildren 
     * @return {Promise<void>}
     */
    runGetPageObjectHook:async function(scrapingObject,dataFromChildren){
        if (this.config.getPageObject) {

            const tree = {
                address: scrapingObject.address
            }
            for (let child of dataFromChildren) {
                if (child.type === 'DownloadContent') {
                    const data = child.data.map(d => d.address);

                    tree[child.name] = data.length <= 1 ? data[0] : data
                    continue;
                }

                tree[child.name] = child.data.length <= 1 ? child.data[0] : child.data
            }
            await this.config.getPageObject(tree)
        }
    }

};


module.exports = PageMixin;