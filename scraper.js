const axios = require('axios');
var cheerio = require('cheerio');
var cheerioAdv = require('cheerio-advanced-selectors')
cheerio = cheerioAdv.wrap(cheerio)
var Input = require('prompt-input');
var sizeof = require('object-sizeof');
const Promise = require('bluebird');
const URL = require('url').URL;
// const util = require('util')
const download = require('./image_downloader');
const { Qyu } = require('qyu');
const fs = require('fs');
const ImageDownloader = require('./imageDownloader');
const fetch = require('node-fetch');

//***for debugging *******/
let downloadedImages = 0;
// var notFoundErrors = 0;
var overallSeconds = 0;
var overallPageRequests = 0;
let currentlyRunning = 0;


class Scraper {
    constructor(globalConfig) {
        this.failedScrapingObjects = [];
        this.fakeErrors = false;
        this.useQyu = true;
        this.mockImages = true;
        this.overwriteImages = false;
        this.cloneImages = false;
        this.registeredSelectors=[]//Holds a reference to each created selector.
        this.numRequests = 0;
        this.scrapingObjects = []//for debugging
        this.globalConfig = globalConfig
        this.qyu = new Qyu({ concurrency: this.globalConfig.concurrency || 3 })
    }

    async scrape(rootObject) {//This function will begin the entire scraping process. Expects a reference to the root selector.
        if (!(rootObject instanceof RootSelector) || !rootObject)
            throw 'Scraper.scrape() expects a root selector object as an argument!';

        console.log(rootObject instanceof RootSelector);
        await rootObject.scrape();


        try {
          await this.createLogs();  
        } catch (error) {
           console.error('Error creating logs',error) 
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
        let selectorObj=null;
        if (currentClass === 'RootSelector'){
            selectorObj = new currentClass(this);
        }else{
           selectorObj = new currentClass(this, querySelector, config); 
        }

        this.registeredSelectors.push(selectorObj)
        return selectorObj;    

        
    }


    filePromise(obj) {

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

    async createLogs(){
        for(let selector of this.registeredSelectors){
            const fileName = selector.constructor.name === 'RootSelector' ? 'log' : selector.name;
            const data = selector.getData(); 
            await this.createLog({fileName,data})
        }
        await this.createLog({ fileName: 'failedObjects', data: this.failedScrapingObjects })
    }


    async createLog(obj) {

        await this.filePromise(obj)
        // await fs.writeFile(`./${obj.fileName}.json`, JSON.stringify(obj.object));


    }

    async repeatAllErrors(referenceToRootSelector) {
        while (true) {
            if (this.failedScrapingObjects.length > 0) {

                await this.repeatErrors();
                var entireTree = referenceToRootSelector.getData();

                await this.createLog({ fileName: 'log', object: entireTree })
                await this.createLog({ fileName: 'failedObjects', object: this.failedScrapingObjects })

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
                if (failedObject.successful == true)
                    this.failedScrapingObjects.splice(this.failedScrapingObjects.indexOf(failedObject), 1);
            })
        )

        console.log('done repeating objects!')
    }




}



class Selector {//Base abstract class for selectors. "leaf" selectors will inherit directly from it.

    constructor(context, querySelector, objectConfig) {
        // this.context.globalConfig = ConfigClass.getInstance();
        if (objectConfig) {
            for (let i in objectConfig) {
                this[i] = objectConfig[i];
            }
        }
        if (!this.name)
            this.name = `Default ${this.constructor.name} name`;


        this.data = [];
        this.context = context;
        this.querySelector = querySelector;
        this.selectors = [];//References to child selector objects.
        this.errors = [];//Holds the overall communication errors, encountered by the selector.
    }

    async createScrapingObjectPromise(scrapingObject) {
        await this.processOneScrapingObject(scrapingObject);
    }

    createPresentableData(originalForm) {//Is used for passing cleaner data to user callbacks.
        switch (originalForm.type) {
            case 'Image Selector':
                return originalForm.data[0].map((image) => { return { name: originalForm.name, content: image.address } });

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

    async executeScrapingObjects(scrapingObjects, overwriteConcurrency) {//Wraps every scraping object in a promise, while limiting their concurrency.
        console.log('scraping objects', scrapingObjects)
        await Promise.map(scrapingObjects, (scrapingObject) => {
            return this.createScrapingObjectPromise(scrapingObject);
        }, { concurrency: overwriteConcurrency ? overwriteConcurrency : this.context.globalConfig.concurrency || 3 })
    }


    qyuFactory(promiseFunction) {//This function pushes promise-returning functions into the qyu. 
        if (!this.context.useQyu) {
            return promiseFunction();
        }
        return this.context.qyu(promiseFunction);

    }



    referenceToSelectorObject() {//Gives a scraping object reference to the selector object, in which it was created. Used only in "repeatErrors()", after the initial scraping procedure is done.
        return this
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

        const randomNumber = this.context.fakeErrors ? Math.floor(Math.random() * (3 - 1 + 1)) + 1 : 3;
        if (this.context.numRequests > 3 && randomNumber == 1) {
            throw 'randomly generated error,' + href;
        }

        const maxRetries = 5
        try {
            this.context.numRequests++
            return await promiseFactory();
        } catch (error) {
            console.log('retrying failed promise...error:', error, 'href:', href);
            const newRetries = retries + 1;
            console.log('retreis', newRetries)
            if (newRetries == maxRetries) {//If it reached the maximum allowed number of retries, it throws an error.
                throw 'maximum retries exceeded';
            }
            return await this.repeatPromiseUntilResolved(promiseFactory, href, newRetries);//Calls it self, as long as there are retries left.
        }

    }

    getErrors() {//gets overall errors of the selector, in all "contexts".
        return this.errors;
    }

    getAbsoluteUrl(base, relative) {//Handles the absolute URL.
        const newUrl = new URL(relative, base).toString();
        return newUrl;

    }


}

class CompositeSelector extends Selector {//Abstract class, that deals with "composite" selectors, like a link(a link can hold other links, or "leaves", like data or image selectors).

    addSelector(selectorObject) {//Ads a reference to a selector object
        this.selectors.push(selectorObject)
    }

    stripTags(responseObject) {//Cleans the html string from script and style tags.
        responseObject.data = responseObject.data.replace(/<style[^>]*>[\s\S]*?(<\/style[^>]*>|$)/ig, '').replace(/<\s*script[^>]*>[\s\S]*?(<\s*\/script[^>]*>|$)/ig)

    }

    async scrapeChildren(childSelectors, passedData, responseObjectFromParent) {//Scrapes the child selectors of this PageSelector object.

        const scrapedData = []
        for (let selector of childSelectors) {
            const dataFromChild = await selector.scrape(passedData, responseObjectFromParent);
            scrapedData.push(dataFromChild);//Pushes the data from the child

        }
        return scrapedData;
    }



    async getPage(href, bypassError) {//Fetches the html of a given page.

        const asyncFunction = async () => {
            currentlyRunning++;
            console.log('opening page', href);
            console.log('currentlyRunning:', currentlyRunning);
            let resp;
            try {
                var begin = Date.now()
                resp = await axios({ method: 'get', url: href })
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

    // constructor(context) {

    //     super(context);

    //     // this.context.globalConfig.setConfigurationData(configObj);
    //     this.name = "Root Selector"
    //     this.selectors = [];
    //     this.html = "";
    // }



    getErrors() {//Will loop through all child selectors, get their errors, and join them into the errors of the current composite selector.
        let errors = [...this.errors];
        const registeredSelectors = [];

        this.selectors.forEach((childSelector, index) => {
            if (index != 0 && !registeredSelectors.includes(childSelector)) {
                const childErrors = childSelector.getErrors();
                errors = [...errors, ...childErrors];
                registeredSelectors.push(childSelector);
            } else {
                const childErrors = childSelector.getErrors();
                errors = [...errors, ...childErrors];
                registeredSelectors.push(childSelector);
            }
        })
        return errors;
    }

    // getTypesOfChildSelectors() {
    //     return this.selectors.map(selector => selector.constructor.name);
    // }

    // shouldRootSelectorGetHtml(){
    //     const typesOfAllChildSelectors = this.getTypesOfChildSelectors();
    //     return true;
    // }


    async scrape() {


        // this.data = {
        //     siteRoot: this.context.globalConfig.baseSiteUrl,
        //     startUrl: this.context.globalConfig.startUrl,
        //     data: [],//Will hold the data collected from the child selectors.
        // }



        try {
            var response = await this.getPage(this.context.globalConfig.startUrl, true);
            // console.log('response from root', response.data)

        } catch (error) {
            console.error('Error fetching root page: ', error)
            throw error;
        }
        var dataToPass = {
            address: this.context.globalConfig.startUrl
        }

        var dataFromChildren = await this.scrapeChildren(this.selectors, dataToPass, response)
        this.data = [...dataFromChildren];

    }



}



class PageSelector extends CompositeSelector {

    // constructor(context, querySelector, configObj) {
    //     super(context, querySelector, configObj);
    //     // this.data = {
    //     //     type: 'Page Selector',
    //     //     name: this.name,
    //     //     data: []
    //     // }
    //     this.data=[]
    // }

    async scrape(dataFromParent, responseObjectFromParent) {

        const currentWrapper = {
            type: 'Page Selector',
            name: this.name,
            address: dataFromParent.address,
            data: []
        }

        var scrapingObjects = [];
        // let overridePromiseLimitation = null;
        // if (!this.pagination) {
        //     const refs = this.createLinkList(responseObjectFromParent)
        //     responseObjectFromParent = {};
        //     scrapingObjects = this.createScrapingObjectsFromRefs(refs);
        // }
        // else {
        //     overridePromiseLimitation = 2
        //     for (let i = 1; i <= this.pagination.numPages; i++) {
        //         const paginationObject = this.createScrapingObject(`${dataFromParent.address}&${this.pagination.queryString}=${i}`, 'paginationPage');
        //         scrapingObjects.push(paginationObject);

        //     }
        // }        

        const refs = this.createLinkList(responseObjectFromParent)
        responseObjectFromParent = {};
        scrapingObjects = this.createScrapingObjectsFromRefs(refs, this.pagination && 'paginationPage');//If the selector is paginated, will pass a flag.

        await this.executeScrapingObjects(scrapingObjects);

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

    async paginate(scrapingObject) {//Creates pagination pages for a page selector.
        const scrapingObjects = [];
        for (let i = 1; i <= this.pagination.numPages; i++) {
            const paginationObject = this.createScrapingObject(`${scrapingObject.address}&${this.pagination.queryString}=${i}`);
            scrapingObjects.push(paginationObject);

        }

        scrapingObject.data = [...scrapingObjects];
        await this.executeScrapingObjects(scrapingObjects, 2);
    }


    // async processOnePaginationObject(paginationObject, responseObjectFromParent) {
    //     const refs = this.createLinkList(responseObjectFromParent)
    //     responseObjectFromParent = {};
    //     var innerScrapingObjects = this.createScrapingObjectsFromRefs(refs);

    //     await this.executeScrapingObjects(innerScrapingObjects);

    //     paginationObject.data = innerScrapingObjects;
    // }

    async processOneScrapingObject(scrapingObject) {//Will process one scraping object, including a pagination object.

        const href = scrapingObject.address;

        // const skip=()=>{
        //     return
        // }

        try {

            // if (this.context.fakeErrors && scrapingObject.type === 'paginationPage') { throw 'faiiiiiiiiiil' };
            if (this.context.fakeErrors && scrapingObject.type === 'paginationPage' && href.includes('page=2')) { throw 'faiiiiiiiiiil' };
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
            console.error(errorString);
            scrapingObject.successful = false
            if (!this.context.failedScrapingObjects.includes(scrapingObject)) {
                console.log('scrapingobject not included,pushing it!')
                this.context.failedScrapingObjects.push(scrapingObject);
            }
            return;

        }

        const dataToPass = {//Temporary object, that will hold data that needs to be passed to child selectors.
            address: href,
        }


        // if (scrapingObject.type === 'paginationPage') {//If the scraping object is actually a pagination one, a different function is called. 
        //     return await this.processOnePaginationObject(scrapingObject, response);
        // }

        if (scrapingObject.type === 'paginationPage') {//If the scraping object is actually a pagination one, a different function is called. 
            return this.paginate(scrapingObject);
        }

        // if (this.before) {

        //     await this.before(response,this.kill)
        // }

        try {
            var dataFromChildren = await this.scrapeChildren(this.selectors, dataToPass, response)

            if (this.after) {
                if (typeof this.after !== 'function')
                    throw "'After' callback must be a function";
                const cleanData = [];
                dataFromChildren.forEach((dataFromChild) => {
                    // console.log(dataFromChild)
                    cleanData.push(this.createPresentableData(dataFromChild));
                })
                // console.log('clean data from children', cleanData)
                await this.after(cleanData);
            }
            scrapingObject.data.push(dataFromChildren);
        } catch (error) {
            console.error(error);
        }

    }

}


class ContentSelector extends Selector {
    // constructor(context, querySelector, configObj) {
    //     super(context, querySelector, configObj);
        
    //     // this.data = {
    //     //     type: 'Content Selector',
    //     //     name: this.name,
    //     //     data: []
    //     // }
    //     this.data=[]

    // }

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


    async scrape(dataFromParent, responseObjectFromParent) {
        this.contentType = this.contentType || 'text';
        !responseObjectFromParent && console.log('empty reponse from content selector', responseObjectFromParent)
        const currentWrapper = {
            type: 'Content Selector',
            name: this.name,
            address: dataFromParent.address,
            data: []
        }

        const $ = cheerio.load(responseObjectFromParent.data);

        // delete dataFromParent.html;

        const nodeList = $(this.querySelector);
        // for(let element of nodeList){

        // }

        if (this.before) {//If a "before" callback was provided, it will be called
            if (typeof this.before !== 'function')
                throw "'Before' callback must be a function";
            await this.before(nodeList)
        }
        nodeList.each(async (index, element) => {

            const content = this.getNodeContent($(element));
            // console.log('content', content)

            currentWrapper.data.push({ name: this.name, content: content });
            // if(this.after){
            //     await this.after(currentWrapper.data[currentWrapper.data.length-1]);
            // }

        })
        if (this.after) {
            await this.after(this.createPresentableData(currentWrapper));
        }

        // this.overallCollectedData.push(this.currentlyScrapedData);
        this.data= [...this.data,currentWrapper];

        return currentWrapper;

    }


}

class ImageSelector extends Selector {

    // constructor(context, querySelector, configObj) {
    //     super(context, querySelector, configObj);
    //     // this.data = {
    //     //     type: 'Image Selector',
    //     //     name: this.name,
    //     //     data: []
    //     // }
    //     this.data=[]

    // }


    async fetchImage(url) {
        // console.log('fetching image:', url);
        const options = {
            url,
            dest: './images/',
            clone: this.context.cloneImages,
            flag: this.context.globalConfig.imageFlag,
            // mockImages: this.context.mockImages,
            responseType: 'arraybuffer'
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


        const imageHref = scrapingObject.address;
        if (!imageHref) {
            throw 'Image href is invalid, skipping.';
        }
        try {

            await this.fetchImage(imageHref);
            scrapingObject.successful = true;
            // if(this.context.failedScrapingObjects.includes(scrapingObject)){
            //     console.log('includes',scrapingObject)
            //     this.context.failedScrapingObjects.splice(this.context.failedScrapingObjects.indexOf(scrapingObject),1)
            // }


            // scrapingObject.data.push(imageHref);

        } catch (error) {
            const errorString = `there was an error fetching image:, ${imageHref}, ${error}`
            console.error(errorString);

            // this.errors.push(errorString);
            // overallErrors++
            if (!this.context.failedScrapingObjects.includes(scrapingObject)) {
                console.log('scrapingobject not included,pushing it!')
                this.context.failedScrapingObjects.push(scrapingObject);
            }
            return;


        }

    }

    async scrape(dataFromParent, responseObjectFromParent) {

        const currentWrapper = {

            type: 'Image Selector',
            name: this.name,
            address:dataFromParent.address,
            data: [],
            
        }

        const $ = cheerio.load(responseObjectFromParent.data);
        const nodeList = $(this.querySelector);
        const imageHrefs = [];
        nodeList.each((index, element) => {
            const src = $(element).attr('src');
            if (!this.customSrc && src.startsWith("data:image")) {
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

        currentWrapper.data.push(scrapingObjects);

        this.data.push(currentWrapper);

        if (this.after) {
            await this.after(this.createPresentableData(currentWrapper));
        }

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



module.exports = Scraper;




