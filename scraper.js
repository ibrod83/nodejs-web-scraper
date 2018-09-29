const axios = require('axios');
var cheerio = require('cheerio');
var cheerioAdv = require('cheerio-advanced-selectors')
cheerio = cheerioAdv.wrap(cheerio)
var Input = require('prompt-input');
var sizeof = require('object-sizeof');
const Promise = require('bluebird');
const URL = require('url').URL;
// const EventEmitter = require('events');

const { Qyu } = require('qyu');
const fs = require('fs');
const file_downloader = require('./file_downloader');


//***for debugging *******/
let downloadedImages = 0;
// var notFoundErrors = 0;
var overallSeconds = 0;
var overallPageRequests = 0;
var overallRequests = 0;
let currentlyRunning = 0;


class Scraper {
    constructor(globalConfig) {
        this.config = {
            cloneImages: true,//If an image with the same name exists, a new file with a number appended to it is created. Otherwise. it's overwritten.
            fileFlag: 'w',//The flag provided to the file saving function. 
            concurrency: 3,//Maximum concurrent requests.
            maxRetries: 5,//Maximum number of retries of a failed request.
            imageResponseType: 'arraybuffer',//Either 'stream' or 'arraybuffer'
            startUrl: '',
            baseSiteUrl: '',
            delay: 100,
            timeout: 5000,
            filePath: null,//Needs to be provided only if an image operation is created.
            auth: null,
            headers: null
        }

        this.validateGlobalConfig(globalConfig);

        for (let prop in globalConfig) {

            this.config[prop] = globalConfig[prop];
        }
        // debugger;
        this.existingUserFileDirectories = [];
        this.failedScrapingObjects = [];
        this.fakeErrors = false;
        this.useQyu = true;
        this.mockImages = false;
        this.registeredOperations = []//Holds a reference to each created operation.
        this.numRequests = 0;
        this.scrapingObjects = []//for debugging    

        this.qyu = new Qyu({ concurrency: this.config.concurrency })//Creates an instance of the task-qyu for the requests.
        this.requestSpacer = Promise.resolve();


    }

    validateGlobalConfig(conf) {
        if (!conf || typeof conf !== 'object')
            throw 'Scraper constructor expects a configuration object';
        if (!conf.baseSiteUrl || !conf.startUrl)
            throw 'Please provide both baseSiteUrl and startUrl';
    }

    verifyDirectoryExists(path) {//Will make sure the target directory exists.
        if (!this.existingUserFileDirectories.includes(path)) {
            console.log('checking if dir exists:', path)
            if (!fs.existsSync(path)) {//Will run ONLY ONCE, so no worries about blocking the main thread.
                console.log('creating dir:', path)
                fs.mkdirSync(path);
            }
            this.existingUserFileDirectories.push(path);
        }

    }

    async scrape(rootObject) {//This function will begin the entire scraping process. Expects a reference to the root operation.
        if (!(rootObject instanceof Root) || !rootObject)
            throw 'Scraper.scrape() expects a root object as an argument!';

        await rootObject.scrape();
        if (this.config.logPath) {
            try {
                await this.createLogs();
            } catch (error) {
                console.error('Error creating logs', error)
            }
        }

        console.log('overall images: ',downloadedImages)
        await this.repeatAllErrors(rootObject);
    }

    getClassMap() {
        return {
            openLinks: OpenLinks,
            root: Root,
            collectContent: CollectContent,
            download: Download,
            inquiry: Inquiry
        }
    }

    createOperation(config) {
        this.validateOperationConfig(config);

        const currentClass = this.getClassMap()[config.type];
        this.registeredOperations.push()
        const newOperation = new currentClass(this, config);
        this.registeredOperations.push(newOperation);
        return newOperation

    }


    validateOperationConfig(config) {
        if (!config || typeof config !== 'object')
            throw 'Must provide a valid config object to every operation.'

        switch (config.type) {
            case 'download':
                if (!this.config.filePath)
                    throw 'Must provide a file path.'
                break;
            case 'openLinks':
            case 'collectContent':
                if (!config.querySelector)
                    throw `${config.type} operation must be provided with a querySelector.`;
                break;
            default:
                break;
        }
    }


    saveFile(obj) {

        return new Promise((resolve, reject) => {
            console.log('saving file')
            fs.writeFile(`./${obj.fileName}.json`, JSON.stringify(obj.data), (error) => {
                // reject('chuj ci w dupe')
                if (error) {
                    reject(error)
                } else {
                    console.log(`Log file ${obj.fileName} saved`);
                    resolve();
                }

            });

        })

    }

    async createLogs() {
        // debugger;
        for (let operation of this.registeredOperations) {
            const fileName = operation.constructor.name === 'Root' ? 'log' : operation.name;
            const data = operation.getData();
            await this.createLog({ fileName, data })
        }
        await this.createLog({ fileName: 'failedObjects', data: this.failedScrapingObjects })
    }


    async createLog(obj) {
        await this.saveFile(obj);
    }

    async createDelay() {
        // let currentSpacer = this.requestSpacer;
        // this.requestSpacer = (async () => {
        //     await currentSpacer;
        //     await Promise.delay(this.delay);
        // })();
        let currentSpacer = this.requestSpacer;
        this.requestSpacer = currentSpacer.then(() => Promise.delay(this.config.delay));
        await currentSpacer;
    }


    async repeatAllErrors(referenceToRootOperation) {
        while (true) {
            if (this.failedScrapingObjects.length) {

                const repeat = await this.repeatErrors();
                if (repeat === 'done')
                    return;
                var entireTree = referenceToRootOperation.getData();

                await this.createLog({ fileName: 'log', data: entireTree })
                await this.createLog({ fileName: 'failedObjects', data: this.failedScrapingObjects })

            } else {
                return
            }

        }

    }

    async repeatErrors() {
        var input = new Input({
            name: 'shouldScraperRepeat',
            message: 'Would you like to retry the failed operations? Type "y" for yes, any other key for no.'
        });

        // this.fakeErrors = false;
        let counter = 0
        // const failedImages = this.failedScrapingObjects.filter((object) => { return !object.data })
        console.log('number of failed objects:', this.failedScrapingObjects.length)
        const shouldScraperRepeat = await input.run();
        console.log(shouldScraperRepeat);
        if (shouldScraperRepeat !== 'y' && shouldScraperRepeat !== 'Y')
            return 'done';
        await Promise.all(
            this.failedScrapingObjects.map(async (failedObject) => {
                counter++
                console.log('failed object counter:', counter)
                console.log('failed object', failedObject)
                const operationContext = failedObject.referenceToOperationObject();

                await operationContext.processOneScrapingObject(failedObject);
                console.log('failed object after repetition', failedObject);
                if (failedObject.successful == true) {
                    delete failedObject.error;
                    this.failedScrapingObjects.splice(this.failedScrapingObjects.indexOf(failedObject), 1);
                }

            })
        )

        console.log('done repeating objects!')
    }




}



class Operation {//Base abstract class for operations. "leaf" operations will inherit directly from it.

    constructor(Scraper, objectConfig) {
        // validateOperationConfig();
        // console.log(this)
        if (objectConfig) {
            for (let i in objectConfig) {
                this[i] = objectConfig[i];
            }
        }
        if (!this.name)
            this.name = `Default ${this.constructor.name} name`;


        this.data = [];
        this.scraper = Scraper;//Reference to the scraper main object.
        // this.querySelector = querySelector;
        this.operations = [];//References to child operation objects.
        this.errors = [];//Holds the overall communication errors, encountered by the operation.

    }





    createPresentableData(originalData) {//Is used for passing cleaner data to user callbacks.
        var presentableData = {};
        switch (originalData.type) {

            case 'Collect Content':
            case 'File Downloader':
                presentableData.address = originalData.address
                presentableData.data = originalData.data
                break;
            default:
                presentableData = originalData


        }
        return presentableData;
    }

    async createNodeList($) {//Gets a cheerio object and creates a nodelist. Checks for "getNodeList" user callback.       

        const nodeList = this.slice ? $(this.querySelector).slice(typeof this.slice === 'number' ? this.slice : this.slice[0], this.slice[1]) : $(this.querySelector);

        if (this.getNodeList) {//If a "getNodeList" callback was provided, it will be called
            try {
                if (typeof this.getNodeList !== 'function') {
                    throw "'getNodeList' callback must be a function";
                }
                await this.getNodeList(nodeList)
            } catch (error) {
                console.error(error);

            }
        }
        // console.log('nodelist after removal',nodeList)
        return nodeList;
    }

    createScrapingObjectsFromRefs(refs, type) {

        const scrapingObjects = [];

        refs.forEach((href) => {
            if (href) {
                // const absoluteUrl = this.getAbsoluteUrl(baseUrlOfCurrentDomain, href)
                var scrapingObject = this.createScrapingObject(href, type);
                scrapingObjects.push(scrapingObject);
            }

        })
        return scrapingObjects;
    }

    async executeScrapingObjects(scrapingObjects, overwriteConcurrency) {//Will execute scraping objects with concurrency limitation.
        // console.log('overwriteConcurrency', overwriteConcurrency)
        await Promise.map(scrapingObjects, (scrapingObject) => {
            return this.processOneScrapingObject(scrapingObject);
        }, { concurrency: overwriteConcurrency ? overwriteConcurrency : this.scraper.config.concurrency })
    }

    handleFailedScrapingObject(scrapingObject, errorString) {
        console.error(errorString);
        scrapingObject.error = errorString;
        if (!this.scraper.failedScrapingObjects.includes(scrapingObject)) {
            // console.log('scrapingObject not included,pushing it!')
            this.scraper.failedScrapingObjects.push(scrapingObject);
        }
    }


    qyuFactory(promiseFunction) {//This function pushes promise-returning functions into the qyu. 
        if (!this.scraper.useQyu) {
            return promiseFunction();
        }
        return this.scraper.qyu(promiseFunction);

    }





    referenceToOperationObject() {//Gives a scraping object reference to the operation object, in which it was created. Used only in "repeatErrors()", after the initial scraping procedure is done.
        return this;
    }

    createScrapingObject(href, type) {//Creates a scraping object, for all operations.
        const scrapingObject = {
            address: href,//The image href            
            referenceToOperationObject: this.referenceToOperationObject.bind(this),
            successful: false,
            data: []
        }
        if (type)
            scrapingObject.type = type;

        this.scraper.scrapingObjects.push(scrapingObject)

        return scrapingObject;
    }

    getData() {
        return this.data;
    }


    async repeatPromiseUntilResolved(promiseFactory, href, retries = 0) {//Repeats a given failed promise few times(not to be confused with "repeatErrors()").

        const errorCodesToSkip = [404];
        const randomNumber = this.scraper.fakeErrors ? Math.floor(Math.random() * (3 - 1 + 1)) + 1 : 3;
        if (this.scraper.numRequests > 3 && randomNumber == 1) {
            throw 'randomly generated error,' + href;
        }

        const maxRetries = this.scraper.config.maxRetries;
        try {
            overallRequests++
            console.log('overallRequests', overallRequests)
            this.scraper.numRequests++
            return await promiseFactory();
        } catch (error) {


            const errorCode = error.response ? error.response.status : error
            console.log('error code', errorCode);
            if (errorCodesToSkip.includes(errorCode))
                throw `Skipping error ${errorCode}`;
            console.log('Retrying failed promise...error:', error, 'href:', href);
            const newRetries = retries + 1;
            console.log('Retreis', newRetries)
            if (newRetries > maxRetries) {//If it reached the maximum allowed number of retries, it throws an error.
                throw error;
            }
            return await this.repeatPromiseUntilResolved(promiseFactory, href, newRetries);//Calls it self, as long as there are retries left.
        }

    }

    getErrors() {//gets overall errors of the operation, in all "contexts".
        return this.errors;
    }

    getAbsoluteUrl(base, relative) {//Handles the absolute URL.
        const newUrl = new URL(relative, base).toString();
        return newUrl;

    }

    resolveActualBaseUrl(currentAddress) {
        const currentHost = new URL(currentAddress).host;
        const originalHost = new URL(this.scraper.config.baseSiteUrl).host;

        // console.log('currentHost', currentHost);

        return currentHost === originalHost ? this.scraper.config.baseSiteUrl : currentAddress

    }



}

class CompositeOperation extends Operation {//Abstract class, that deals with "composite" operations, like a link(a link can hold other links, or "leaves", like data or image operations).

    addOperation(operationObject) {//Ads a reference to a operation object
        // debugger;
        // const yoyo = operationObject instanceof Operation;
        if (!(operationObject instanceof Operation)) {
            throw 'Child operation must be of type Operation! Check your "addOperation" calls.'
        }
        // console.log(operationObject instanceof Operation)
        this.operations.push(operationObject)
    }

    stripTags(responseObject) {//Cleans the html string from script and style tags.

        responseObject.data = responseObject.data.replace(/<style[^>]*>[\s\S]*?(<\/style[^>]*>|$)/ig, '').replace(/<\s*script[^>]*>[\s\S]*?(<\s*\/script[^>]*>|$)/ig)

    }

    async processOneScrapingObject(scrapingObject) {//Will process one scraping object, including a pagination object.

        if (scrapingObject.type === 'pagination') {//If the scraping object is actually a pagination one, a different function is called. 
            return this.paginate(scrapingObject);
        }

        let href = scrapingObject.address;
        try {
            // if (this.scraper.fakeErrors && scrapingObject.type === 'pagination') { throw 'faiiiiiiiiiil' };
            if (this.processUrl) {
                try {
                    href = await this.processUrl(href)
                    // console.log('new href', href)
                } catch (error) {
                    console.error('Error processing URL, continuing with original one: ', href);
                }

            }


            var response = await this.getPage(href);

            if (this.getResponse) {//If a "getResponse" callback was provided, it will be called
                if (typeof this.getResponse !== 'function')
                    throw "'getResponse' callback must be a function";
                await this.getResponse(response)
            }
            // console.log('response.data after callback',response.data)
            scrapingObject.successful = true


        } catch (error) {
            const errorString = `There was an error opening page ${href}, ${error}`;
            this.errors.push(errorString);
            this.handleFailedScrapingObject(scrapingObject, errorString);
            return;

        }

        try {
            var dataFromChildren = await this.scrapeChildren(this.operations, response)
            response = null;

            if (this.afterScrape) {
                if (typeof this.afterScrape !== 'function')
                    throw "'afterScrape' callback must be a function";
                const cleanData = [];
                dataFromChildren.forEach((dataFromChild) => {
                    cleanData.push(this.createPresentableData(dataFromChild));
                    // cleanData.push(dataFromChild)
                })
                await this.afterScrape(cleanData);
            }
            scrapingObject.data = [...dataFromChildren];
        } catch (error) {
            console.error(error);
        }

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

    async paginate(scrapingObject) {//Divides a given page to multiple pages.

        delete scrapingObject.successful;
        const scrapingObjects = [];
        const numPages = this.pagination.numPages;
        const firstPage = typeof this.pagination.begin !== 'undefined' ? this.pagination.begin : 1;
        const lastPage = this.pagination.end || numPages;
        const offset = this.pagination.offset || 1;

        for (let i = firstPage; i <= lastPage; i = i + offset) {

            const mark = scrapingObject.address.includes('?') ? '&' : '?';
            var paginationUrl;
            var paginationObject;
            if (this.pagination.queryString) {
                paginationUrl = `${scrapingObject.address}${mark}${this.pagination.queryString}=${i}`;
            } else {
                paginationUrl = `${scrapingObject.address}/${this.pagination.routingString}/${i}`;

            }
            if (this.pagination.processPaginationUrl) {
                try {
                    paginationUrl = await this.pagination.processPaginationUrl(paginationUrl)
                    // console.log('new href', url)
                } catch (error) {
                    console.error('Error processing URL, continuing with original one: ', paginationUrl);

                }

            }
            paginationObject = this.createScrapingObject(paginationUrl);
            scrapingObjects.push(paginationObject);

        }

        scrapingObject.data = [...scrapingObjects];
        await this.executeScrapingObjects(scrapingObjects, 3);//The argument 3 forces lower promise limitation on pagination.
    }





    async getPage(href, bypassError) {//Fetches the html of a given page.

        const asyncFunction = async () => {
            currentlyRunning++;
            console.log('opening page', href);
            // console.log('currentlyRunning:', currentlyRunning);
            // console.log('delay from page', this.scraper.delay)
            await this.scraper.createDelay();
            let resp;
            try {
                var begin = Date.now()


                resp = await axios({
                    method: 'get', url: href,
                    timeout: this.scraper.config.timeout,
                    auth: this.scraper.config.auth,
                    headers: this.scraper.config.headers
                })
                console.log(resp)
                // console.log('before strip',sizeof(resp.data))                           
                this.stripTags(resp);
                // console.log('after strip',sizeof(resp.data))
                // console.log(resp.data)
            } catch (error) {
                // console.error('error code from axios',error.response.status);
                throw error;
            }
            finally {
                const end = Date.now();
                const seconds = (end - begin) / 1000
                // console.log('seconds: ', seconds);
                overallSeconds += seconds;
                overallPageRequests++
                currentlyRunning--;
                // console.log('currentlyRunning:', currentlyRunning);
            }
            return resp;
        }

        return await this.repeatPromiseUntilResolved(() => { return this.qyuFactory(asyncFunction) }, href, bypassError);

    }


}


class Root extends CompositeOperation {

    async scrape() {
        // this.emit('scrape')
        console.log(this)


        const scrapingObject = this.createScrapingObject(this.scraper.config.startUrl, this.pagination && 'pagination')
        this.data = scrapingObject;
        await this.processOneScrapingObject(scrapingObject);

    }

    getErrors() {//Will get the errors from all registered operations.
        let errors = [...this.errors];

        this.scraper.registeredOperations.forEach((operation) => {
            if (operation.constructor.name !== 'Root')
                errors = [...operation.getErrors()]
        })
        return errors;
    }




}



class OpenLinks extends CompositeOperation {

    async scrape(responseObjectFromParent) {
        // this.emit('scrape')
        console.log(this)
        const currentWrapper = {//The envelope of all scraping objects, created by this operation. Relevant when the operation is used as a child, in more than one place.
            type: 'Link Opener',
            name: this.name,
            address: responseObjectFromParent.config.url,
            data: []
        }

        var scrapingObjects = [];



        const baseUrlOfCurrentDomain = this.resolveActualBaseUrl(responseObjectFromParent.request.res.responseUrl);
        const refs = await this.createLinkList(responseObjectFromParent, baseUrlOfCurrentDomain)
        responseObjectFromParent = {};

        scrapingObjects = this.createScrapingObjectsFromRefs(refs, this.pagination && 'pagination');//If the operation is paginated, will pass a flag.
        const hasOpenLinksOperation = this.operations.filter(child => child.constructor.name === 'OpenLinks').length > 0;//Checks if the current page operation has any other page operations in it. If so, will force concurrency limitation.
        // console.log('hasOpenLinksOperation', hasOpenLinksOperation)

        const forceConcurrencyLimit = hasOpenLinksOperation && 3;
        // console.log('forceConcurrencyLimit', forceConcurrencyLimit)
        await this.executeScrapingObjects(scrapingObjects, forceConcurrencyLimit);

        currentWrapper.data = [...currentWrapper.data, ...scrapingObjects];
        this.data = [...this.data, ...currentWrapper.data]

        return currentWrapper;
    }


    async createLinkList(responseObjectFromParent, baseUrlOfCurrentDomain) {
        var $ = cheerio.load(responseObjectFromParent.data);
        const nodeList = await this.createNodeList($);
        $ = null;
        const refs = [];

        nodeList.each((index, link) => {
            const absoluteUrl = this.getAbsoluteUrl(baseUrlOfCurrentDomain, link.attribs.href)
            refs.push(absoluteUrl)

        })

        return refs;
    }


}


class CollectContent extends Operation {

    async scrape(responseObjectFromParent) {
        // this.emit('scrape')
        this.contentType = this.contentType || 'text';
        !responseObjectFromParent && console.log('empty reponse from content operation', responseObjectFromParent)
        const currentWrapper = {//The envelope of all scraping objects, created by this operation. Relevant when the operation is used as a child, in more than one place.
            type: 'Collect Content',
            name: this.name,
            address: responseObjectFromParent.config.url,
            data: []
        }

        var $ = cheerio.load(responseObjectFromParent.data);
        const nodeList = await this.createNodeList($);

        nodeList.each(async (index, element) => {
            // console.log('element',element)
            const content = this.getNodeContent($(element));
            currentWrapper.data.push({ element: element.name, [this.contentType]: content });
        })
        $ = null;

        if (this.afterScrape) {
            await this.afterScrape(this.createPresentableData(currentWrapper));
        }



        // this.overallCollectedData.push(this.currentlyScrapedData);
        this.data = [...this.data, currentWrapper];



        return currentWrapper;

    }

    getNodeContent(elem) {
        switch (this.contentType) {
            case 'text':
                return elem.text();
            case 'html':
                return elem.html();
            default:
                return elem.text();

        }
    }





}

class Download extends Operation {

    constructor(Scraper, objectConfig) {
        super(Scraper, objectConfig);
        this.overridableProps = ['filePath', 'fileFlag','imageResponseType'];
        // debugger;
        for (let prop in objectConfig) {
            if (this.overridableProps.includes(prop))
                this[prop] = objectConfig[prop];
        }


    }

    async scrape(responseObjectFromParent) {

        const currentWrapper = {//The envelope of all scraping objects, created by this operation. Relevant when the operation is used as a child, in more than one place.

            type: 'File Downloader',
            name: this.name,
            address: responseObjectFromParent.config.url,
            data: [],

        }

        this.contentType = this.contentType || 'image';
        var $ = cheerio.load(responseObjectFromParent.data);
        const nodeList = await this.createNodeList($);

        const baseUrlOfCurrentDomain = this.resolveActualBaseUrl(responseObjectFromParent.request.res.responseUrl);

        const fileRefs = [];

        nodeList.each((index, element) => {
            const originalSrc = $(element).attr(this.contentType === 'image' ? 'src' : 'href');
            if (!originalSrc || !this.customSrc && originalSrc.startsWith("data:image")) {
                console.error('Invalid image href:', $(element).attr('src'))
                return;
            }
            const src = this.customSrc ? $(element).attr(this.customSrc) : originalSrc;
            const absoluteUrl = this.getAbsoluteUrl(baseUrlOfCurrentDomain, src);
            fileRefs.push(absoluteUrl);

        })
        $ = null;

        if (!fileRefs.length) {
            // this.errors.push(`No images found by the query, in ${dataFromParent.address}`);
            // overallErrors++
            return;
        }

        const scrapingObjects = this.createScrapingObjectsFromRefs(fileRefs);

        await this.executeScrapingObjects(scrapingObjects);

        currentWrapper.data = [...currentWrapper.data, ...scrapingObjects];

        this.data.push(currentWrapper);

        if (this.afterScrape) {
            await this.afterScrape(this.createPresentableData(currentWrapper));
        }

        return currentWrapper;

    }

    async getFile(url) {


        if (this.processUrl) {
            try {
                url = await this.processUrl(url)
                // console.log('new href', url)
            } catch (error) {
                console.error('Error processing URL, continuing with original one: ', url);
            }

        }

        let responseType;
        // debugger;
        if (this.contentType === 'file') {
            responseType = 'stream';
        } else {

            if (this.imageResponseType) {
                responseType = this.imageResponseType;
            } else {
                responseType = this.scraper.config.imageResponseType || 'arraybuffer';
            }

        }

        // console.log('response type',responseType)
        
        // debugger;
        const options = {
            url,
            dest: this.filePath || this.scraper.config.filePath,
            clone: this.scraper.config.cloneImages,
            flag: this.fileFlag || this.scraper.config.fileFlag,
            responseType,
            auth: this.scraper.config.auth,
            timeout: this.scraper.config.timeout,
            headers: this.scraper.config.headers
        }

        this.scraper.verifyDirectoryExists(options.dest);



        const asyncFunction = async () => {

            const fileDownloader = new file_downloader(options);
            currentlyRunning++;
            console.log('fetching file:', url)
            // console.log('currentlyRunning:', currentlyRunning);
            // console.log('delay from image', this.scraper.delay)
            await this.scraper.createDelay()
            let resp;
            try {

                //**************TAKE CARE OF PROGRAM ENDING BEFORE ALL FILES COMPLETED**************** */
                await fileDownloader.download();
                if (!this.scraper.mockImages)
                    await fileDownloader.save();
            } catch (err) {

                if (err.code === 'EEXIST') {
                    console.log('File already exists in the directory, NOT overwriting it:', url);
                } else {
                    throw err;
                }
            }

            finally {
                currentlyRunning--;
                // console.log('currentlyRunning:', currentlyRunning);
            }
            return resp;

        }

        return await this.repeatPromiseUntilResolved(() => { return this.qyuFactory(asyncFunction) }, url).then(() => { downloadedImages++;console.log('images:',downloadedImages) })



    }


    async processOneScrapingObject(scrapingObject) {

        delete scrapingObject.data;//Deletes the unnecessary 'data' attribute.
        const fileHref = scrapingObject.address;
        if (!fileHref) {
            throw 'Image href is invalid, skipping.';
        }
        try {

            await this.getFile(fileHref);
            scrapingObject.successful = true;

        } catch (error) {

            const errorString = `There was an error fetching file:, ${fileHref}, ${error}`
            this.errors.push(errorString);
            this.handleFailedScrapingObject(scrapingObject, errorString)

            return;


        }

    }


}

class Inquiry extends Operation {

    async scrape(responseObjectFromParent) {


        // this.emit('scrape')
        const currentWrapper = {//The envelope of all scraping objects, created by this operation. Relevant when the operation is used as a child, in more than one place.
            type: 'Inquiry',
            name: this.name,
            address: responseObjectFromParent.config.url,
            data: {
                meetsCondition: false
            }
        }


        if (await this.condition(responseObjectFromParent) === true) {
            currentWrapper.data['meetsCondition'] = true;
        }

        this.data = [...this.data, currentWrapper];

        return currentWrapper;

    }







}


// const init = {
//     type: 'root',
//     config: {
//         baseSiteUrl: `https://www.profesia.sk`,
//         startUrl: `https://www.profesia.sk/praca/`
//     },
//     children: [
//         {
//             type: 'page',
//             config: { querySelector: '.list-row a.title', name: 'link' },
//             children: [
//                 {
//                     type: 'image',
//                     config: { querySelector: 'img', name: 'image' }
//                 }
//             ]

//         }

//     ]
// }





// function createObjectsFromTree(object) {
//     let Class = getClassMap()[object.type];
//     const instance = new Class(object.config || {});

//     if (object.children && object.children.length > 0) {
//         object.children.forEach((child) => {
//             console.log('child object');
//             instance.addSelector(createObjectsFromTree(child));
//         })
//     }

//     return instance

// }

// if (this.pagination && this.pagination.nextButton) {
//     var paginationSelectors = [];
//     for (let i = 0; i < this.pagination.numPages; i++) {
//         const paginationSelector = this.scraper.createSelector('page', this.pagination.nextButton);
//         paginationSelector.operations = this.operations;
//         paginationSelectors.push(paginationSelector);
//     }
//     // for(let paginationSelector of paginationSelectors){
//     //    this.addSelector(paginationSelector);  
//     // }
//     paginationSelectors.map(paginationSelector => this.operations = [...this.operations, paginationSelector])

// }



module.exports = Scraper;




