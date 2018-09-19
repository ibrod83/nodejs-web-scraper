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
const image_downloader = require('./image_downloader');


//***for debugging *******/
let downloadedImages = 0;
// var notFoundErrors = 0;
var overallSeconds = 0;
var overallPageRequests = 0;
var overallRequests = 0;
let currentlyRunning = 0;


class Scraper {
    constructor(globalConfig) {
        this.defaultConfig = {
            cloneImages: true,//If an image with the same name exists, a new file with a number appended to it is created. Otherwise. it's overwritten.
            imageFlag: 'w',//The flag provided to the file saving function. 
            concurrency: 3,//Maximum concurrent requests.
            maxRetries: 5,//Maximum number of retries of a failed request.
            imageResponseType: 'arraybuffer',//Either 'stream' or 'arraybuffer'
            startUrl: '',
            baseSiteUrl: '',
            imagePath: null//Needs to be provided only if an image operation is created.

        }

        this.validateConfig(globalConfig);

        for (let prop in globalConfig) {
            if (this.defaultConfig.hasOwnProperty(prop))
                this[prop] = globalConfig[prop];
        }
        this.failedScrapingObjects = [];
        this.fakeErrors = false;
        this.useQyu = true;
        this.mockImages = false;
        this.registeredOperations = []//Holds a reference to each created operation.
        this.numRequests = 0;
        this.scrapingObjects = []//for debugging       
        this.qyu = new Qyu({ concurrency: this.concurrency })//Creates an instance of the task-qyu for the requests.

    }

    validateConfig(conf) {
        if (!conf || typeof conf !== 'object')
            throw 'Scraper constructor expects a configuration object';
        if (!conf.baseSiteUrl || !conf.startUrl)
            throw 'Please provide both baseSiteUrl and startUrl';
    }

    async scrape(rootObject) {//This function will begin the entire scraping process. Expects a reference to the root operation.
        if (!(rootObject instanceof Root) || !rootObject)
            throw 'Scraper.scrape() expects a root object as an argument!';

        await rootObject.scrape();

        try {
            await this.createLogs();
        } catch (error) {
            console.error('Error creating logs', error)
        }

        await this.repeatAllErrors(rootObject);
    }

    getClassMap() {
        return {
            linkClicker: LinkClicker,
            root: Root,
            contentCollector: ContentCollector,
            imageDownloader: ImageDownloader
        }
    }

    createOperation(type, querySelector, config) {
        if (type === 'imageDownloader' && !this.imagePath)//If no image path was not originally provided to the Scraper object, an error is thrown.
            throw 'Must provide image path'
        const currentClass = this.getClassMap()[type];
        let operationObj = null;
        if (currentClass == Root) {
            // console.log(arguments[1])
            operationObj = new currentClass(this, null, arguments[1]);
        } else {
            operationObj = new currentClass(this, querySelector, config);
        }

        this.registeredOperations.push(operationObj)
        // operationObj.emit('create')

        return operationObj;


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


    async repeatAllErrors(referenceToRootOperation) {
        while (true) {
            if (this.failedScrapingObjects.length > 0) {

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

    constructor(context, querySelector, objectConfig) {
        // console.log(this)
        if (objectConfig) {
            for (let i in objectConfig) {
                this[i] = objectConfig[i];
            }
        }
        if (!this.name)
            this.name = `Default ${this.constructor.name} name`;


        this.data = [];
        this.context = context;//Reference to the scraper main object.
        this.querySelector = querySelector;
        this.operations = [];//References to child operation objects.
        this.errors = [];//Holds the overall communication errors, encountered by the operation.

    }



    createPresentableData(originalForm) {//Is used for passing cleaner data to user callbacks.
        switch (originalForm.type) {
            case 'Image Downloader':
                return originalForm.data.map((image) => { return { name: originalForm.name, content: image.address } });

            case 'Content Collector':
                return originalForm.data;
            default:
                return originalForm.data;

        }
    }

    createScrapingObjectsFromRefs(refs, type) {

        const scrapingObjects = [];

        refs.forEach((href) => {
            if (href) {
                const absoluteUrl = this.getAbsoluteUrl(this.context.baseSiteUrl, href)
                var scrapingObject = this.createScrapingObject(absoluteUrl, type);
                scrapingObjects.push(scrapingObject);
            }

        })
        return scrapingObjects;
    }

    async executeScrapingObjects(scrapingObjects, overwriteConcurrency) {//Will execute scraping objects with concurrency limitation.
        // console.log('overwriteConcurrency', overwriteConcurrency)
        await Promise.map(scrapingObjects, (scrapingObject) => {
            return this.processOneScrapingObject(scrapingObject);
        }, { concurrency: overwriteConcurrency ? overwriteConcurrency : this.context.concurrency })
    }

    handleFailedScrapingObject(scrapingObject, errorString) {
        console.error(errorString);
        scrapingObject.error = errorString;
        if (!this.context.failedScrapingObjects.includes(scrapingObject)) {
            // console.log('scrapingObject not included,pushing it!')
            this.context.failedScrapingObjects.push(scrapingObject);
        }
    }


    qyuFactory(promiseFunction) {//This function pushes promise-returning functions into the qyu. 
        if (!this.context.useQyu) {
            return promiseFunction();
        }
        return this.context.qyu(promiseFunction);

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

        this.context.scrapingObjects.push(scrapingObject)

        return scrapingObject;
    }

    getData() {
        return this.data;
    }


    async repeatPromiseUntilResolved(promiseFactory, href, retries = 0) {//Repeats a given failed promise few times(not to be confused with "repeatErrors()").

        const errorCodesToSkip = [404];
        const randomNumber = this.context.fakeErrors ? Math.floor(Math.random() * (3 - 1 + 1)) + 1 : 3;
        if (this.context.numRequests > 3 && randomNumber == 1) {
            throw 'randomly generated error,' + href;
        }

        const maxRetries = this.context.maxRetries;
        try {
            overallRequests++
            console.log('overallRequests', overallRequests)
            this.context.numRequests++
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


}

class CompositeOperation extends Operation {//Abstract class, that deals with "composite" operations, like a link(a link can hold other links, or "leaves", like data or image operations).

    addOperation(operationObject) {//Ads a reference to a operation object

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
            // if (this.context.fakeErrors && scrapingObject.type === 'pagination') { throw 'faiiiiiiiiiil' };
            if (this.processUrl) {
                try {
                    href = await this.processUrl(href)
                    // console.log('new href', href)
                } catch (error) {
                    console.error('Error processing URL, continuing with original one: ', href);
                }

            }


            var response = await this.getPage(href);

            if (this.before) {//If a "before" callback was provided, it will be called
                if (typeof this.before !== 'function')
                    throw "'Before' callback must be a function";
                await this.before(response)
            }
            // console.log('response.data after callback',response.data)
            scrapingObject.successful = true


        } catch (error) {
            const errorString = `There was an error opening page ${this.context.baseSiteUrl}${href}, ${error}`;
            this.errors.push(errorString);
            this.handleFailedScrapingObject(scrapingObject, errorString);
            return;

        }

        const dataToPass = {//Temporary object, that will hold data that needs to be passed to child operations.
            address: href,
        }

        try {
            var dataFromChildren = await this.scrapeChildren(this.operations, dataToPass, response)
            response = null;

            if (this.after) {
                if (typeof this.after !== 'function')
                    throw "'After' callback must be a function";
                const cleanData = [];
                dataFromChildren.forEach((dataFromChild) => {
                    cleanData.push(this.createPresentableData(dataFromChild));
                })
                await this.after(cleanData);
            }
            scrapingObject.data = [...dataFromChildren];
        } catch (error) {
            console.error(error);
        }

    }

    async scrapeChildren(childOperations, passedData, responseObjectFromParent) {//Scrapes the child operations of this LinkClicker object.

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

            var paginationObject = this.createScrapingObject(`${scrapingObject.address}${mark}${this.pagination.queryString}=${i}`);

            scrapingObjects.push(paginationObject);

        }

        scrapingObject.data = [...scrapingObjects];
        await this.executeScrapingObjects(scrapingObjects, 3);//The argument 3 forces lower promise limitation on pagination.
    }





    async getPage(href, bypassError) {//Fetches the html of a given page.

        const asyncFunction = async () => {
            currentlyRunning++;
            console.log('opening page', href);
            console.log('currentlyRunning:', currentlyRunning);
            let resp;
            try {
                var begin = Date.now()
                await Promise.delay(100)
                resp = await axios({
                    method: 'get', url: href,
                    timeout: 5000,
                })
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
                console.log('currentlyRunning:', currentlyRunning);
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


        const scrapingObject = this.createScrapingObject(this.context.startUrl, this.pagination && 'pagination')
        this.data = scrapingObject;
        await this.processOneScrapingObject(scrapingObject);

    }

    getErrors() {//Will get the errors from all registered operations.
        let errors = [...this.errors];

        this.context.registeredOperations.forEach((operation) => {
            if (operation.constructor.name !== 'Root')
                errors = [...operation.getErrors()]
        })
        return errors;
    }




}



class LinkClicker extends CompositeOperation {

    async scrape(dataFromParent, responseObjectFromParent) {
        // this.emit('scrape')
        console.log(this)
        const currentWrapper = {//The envelope of all scraping objects, created by this operation. Relevant when the operation is used as a child, in more than one place.
            type: 'Link Clicker',
            name: this.name,
            address: dataFromParent.address,
            data: []
        }

        var scrapingObjects = [];




        const refs = this.createLinkList(responseObjectFromParent)
        responseObjectFromParent = {};

        scrapingObjects = this.createScrapingObjectsFromRefs(refs, this.pagination && 'pagination');//If the operation is paginated, will pass a flag.
        const hasLinkClickerOperation = this.operations.filter(child => child.constructor.name === 'LinkClicker').length > 0;//Checks if the current page operation has any other page operations in it. If so, will force concurrency limitation.
        // console.log('hasLinkClickerOperation', hasLinkClickerOperation)
        const forceConcurrencyLimit = hasLinkClickerOperation && 3;
        // console.log('forceConcurrencyLimit', forceConcurrencyLimit)
        await this.executeScrapingObjects(scrapingObjects, forceConcurrencyLimit);

        currentWrapper.data = [...currentWrapper.data, ...scrapingObjects];
        this.data = [...this.data, ...currentWrapper.data]

        return currentWrapper;
    }


    createLinkList(responseObjectFromParent) {
        var $ = cheerio.load(responseObjectFromParent.data);
        const scrapedLinks = $(this.querySelector);
        const refs = [];
        scrapedLinks.each((index, link) => {
            refs.push(link.attribs.href)

        })

        $ = null;

        return refs;
    }


}


class ContentCollector extends Operation {

    async scrape(dataFromParent, responseObjectFromParent) {
        // this.emit('scrape')
        this.contentType = this.contentType || 'text';
        !responseObjectFromParent && console.log('empty reponse from content operation', responseObjectFromParent)
        const currentWrapper = {//The envelope of all scraping objects, created by this operation. Relevant when the operation is used as a child, in more than one place.
            type: 'Content Collector',
            name: this.name,
            address: dataFromParent.address,
            data: []
        }

        var $ = cheerio.load(responseObjectFromParent.data);

        const nodeList = $(this.querySelector);

        if (this.before) {//If a "before" callback was provided, it will be called
            if (typeof this.before !== 'function')
                throw "'Before' callback must be a function";
            await this.before(nodeList)
        }
        nodeList.each(async (index, element) => {
            // console.log('element',element)
            const content = this.getNodeContent($(element));
            currentWrapper.data.push({ element: element.name, [this.contentType]: content });
        })

        if (this.after) {
            await this.after(this.createPresentableData(currentWrapper));
        }

        $ = null;

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

class ImageDownloader extends Operation {

    async scrape(dataFromParent, responseObjectFromParent) {
        // this.emit('scrape')
        const currentWrapper = {//The envelope of all scraping objects, created by this operation. Relevant when the operation is used as a child, in more than one place.

            type: 'Image Downloader',
            name: this.name,
            address: dataFromParent.address,
            data: [],

        }

        var $ = cheerio.load(responseObjectFromParent.data);
        const nodeList = $(this.querySelector);
        const imageHrefs = [];
        nodeList.each((index, element) => {
            const src = $(element).attr('src');
            if (!src || !this.customSrc && src.startsWith("data:image")) {
                console.error('Invalid image href:', $(element).attr('src'))
                return;
            }
            imageHrefs.push(this.customSrc ? $(element).attr(this.customSrc) : src);

        })

        if (imageHrefs.length == 0) {
            // this.errors.push(`No images found by the query, in ${dataFromParent.address}`);
            // overallErrors++
            return;
        }

        const scrapingObjects = this.createScrapingObjectsFromRefs(imageHrefs);

        await this.executeScrapingObjects(scrapingObjects);

        currentWrapper.data = [...currentWrapper.data, ...scrapingObjects];

        this.data.push(currentWrapper);

        if (this.after) {
            await this.after(this.createPresentableData(currentWrapper));
        }

        $ = null;

        return currentWrapper;

    }


    async fetchImage(url) {


        if (this.processUrl) {
            try {
                url = await this.processUrl(url)
                // console.log('new href', url)
            } catch (error) {
                console.error('Error processing URL, continuing with original one: ', url);
            }

        }

        const options = {
            url,
            dest: this.context.imagePath,
            clone: this.context.cloneImages,
            flag: this.context.imageFlag,
            mockImages: this.context.mockImages,
            responseType: this.context.imageResponseType
        }



        const asyncFunction = async () => {
            const imageDownloader = new image_downloader(options);
            currentlyRunning++;
            console.log('fetching image:', url)
            console.log('currentlyRunning:', currentlyRunning);
            let resp;
            try {
                await Promise.delay(100)
                await imageDownloader.download();
                if (!this.context.mockImages)
                    await imageDownloader.save();
            } catch (err) {

                if (err.code === 'EEXIST') {
                    console.log('File already exists in the directory, NOT overwriting it:', url);
                } else {
                    throw err;
                }
            }

            finally {
                currentlyRunning--;
                console.log('currentlyRunning:', currentlyRunning);
            }
            return resp;

        }

        return await this.repeatPromiseUntilResolved(() => { return this.qyuFactory(asyncFunction) }, url).then(() => { downloadedImages++ })



    }


    async processOneScrapingObject(scrapingObject) {

        delete scrapingObject.data;//Deletes the unnecessary 'data' attribute.
        const imageHref = scrapingObject.address;
        if (!imageHref) {
            throw 'Image href is invalid, skipping.';
        }
        try {

            await this.fetchImage(imageHref);
            scrapingObject.successful = true;

        } catch (error) {

            const errorString = `there was an error fetching image:, ${imageHref}, ${error}`
            this.errors.push(errorString);
            this.handleFailedScrapingObject(scrapingObject, errorString)

            return;


        }

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
//         const paginationSelector = this.context.createSelector('page', this.pagination.nextButton);
//         paginationSelector.operations = this.operations;
//         paginationSelectors.push(paginationSelector);
//     }
//     // for(let paginationSelector of paginationSelectors){
//     //    this.addSelector(paginationSelector);  
//     // }
//     paginationSelectors.map(paginationSelector => this.operations = [...this.operations, paginationSelector])

// }



module.exports = Scraper;




