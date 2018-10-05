const axios = require('axios');
var cheerio = require('cheerio');
var cheerioAdv = require('cheerio-advanced-selectors')
cheerio = cheerioAdv.wrap(cheerio)
var Input = require('prompt-input');
var sizeof = require('object-sizeof');
const Promise = require('bluebird');
const URL = require('url').URL;
// const EventEmitter = require('events');
const util = require('util')

const { Qyu } = require('qyu');
const fs = require('fs');
const ImageDownloader = require('./imageDownloader');


//***for debugging *******/

// var notFoundErrors = 0;
var overallSeconds = 0;
var overallPageRequests = 0;
var overallRequests = 0;
let currentlyRunning = 0;


class Scraper {
    constructor(globalConfig) {

        this.validateConfig(globalConfig)
        this.failedScrapingObjects = [];
        this.fakeErrors = false;
        this.useQyu = true;
        this.mockImages = true;
        this.overwriteImages = false;
        this.cloneImages = false;
        this.registeredSelectors = []//Holds a reference to each created selector.
        this.numRequests = 0;
        this.scrapingObjects = []//for debugging
        this.globalConfig = globalConfig
        this.qyu = new Qyu({ concurrency: this.globalConfig.concurrency || 3 })
        // this.on('create',()=>{
        //     console.log()
        // })
    }

    validateConfig(conf) {
        if (!conf || typeof conf !== 'object')
            throw 'Scraper constructor expects a configuration object';
        if (!conf.baseSiteUrl || !conf.startUrl)
            throw 'Please provide both baseSiteUrl and startUrl';
    }

    async scrape(rootObject) {//This function will begin the entire scraping process. Expects a reference to the root selector.
        if (!(rootObject instanceof RootSelector) || !rootObject)
            throw 'Scraper.scrape() expects a root selector object as an argument!';

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
            page: PageSelector,
            root: RootSelector,
            content: ContentSelector,
            image: ImageSelector
        }
    }

    createSelector(type, querySelector, config) {
        const currentClass = this.getClassMap()[type];
        let selectorObj = null;
        if (currentClass == RootSelector) {
            console.log(arguments[1])
            selectorObj = new currentClass(this, null, arguments[1]);
        } else {
            selectorObj = new currentClass(this, querySelector, config);
        }

        this.registeredSelectors.push(selectorObj)
        // selectorObj.emit('create')

        return selectorObj;


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
        for (let selector of this.registeredSelectors) {
            const fileName = selector.constructor.name === 'RootSelector' ? 'log' : selector.name;
            const data = selector.getData();
            await this.createLog({ fileName, data })
        }
        await this.createLog({ fileName: 'failedObjects', data: this.failedScrapingObjects })
    }


    async createLog(obj) {
        await this.saveFile(obj);
    }


    async repeatAllErrors(referenceToRootSelector) {
        while (true) {
            if (this.failedScrapingObjects.length > 0) {

                await this.repeatErrors();
                var entireTree = referenceToRootSelector.getData();

                await this.createLog({ fileName: 'log', data: entireTree })
                await this.createLog({ fileName: 'failedObjects', data: this.failedScrapingObjects })

            } else {
                return
            }

        }

    }

    async repeatErrors() {
        var input = new Input({
            name: 'first',
            message: 'continue?'
        });

        // this.fakeErrors = false;
        let counter = 0
        // const failedImages = this.failedScrapingObjects.filter((object) => { return !object.data })
        console.log('number of failed objects:', this.failedScrapingObjects.length)
        await input.run()
        await Promise.all(
            this.failedScrapingObjects.map(async (failedObject) => {
                counter++
                console.log('failed object counter:', counter)
                console.log('failed object', failedObject)
                const selectorContext = failedObject.referenceToSelectorObject();

                await selectorContext.processOneScrapingObject(failedObject);
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



class Selector {//Base abstract class for selectors. "leaf" selectors will inherit directly from it.

    constructor(context, querySelector, objectConfig) {
        // super();
        console.log(this)
        // this.context.globalConfig = ConfigClass.getInstance();
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
        this.selectors = [];//References to child selector objects.
        this.errors = [];//Holds the overall communication errors, encountered by the selector.
        // this.on('create',()=>{
        //     console.log(this.name+' created!');
        // })
        // this.on('scrape', () => {
        //     console.log(`${this.name} scraping!`)
        // })
    }



    createPresentableData(originalForm) {//Is used for passing cleaner data to user callbacks.
        switch (originalForm.type) {
            case 'Image Selector':
                return originalForm.data.map((image) => { return { name: originalForm.name, content: image.address } });

            case 'Content Selector':
                return originalForm.data;
            default:
                return originalForm.data;

        }
    }

    createScrapingObjectsFromRefs(refs, type) {

        const scrapingObjects = [];

        refs.forEach((href) => {
            if (href) {
                const absoluteUrl = this.getAbsoluteUrl(this.context.globalConfig.baseSiteUrl, href)
                var scrapingObject = this.createScrapingObject(absoluteUrl, type);
                scrapingObjects.push(scrapingObject);
            }

        })
        return scrapingObjects;
    }

    async executeScrapingObjects(scrapingObjects, overwriteConcurrency) {//Will execute scraping objects with concurrency limitation.
        console.log('overwriteConcurrency', overwriteConcurrency)
        await Promise.map(scrapingObjects, (scrapingObject) => {
            return this.processOneScrapingObject(scrapingObject);
        }, { concurrency: overwriteConcurrency ? overwriteConcurrency : this.context.globalConfig.concurrency || 3 })
    }

    handleFailedScrapingObject(scrapingObject, errorString) {
        console.error(errorString);
        scrapingObject.error = errorString;
        if (!this.context.failedScrapingObjects.includes(scrapingObject)) {
            console.log('scrapingObject not included,pushing it!')
            this.context.failedScrapingObjects.push(scrapingObject);
        }
    }


    qyuFactory(promiseFunction) {//This function pushes promise-returning functions into the qyu. 
        if (!this.context.useQyu) {
            return promiseFunction();
        }
        return this.context.qyu(promiseFunction);

    }



    referenceToSelectorObject() {//Gives a scraping object reference to the selector object, in which it was created. Used only in "repeatErrors()", after the initial scraping procedure is done.
        return this;
    }

    createScrapingObject(href, type) {//Creates a scraping object, for all selectors.
        const scrapingObject = {
            address: href,//The image href            
            referenceToSelectorObject: this.referenceToSelectorObject.bind(this),
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

        const errorCodesToSkip = ['404']
        const randomNumber = this.context.fakeErrors ? Math.floor(Math.random() * (3 - 1 + 1)) + 1 : 3;
        if (this.context.numRequests > 3 && randomNumber == 1) {
            throw 'randomly generated error,' + href;
        }

        const maxRetries = this.context.globalConfig.maxRetries || 5;
        try {
            overallRequests++
            console.log('overallRequests', overallRequests)
            this.context.numRequests++
            return await promiseFactory();
        } catch (error) {

            const errorCode = error.code;
            console.log(errorCode);
            if (errorCodesToSkip.includes(errorCode))
                throw `Skipping error ${errorCode}, from href: ${href}`;
            console.log('Retrying failed promise...error:', error, 'href:', href);
            const newRetries = retries + 1;
            console.log('Retreis', newRetries)
            if (newRetries > maxRetries) {//If it reached the maximum allowed number of retries, it throws an error.
                throw 'Maximum retries exceeded';
            }
            return await this.repeatPromiseUntilResolved(promiseFactory, href, newRetries);//Calls it self, as long as there are retries left.
        }

    }

    // getErrors() {//gets overall errors of the selector, in all "contexts".
    //     return this.errors;
    // }

    getAbsoluteUrl(base, relative) {//Handles the absolute URL.
        const newUrl = new URL(relative, base).toString();
        return newUrl;

    }


}

class CompositeSelector extends Selector {//Abstract class, that deals with "composite" selectors, like a link(a link can hold other links, or "leaves", like data or image selectors).

    // constructor(){
    //     this.on('scrape',()=>{
    //         console.log(`${this.name} scraping!`)
    //     })
    // }
    addSelector(selectorObject) {//Ads a reference to a selector object

        this.selectors.push(selectorObject)
    }

    stripTags(responseObject) {//Cleans the html string from script and style tags.
        responseObject.data = responseObject.data.replace(/<style[^>]*>[\s\S]*?(<\/style[^>]*>|$)/ig, '').replace(/<\s*script[^>]*>[\s\S]*?(<\s*\/script[^>]*>|$)/ig)

    }

    async processOneScrapingObject(scrapingObject) {//Will process one scraping object, including a pagination object.

        if (scrapingObject.type === 'pagination') {//If the scraping object is actually a pagination one, a different function is called. 
            return this.paginate(scrapingObject);
        }

        const href = scrapingObject.address;
        try {
            // if (this.context.fakeErrors && scrapingObject.type === 'pagination') { throw 'faiiiiiiiiiil' };

            var response = await this.getPage(href);

            if (this.before) {//If a "before" callback was provided, it will be called
                if (typeof this.before !== 'function')
                    throw "'Before' callback must be a function";
                await this.before(response)
            }
            // console.log('response.data after callback',response.data)
            scrapingObject.successful = true


        } catch (error) {
            const errorString = `There was an error opening page ${this.context.globalConfig.baseSiteUrl}${href},${error}`;
            this.handleFailedScrapingObject(scrapingObject, errorString);
            return;

        }

        const dataToPass = {//Temporary object, that will hold data that needs to be passed to child selectors.
            address: href,
        }

        try {
            var dataFromChildren = await this.scrapeChildren(this.selectors, dataToPass, response)
            response = {};

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

    async scrapeChildren(childSelectors, passedData, responseObjectFromParent) {//Scrapes the child selectors of this PageSelector object.

        const scrapedData = []
        for (let selector of childSelectors) {
            const dataFromChild = await selector.scrape(passedData, responseObjectFromParent);

            scrapedData.push(dataFromChild);//Pushes the data from the child

        }
        responseObjectFromParent = {};
        return scrapedData;
    }

    async paginate(scrapingObject) {//Divides a given page to multiple pages.
        // this.paginationBegan = true;
        delete scrapingObject.successful;
        const scrapingObjects = [];
        const numPages = this.pagination.numPages;
        var firstPage;
        var lastPage;
        if (typeof numPages === 'string') {
            if (!numPages.includes('-'))
                throw 'Pagination range must include a dash separator!';
            const pageRange = numPages.split('-');
            firstPage = parseInt(pageRange[0])
            lastPage = parseInt(pageRange[1])
        } else {
            firstPage = numPages - (numPages - 1);
            lastPage = numPages;
        }

        // console.log(pageRange)
        // const firstPage=

        for (let i = firstPage; i <= lastPage; i++) {

            const mark = scrapingObject.address.includes('?') ? '&' : '?';

            const paginationObject = this.createScrapingObject(`${scrapingObject.address}${mark}${this.pagination.queryString}=${i}`);
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
                resp = await axios({
                    method: 'get', url: href,
                    timeout: 5000,


                    //   proxy: {
                    //     host: '37.187.99.146',
                    //     port: 3128,
                    //     // auth: {
                    //     //     username: 'mikeymike',
                    //     //     password: 'rapunz3l'
                    //     // }
                    // }
                })
                // console.log('before strip',sizeof(resp.data))                           
                this.stripTags(resp);
                // console.log('after strip',sizeof(resp.data))
                // console.log(resp.data)
            } catch (error) {
                // console.error(error);
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


class RootSelector extends CompositeSelector {

    async scrape() {
        // this.emit('scrape')
        console.log(this)
        if (this.pagination && this.pagination.nextButton) {
            const paginationSelectors= [];
            for (let i = 0; i < this.pagination.numPages; i++) {
                const paginationSelector = this.context.createSelector('page', this.pagination.nextButton);
                paginationSelector.selectors = this.selectors;
                paginationSelectors.push(paginationSelector);
            }
            for(let paginationSelector of paginationSelectors){
               this.addSelector(paginationSelector);  
            }
           
        }
        const scrapingObject = this.createScrapingObject(this.context.globalConfig.startUrl, (this.pagination && this.pagination.queryString) && 'pagination')
        this.data = scrapingObject;
        await this.processOneScrapingObject(scrapingObject);

    }

    // getErrors() {//Will loop through all child selectors, get their errors, and join them into the errors of the current composite selector.
    //     let errors = [...this.errors];
    //     const registeredSelectors = [];

    //     this.selectors.forEach((childSelector, index) => {
    //         if (index != 0 && !registeredSelectors.includes(childSelector)) {
    //             const childErrors = childSelector.getErrors();
    //             errors = [...errors, ...childErrors];
    //             registeredSelectors.push(childSelector);
    //         } else {
    //             const childErrors = childSelector.getErrors();
    //             errors = [...errors, ...childErrors];
    //             registeredSelectors.push(childSelector);
    //         }
    //     })
    //     return errors;
    // }




}



class PageSelector extends CompositeSelector {

    async scrape(dataFromParent, responseObjectFromParent) {
        // this.emit('scrape')
        const currentWrapper = {//The envelope of all scraping objects, created by this selector. Relevant when the selector is used as a child, in more than one place.
            type: 'Page Selector',
            name: this.name,
            address: dataFromParent.address,
            data: []
        }

        var scrapingObjects = [];



        if (this.pagination && this.pagination.nextButton) {
            for (let i = 0; i < this.pagination.numPages; i++) {
                const paginationSelector = this.context.createSelector('page', this.pagination.nextButton);
                paginationSelector.selectors = this.selectors;
                this.context.createSelector('page', this.pagination.nextButton);
                this.addSelector(paginationSelector);
            }
        }
        const refs = this.createLinkList(responseObjectFromParent)
        responseObjectFromParent = {};
       
        scrapingObjects = this.createScrapingObjectsFromRefs(refs,(this.pagination && this.pagination.queryString) && 'pagination');//If the selector is paginated, will pass a flag.
        const hasPageSelectorChild = this.selectors.filter(child => child.constructor.name === 'PageSelector').length > 0;//Checks if the current page selector has any other page selectors in it. If so, will force concurrency limitation.
        console.log('haspageseelctorchild', hasPageSelectorChild)
        const forceConcurrencyLimit = hasPageSelectorChild && 3;
        console.log('forceConcurrencyLimit', forceConcurrencyLimit)
        await this.executeScrapingObjects(scrapingObjects, forceConcurrencyLimit);

        currentWrapper.data = [...currentWrapper.data, ...scrapingObjects];
        this.data = [...this.data, ...currentWrapper.data]

        return currentWrapper;
    }


    createLinkList(responseObjectFromParent) {
        const $ = cheerio.load(responseObjectFromParent.data);
        const scrapedLinks = $(this.querySelector);
        const refs = [];
        scrapedLinks.each((index, link) => {
            refs.push(link.attribs.href)

        })

        return refs;
    }


}


class ContentSelector extends Selector {

    async scrape(dataFromParent, responseObjectFromParent) {
        // this.emit('scrape')
        this.contentType = this.contentType || 'text';
        !responseObjectFromParent && console.log('empty reponse from content selector', responseObjectFromParent)
        const currentWrapper = {//The envelope of all scraping objects, created by this selector. Relevant when the selector is used as a child, in more than one place.
            type: 'Content Selector',
            name: this.name,
            address: dataFromParent.address,
            data: []
        }

        const $ = cheerio.load(responseObjectFromParent.data);

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

class ImageSelector extends Selector {

    async scrape(dataFromParent, responseObjectFromParent) {
        // this.emit('scrape')
        const currentWrapper = {//The envelope of all scraping objects, created by this selector. Relevant when the selector is used as a child, in more than one place.

            type: 'Image Selector',
            name: this.name,
            address: dataFromParent.address,
            data: [],

        }

        const $ = cheerio.load(responseObjectFromParent.data);
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

        return currentWrapper;

    }


    async fetchImage(url) {
        // console.log('fetching image:', url);
        const options = {
            url,
            dest: this.context.globalConfig.imagePath,
            clone: this.context.cloneImages,
            flag: this.context.globalConfig.imageFlag,
            mockImages: this.context.mockImages,
            responseType: this.context.globalConfig.imageResponseType || 'arraybuffer'
        }

        const asyncFunction = async () => {
            const imageDownloader = new ImageDownloader(options);
            currentlyRunning++;
            console.log('fetching image:', url)
            console.log('currentlyRunning:', currentlyRunning);
            let resp;
            try {
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



module.exports = Scraper;




