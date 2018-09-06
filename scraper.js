const axios = require('axios');
var cheerio = require('cheerio');
var cheerioAdv = require('cheerio-advanced-selectors')
cheerio = cheerioAdv.wrap(cheerio)
var Input = require('prompt-input');
var sizeof = require('object-sizeof');

// var queue = require('queue');



const Promise = require('bluebird');
const URL = require('url').URL;
// const ConfigClass = require('./configClass');

// const util = require('util')
const download = require('./image_downloader');
const { Qyu } = require('qyu');
// await qyu.whenFree();
// const path = require('path')
// const _ = require('lodash');f
const fs = require('fs');
let downloadedImages = 0;

const repeatErrors = true;
var notFoundErrors = 0;
let overallErrors = 0;

let currentlyRunning = 0;

class Scraper {
    constructor(globalConfig) {
        this.failedScrapingObjects = [];
        this.fakeErrors = false;
        this.cloneImages = false;
        this.numRequests = 0;
        this.scrapingObjects = []//for debugging
        this.globalConfig = globalConfig
        this.qyu = new Qyu({ concurrency: this.globalConfig.concurrency || 3 })
        // console.log()

    }
    
    getClassMap() {
        return {
            page: PageSelector,
            root: RootSelector,
            content: ContentSelector,
            image: ImageSelector
        }
    }

    createSelector(type, config) {
        const currentClass = this.getClassMap()[type];
        if (currentClass === 'RootSelector')
            return new currentClass(this);

        return new currentClass(this, config);
    }


    filePromise(obj) {

        return new Promise((resolve, reject) => {
            console.log('saving file')
            fs.writeFile(`./${obj.fileName}.json`, JSON.stringify(obj.object), resolve);
        })

    }


    async createLog(object) {

        try {
            await this.filePromise(object);

        } catch (error) {
            throw error;
        }


    }

    async repeatErrors() {
        var input = new Input({
            name: 'first',
            message: 'continue?'
        });

        this.fakeErrors = false;
        let counter = 0
        const failedImages = this.failedScrapingObjects.filter((object) => { return !object.data })
        console.log('number of failed IMAGE objects:', failedImages.length)
        console.log('number of faield objects:', this.failedScrapingObjects.length)
        await input.run()
        await Promise.all(
            this.failedScrapingObjects.map(async (failedObject) => {
                counter++
                console.log('failed object counter:', counter)
                console.log('failed object', failedObject)
                const selectorContext = failedObject.referenceToSelectorObject();
                try {
                    await selectorContext.processOneScrapingObject(failedObject);

                } catch (error) {
                    console.error('There was an error repeating a failed object: ', error)
                    // throw error;
                }
            })
        )


        console.log('done repeating objects!')

    }


}
// const qyu = new Qyu({ concurrency: 100 });



class Selector {//Base abstract class for selectors. "leaf" selectors will inherit directly from it.

    constructor(context, objectConfig) {
        // this.context.globalConfig = ConfigClass.getInstance();
        if (objectConfig) {
            for (let i in objectConfig) {
                this[i] = objectConfig[i];
            }
        }

        this.data = {};
        this.context = context;
        this.selectors = [];//References to child selector objects.
        this.errors = [];//Holds the overall communication errors, encountered by the selector.
    }

    async createPromise(scrapingObject) {
        await this.processOneScrapingObject(scrapingObject);
    }

    saveData(data) {//Saves the scraped data in an array, that later will be collected by getCurrentData().
        this.currentlyScrapedData.push(data);

    }

    promiseFactory(promiseFunction) {//This function pushes promise-returning functions into the qyu. 

        return this.context.qyu(promiseFunction);
    }

    referenceToSelectorObject() {
        // console.log('this from reference from root', this);
        return this
    }

    createScrapingObject(href, type) {
        // console.log(this.referenceToSelectorObject)
        const scrapingObject = {
            address: href,//The image href            
            referenceToSelectorObject: this.referenceToSelectorObject.bind(this),
            // referenceToSelectorObject: () => { return this },
            successful: false,
            data: []
        }
        if (type)
            scrapingObject.type = type;

        // console.log('scraping object', scrapingObject);
        this.context.scrapingObjects.push(scrapingObject)
        // console.log(this.context.scrapingObjects)
        // console.log('size of all scraping objects ', sizeof( this.context.scrapingObjects))

        return scrapingObject;
    }

    getData() {
        return this.data;
    }

    getCurrentData() {
        return this.data;
    }

    getAllData() {
        return this.overallCollectedData;
    }

    async repeatPromiseUntilResolved(promiseFactory, href, retries = 0) {

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
            if (newRetries == maxRetries) {
                throw 'maximum retries exceeded';
            }
            await this.repeatPromiseUntilResolved(promiseFactory, href, newRetries);
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


    async getPage(href, bypassError) {//Fetches the html of a given page.

        const asyncFunction = async () => {
            currentlyRunning++;
            console.log('opening page', href);
            // console.log('currentlyRunning:', currentlyRunning);
            let resp;
            try {
                var begin = Date.now()
                resp = await axios.get(href)

            }
            finally {
                const end = Date.now();
                console.log('seconds: ', (end - begin) / 1000);
                currentlyRunning--;
                // console.log('currentlyRunning:', currentlyRunning);
            }
            return resp;
        }

        return await this.repeatPromiseUntilResolved(() => { return this.promiseFactory(asyncFunction) }, href, bypassError);
    }


}


class RootSelector extends CompositeSelector {

    constructor(context) {

        super(context);

        // this.context.globalConfig.setConfigurationData(configObj);

        this.selectors = [];
        this.html = "";
    }



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


        this.data = {
            siteRoot: this.context.globalConfig.baseSiteUrl,
            startUrl: this.context.globalConfig.startUrl,
            data: [],//Will hold the data collected from the child selectors.
        }

        // console.log('root selector chidlren,', this.getTypesOfChildSelectors()[0].prototype)


        try {
            var response = await this.getPage(this.context.globalConfig.startUrl, true);
            console.log('response from root', response)

        } catch (error) {
            console.error('Error fetching root page: ', error)
            throw error;
        }
        var dataToPass = {
            // html: data,
            address: this.context.globalConfig.startUrl
        }



        // console.log('size of datatopass',sizeof(dataToPass))
        // this.html = data;
        for (let i = 0; i < this.selectors.length; i++) {

            const dataFromChild = await this.selectors[i].scrape(dataToPass, response);
            this.data.data.push(dataFromChild);
        }



    }

}



class PageSelector extends CompositeSelector {

    constructor(context, configObj) {
        super(context, configObj);
        this.data = {
            type: 'Page Selector',
            name: this.name,
            data: []
        }
    }




    async scrape(dataFromParent, responseObjectFromParent) {

        const currentWrapper = {
            type: 'Page Selector',
            name: this.name,
            address: dataFromParent.address,
            data: []
        }

        var scrapingObjects = [];
        // const promiseFactories = [];
        if (!this.pagination) {
            const refs = this.createLinkList(responseObjectFromParent)

            refs.forEach((href) => {
                if (href) {
                    const absoluteUrl = this.getAbsoluteUrl(this.context.globalConfig.baseSiteUrl, href)
                    var scrapingObject = this.createScrapingObject(absoluteUrl);
                    scrapingObjects.push(scrapingObject);
                    // promiseFactories.push(async () => { return this.processOneScrapingObject(scrapingObject) })
                }

            })

        }
        else {

            for (let i = 1; i <= this.pagination.numPages; i++) {
                const paginationObject = this.createScrapingObject(`${dataFromParent.address}&${this.pagination.queryString}=${i}`, 'paginationPage');
                scrapingObjects.push(paginationObject);
                // promiseFactories.push(
                //     async () => { await this.processOneScrapingObject(paginationObject); }
                // );
            }
        }

        await Promise.map(scrapingObjects, (scrapingObject) => {
            return this.createPromise(scrapingObject);
        }, { concurrency: this.context.globalConfig.concurrency || 3 })


        // await this.context.limitPromises(promiseFactories);
        currentWrapper.data = [...currentWrapper.data, ...scrapingObjects];
        return currentWrapper;
    }

    createLinkList(responseObjectFromParent) {
        const $ = cheerio.load(responseObjectFromParent.data);
        const scrapedLinks = $(this.querySelector);
        const refs = [];
        // console.log('scrapedlinks length', scrapedLinks.length)
        scrapedLinks.each((index, link) => {
            refs.push(link.attribs.href)

        })
        // console.log('sizeof passeddata before',sizeof(passedData))
        // delete passedData.html;
        // console.log('sizeof passeddata AFTER',sizeof(passedData))
        // console.log('refs length of', passedData.address, refs.length)

        return refs;
    }

    async processOnePaginationObject(paginationObject, responseObjectFromParent) {
        // delete paginationObject.type;
        const refs = this.createLinkList(responseObjectFromParent)
        var innerScrapingObjects = [];
        // const promiseFactories = []
        refs.forEach((href) => {
            if (href) {
                const absoluteUrl = this.getAbsoluteUrl(this.context.globalConfig.baseSiteUrl, href)
                const innerScrapingObject = this.createScrapingObject(absoluteUrl);
                innerScrapingObjects.push(innerScrapingObject);
                // promiseFactories.push(
                //     async () => {
                //         try {
                //             await this.processOneScrapingObject(innerScrapingObject);


                //         } catch (error) {

                //             // this.errors.push(error)
                //             console.error(error);
                //             overallErrors++
                //         }
                //     }
                // );
            }

        })
        await Promise.map(innerScrapingObjects, (scrapingObject) => {
            return this.createPromise(scrapingObject);
        }, { concurrency: this.context.globalConfig.concurrency || 3 })
        // await this.context.limitPromises(promiseFactories);


        paginationObject.data = innerScrapingObjects;
        // return paginationObject;
    }

    async processOneScrapingObject(scrapingObject) {//Will process one scraping object, including a pagination object.


        const href = scrapingObject.address;

        try {

            // if (this.context.fakeErrors && scrapingObject.type === 'paginationPage') { throw 'faiiiiiiiiiil' };
            if (this.context.fakeErrors && scrapingObject.type === 'paginationPage' && href.includes('page=2')) { throw 'faiiiiiiiiiil' };
            // console.log('href from before get page', href)
            var response = await this.getPage(href);
            // ds
            console.log('sizeof response', sizeof(response.data))
            scrapingObject.successful = true


        } catch (error) {
            const errorString = `There was an error opening page ${this.context.globalConfig.baseSiteUrl}${href},${error}`;
            console.error(errorString);
            scrapingObject.successful = false
            this.context.failedScrapingObjects.push(scrapingObject);
            // throw errorString;

        } finally {
            console.log('process one scraping object done')
        }
        const dataToPass = {//Temporary object, that will hold data that needs to be passed to child selectors.
            // html: data,
            address: href,
        }

        // console.log('size of datatopass',sizeof(dataToPass))

        if (scrapingObject.type === 'paginationPage') {//If the scraping object is actually a pagination one, a different function is called. 
            return await this.processOnePaginationObject(scrapingObject, response);
        }

        try {
            var dataFromChildren = await this.scrapeChildren(dataToPass, response)

            scrapingObject.data.push(dataFromChildren);
        } catch (error) {
            console.error(error);
            this.context.failedScrapingObjects.push(scrapingObject);
        }

    }

    async scrapeChildren(passedData, responseObjectFromParent) {//Scrapes the child selectors of this PageSelector object.
        const scrapedData = []
        for (let selector of this.selectors) {
            const dataFromChild = await selector.scrape(passedData, responseObjectFromParent);
            scrapedData.push(dataFromChild);//Pushes the data from the child

        }

        // console.log('sizeof passeddata before',sizeof(passedData))
        // delete passedData.html;
        // console.log('sizeof passeddata AFTER',sizeof(passedData))

        return scrapedData;
    }





}


class ContentSelector extends Selector {
    constructor(context, configObj) {
        super(context, configObj);
        // console.log(configObj)
        this.contentType = configObj.contentType;
        this.data = {
            type: 'Content Selector',
            name: this.name,
            data: []
        }

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

    getCurrentData() {//Returns the scraped data of the selector.
        return this.data[this.data.length - 1];
    }



    async scrape(dataFromParent, responseObjectFromParent) {
        console.log()
        const currentWrapper = {
            type: 'Content Selector',
            name: this.name,
            data: []
        }

        const $ = cheerio.load(responseObjectFromParent.data);

        // delete dataFromParent.html;

        const nodeList = $(this.querySelector);

        nodeList.each((index, element) => {

            const content = this.getNodeContent($(element));
            // console.log('content', content)

            currentWrapper.data.push({ name: this.name, text: content });

        })

        // this.overallCollectedData.push(this.currentlyScrapedData);
        this.data.data.push(currentWrapper);
        return currentWrapper;

    }


}

class ImageSelector extends Selector {

    constructor(context, configObj) {
        super(context, configObj);
        this.data = {
            type: 'Image Selector',
            name: this.name,
            data: []
        }

    }


    async fetchImage(url) {
        // console.log('fetching image:', url);
        const options = {
            url,
            dest: './images/',
            clone: this.context.cloneImages
        }

        const asyncFunction = async () => {
            // return qyu(()=>download.image(options));
            return this.context.qyu(async () => {
                currentlyRunning++;
                console.log('fetching image:', url)
                // console.log('currentlyRunning:', currentlyRunning);
                let resp;
                try {
                    resp = await download.image(options);
                }

                finally {
                    currentlyRunning--;
                    // console.log('currentlyRunning:', currentlyRunning);
                }
                return resp;
            });



        }
        return await this.repeatPromiseUntilResolved(() => { return this.repeatPromiseUntilResolved(asyncFunction) }, url).then(() => { downloadedImages++ });

    }


    getCurrentData() {//Returns the scraped data of the selector.
        return this.data[this.data.length - 1];
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
            overallErrors++
            this.context.failedScrapingObjects.push(scrapingObject);
            throw error

        }

    }

    async scrape(dataFromParent, responseObjectFromParent) {

        const currentWrapper = {

            type: 'Image Selector',
            name: this.name,
            data: [],
        }

        const $ = cheerio.load(responseObjectFromParent.data);
        const nodeList = $(this.querySelector);
        const imageHrefs = [];
        nodeList.each((index, element) => {
            const src = $(element).attr('src');
            // if (!this.customSrc && src.startsWith("data:image")) {
            //     console.error('Invalid image href:', $(element).attr('src'))
            //     return;
            // }
            imageHrefs.push(this.customSrc ? $(element).attr(this.customSrc) : src);

        })

        if (imageHrefs.length == 0) {
            // this.errors.push(`No images found by the query, in ${dataFromParent.address}`);
            overallErrors++
            return;
        }

        const scrapingObjects = [];
        const promiseFactories = [];

        imageHrefs.forEach((imageHref) => {
            var absoluteUrl = this.getAbsoluteUrl(this.context.globalConfig.baseSiteUrl, imageHref);
            const scrapingObject = this.createScrapingObject(absoluteUrl);
            scrapingObjects.push(scrapingObject);
            // promiseFactories.push(async () => {
            //     try {

            //         await this.processOneScrapingObject(scrapingObject);

            //     }
            //      catch (error) {
            //         console.log('caught an error within the scrapingobjects of image')
            //         throw error;
            //         // continue;
            //     }finally{
            //         console.log('finally of one image promise factory')
            //     }
            // })
        })

        await Promise.map(scrapingObjects, (scrapingObject) => {
            return this.createPromise(scrapingObject);
        }, { concurrency: this.context.globalConfig.concurrency || 3 })


        // try {
        //    await this.context.limitPromises(promiseFactories);  
        // } catch (error) {
        //     console.log('error from the function that calls limit promises in image selector',error)
        // }

        currentWrapper.data.push(scrapingObjects);

        this.data.data.push(currentWrapper);

        return currentWrapper;





        //******************sequential strategy */









        //*************qyu strategy ******/
        // const promises = [];
        // for (let href of imageHrefs) {
        //     promises.push(qyu.add(() => this.fetchImage(href)));
        //     // await qyu.add(()=>this.fetchImage(href));
        // }
        // await Promise.all(promises);
        //********************************** */
        // try {
        // await Promise.map(imageHrefs, (href) => {
        //     // console.log('href',href)
        //     return this.fetchImage(href);
        // }, { concurrency: 3 })

        // let promises = [];
        // console.log('GONNA DOWNLOAD IMAGES:', imageHrefs);
        // imageHrefs.forEach(href => {
        //     let promise = qyu.add(async () => {
        //         try {
        //             console.log('STARTED DOWNLOADING IMAGE:', href);
        //             await this.fetchImage(href);
        //             console.log('FINISHED DOWNLOADING IMAGE:', href);
        //         }
        //         catch (err) {
        //             console.log('FAILED DOWNLOADING IMAGE:', href);
        //         }
        //     });
        //     promises.push(promise);
        // });
        // console.log('HERE !@# !@# !@# !@#', qyu.activeCount);
        // await Promise.all(promises);    
        // } catch (error) {
        //     console.log('image error');
        //     throw error
        // }

        // this.saveData(imageHrefs);
        // console.log('all images downloaded')



        // console.log('response array',responseArray)

        // responseArray.forEach(({ data }) => {
        //     for (let i = 0; i < this.selectors.length; i++) {
        //         // this.selectors[i].setHtml(data);
        //         // this.selectors[i].scrape();
        //         // this.saveImage(data);

        //     }

        // })

        // console.log(imageHrefs);

    }
}

// const root = new Root();
// createObjectsFromTree(configObj,newObject);
// console.log(util.inspect(configObj, {showHidden: false, depth: null}))


//   fs.writeFile('./generatedTree.json', JSON.stringify(root), (err) => {
//         if (err) {
//             console.log(err)
//         } else {
//             console.log('The file has been saved!');
//         }

//     });


(async () => {







    //*******************cnn site */

    // const config = {
    //     baseSiteUrl: `https://edition.cnn.com/`,
    //     startUrl: `https://edition.cnn.com/sport`,
    //     concurrency: 1
    // }
    // const scraper = new Scraper(config);

    // const root = scraper.createSelector('root');
    // // const category = new PageSelector({ querySelector: '.nav-menu-links__link', name: 'category' });
    // const article = scraper.createSelector('page', { querySelector: 'article a', name: 'article' });
    // const paragraph = scraper.createSelector('content', { querySelector: 'h1', name: 'paragraphs' });
    // const image = scraper.createSelector('image', { querySelector: 'img.media__image.media__image--responsive', name: 'image', customSrc: 'data-src-medium' });
    // const articleImage = scraper.createSelector('image', { querySelector: 'img', name: 'article image' });
    // // category.addSelector(paragraph);
    // // category.addSelector(article);
    // article.addSelector(articleImage);
    // article.addSelector(paragraph);
    // // const article = new PageSelector({ querySelector: '.top-story-text a', name: 'article' });
    // // category.addSelector(article)
    // // category.addSelector(image)
    // // root.addSelector(category);
    // root.addSelector(article);
    // root.addSelector(paragraph);
    // root.addSelector(image);
    // root.addSelector(image);
    // root.addSelector(paragraph);


    // article.addSelector(image);

    //***********************////////////////// */

    //********************w3schools site */
    // const config = {
    //     baseSiteUrl: `https://www.w3schools.com/`,
    //     startUrl: `https://www.w3schools.com/`
    // }
    // const root = new RootSelector(config);

    // // const productPage = new PageSelector({ querySelector: '.product_name_link', name: 'product' });
    // // const categoryPage = new PageSelector({ querySelector: '#content_65 ol a', name: 'category' });

    // // categoryPage.addSelector(productPage);
    // const paragraphs = new ContentSelector({ querySelector: 'p', name: 'paragraphs' });
    // root.addSelector(paragraphs);
    // // const productName = new ContentSelector({ querySelector: '.product_name', name: 'name' });
    // // const authorData = new ContentSelector({ querySelector: '.product_author', name: 'author' });
    // const productImage = new ImageSelector({ querySelector: 'img', name: 'image' });
    // root.addSelector(productImage);
    // try {
    //     await root.scrape();
    //     var entireTree = root.getCurrentData();
    //     console.log('no errors, all done, number of images:', downloadedImages)
    // } catch (error) {
    //     console.log('error from outer scope', error)
    //     console.log('there was an error somewhere in the promises, killing the script');
    //     process.exit();

    // }
    //************************************ */

    //*******************slovak site ******************************/

    // const config = {
    //     baseSiteUrl: `https://www.profesia.sk`,
    //     startUrl: `https://www.profesia.sk/praca/`
    // }
    // const scraper = new Scraper();
    // const root = scraper.createSelector('root', config);
    // const productLink = scraper.createSelector('page', { querySelector: '.list-row a.title', name: 'link', pagination: { queryString: 'page_num', numPages: 10 } });
    // root.addSelector(productLink);
    // const paragraph = scraper.createSelector('content', { querySelector: 'p', name: 'P' });


    // const productImage = scraper.createSelector('image', { querySelector: 'img:first', name: 'image' });

    // productLink.addSelector(paragraph);
    // productLink.addSelector(productImage);

    //**************************books site category ***********************/

    const config = {
        baseSiteUrl: `https://ibrod83.com`,
        startUrl: `https://ibrod83.com/books`,
        concurrency: 1
    }
    const scraper = new Scraper(config);

    const root = scraper.createSelector('root');
    //pagination: { queryString: 'page', numPages: 3 }
    // const productPage = scraper.createSelector('page', '.product_name_link');

    // let productPage;

    // root
    //     .addSelector(
    //         scraper.createSelector('page', { querySelector: '#content_65 ol a:first', name: 'category' })
    //             .addSelector(
    //                 productPage = scraper.createSelector('page', { querySelector: '.product_name_link', name: 'product' })
    //             )
    //     )
    //     .addSelector(
    //         scraper.createSelector('content', { querySelector: '.product_publisher', name: 'publisher' })
    //     )
    //     .addSelector(
    //         scraper.createSelector('content', { querySelector: '.product_author', name: 'author' })
    //     )
    //     .addSelector(
    //         scraper.createSelector('image', { querySelector: '.book img', name: 'image' })
    //     )
    //     .addSelector(
    //         scraper.createSelector('content', { querySelector: '.product_name', name: 'name' })
    //     );


    // ,pagination: { queryString: 'page', numPages: 2 }
    const productPage = scraper.createSelector('page', { querySelector: '.product_name_link', name: 'product', pagination: { queryString: 'page', numPages: 100 } });
    const categoryPage = scraper.createSelector('page', { querySelector: '#content_65 ol a:eq(0)', name: 'category' });
    // const categoryPage = scraper.createSelector('page', { querySelector: '.category_selector a', name: 'category' });
    root.addSelector(categoryPage);
    categoryPage.addSelector(productPage);
    const publisherData = scraper.createSelector('content', { querySelector: '.product_publisher', name: 'publisher' });
    const productName = scraper.createSelector('content', { querySelector: '.product_name', name: 'name' });
    const authorData = scraper.createSelector('content', { querySelector: '.product_author', name: 'author' });
    const productImage = scraper.createSelector('image', { querySelector: '.book img', name: 'image' });
    // root.addSelector(productImage)
    // root.addSelector(productPage)
    productPage.addSelector(publisherData);
    productPage.addSelector(authorData);
    productPage.addSelector(productImage);
    productPage.addSelector(productName);
    // root.addSelector(productImage)




    //stackoverflow site****************************/
    // const config = {
    //     baseSiteUrl: `https://stackoverflow.com/`,
    //     startUrl: `https://stackoverflow.com/`
    // }
    //     const root = new RootSelector(config);
    //     const postPage = new PageSelector({ querySelector: '.question-hyperlink', name: 'page' });
    //     root.addSelector(postPage)
    //     const avatarImage = new ImageSelector({ querySelector: '.gravatar-wrapper-32 img', name: 'avatar' });
    //     const data = new ContentSelector({ querySelector: '.post-text', name: 'posttext' });
    //     postPage.addSelector(avatarImage)
    //     // data.processText= function(text){
    //     //     return text+text
    //     // }
    //     postPage.addSelector(data);


    //     try {
    //       await root.scrape();
    //       var entireTree = root.getCurrentData();
    //       console.log('no errors, all done, number of images:', downloadedImages)
    //   } catch (error) {
    //       console.log('error from outer scope', error)
    //       console.log('there was an error somewhere in the promises, killing the script');
    //       process.exit();

    //   }



    //********concurrency site******************* */
    // const config = {
    //     baseSiteUrl: `https://ibrod83.com/concurrency/`,
    //     startUrl: `https://ibrod83.com/concurrency`
    // }

    // const root = new RootSelector(config);
    // const productPage = new PageSelector({ querySelector: 'a', name: 'innerpage' });
    // root.addSelector(productPage);
    // const productImage = new ImageSelector({ querySelector: 'img', name: 'image' });
    // productPage.addSelector(productImage);
    // try {
    //    await root.scrape(); 
    // } catch (error) {
    //     console.log(error);
    //     return;
    // }

    // const entireTree = root.getCurrentData();
    // console.log(entireTree);

    //************************************** */

    //***********************ynet************* */
    // const config = {
    //     baseSiteUrl: `https://www.ynet.co.il/`,
    //     startUrl: `https://www.ynet.co.il/`
    // }
    // const root = new RootSelector(config);
    // const category = new PageSelector({ querySelector: '.hdr_isr.hdr_abr a', name: 'category' });
    // const image = new ImageSelector({ querySelector: 'img', name: 'image' });
    // // const article = new PageSelector({ querySelector: '.top-story-text a', name: 'article' });
    // // category.addSelector(article)
    // category.addSelector(image)
    // root.addSelector(category);


    // // article.addSelector(image);


    //******************book site normal************************/
    // const config = {
    //     baseSiteUrl: `https://ibrod83.com/`,
    //     startUrl: `https://ibrod83.com/books/product/america/search?filter=&items_per_page=12`
    // }
    // const root = new RootSelector(config);
    // // ,pagination:{queryString:'page',numPages:10}
    // const productPage = new PageSelector({ querySelector: '.col-md-2 .product_name_link', name: 'product', pagination: { queryString: 'page', numPages: 10 } });
    // root.addSelector(productPage);
    // const publisherData = new ContentSelector({ querySelector: '.product_publisher', name: 'publisher' });
    // const productName = new ContentSelector({ querySelector: '.product_name', name: 'name' });
    // const authorData = new ContentSelector({ querySelector: '.product_author', name: 'author' });
    // const productImage = new ImageSelector({ querySelector: '.book img', name: 'image' });
    // // root.addSelector(productImage)
    // productPage.addSelector(publisherData);
    // productPage.addSelector(authorData);
    // productPage.addSelector(productImage);
    // productPage.addSelector(productName);
    // try {
    //     await root.scrape();
    //     var entireTree = root.getCurrentData();
    //     console.log(entireTree);
    //     // var productTree = productPage.getAllData();
    //     var productTree = productPage.getCurrentData();
    //     var allErrors = root.getErrors();
    //     // var allImages = productImage.getAllData();
    //     if (allErrors.length == 0) {
    //         console.log('no errors, all done, number of images:', downloadedImages)
    //     } else {
    //         console.log(`all done, with ${allErrors.length} errors. number of images:`, downloadedImages)
    //         console.log('overall errors from global variable:', overallErrors)
    //     }

    // } catch (error) {
    //     console.log('Error from root selector', error)
    //     process.exit();

    // }
    //******************************************************* */

    // const beginTime = Date.now();
    // try {
    //     await root.scrape();
    //     console.log('number of images:', downloadedImages);
    // } catch (error) {
    //     console.log('error from outer scope', error)
    //     console.log('there was an error somewhere in the promises, killing the script');
    //     process.exit();

    // }
    // const endTime = Date.now();
    // console.log('operation took:', (endTime - beginTime) / 1000);

    // // await root.scrape()
    // const entireTree = root.getCurrentData();
    // const productTree = productPage.getCurrentData();
    // // const stockTree = stock.getCurrentData();
    // console.log(util.inspect(entireTree, false, null));
    // console.log(productTree);
    // const errors = root.getErrors();
    // const imageErrors = productImage.getErrors();
    // const categoryErrors = categoryPage.getErrors();
    // const productErrors = productPage.getErrors();
    // console.log('all errors:', errors)
    // console.log('image errors:', imageErrors)
    // return;




    console.log('root', root);
    try {
        await root.scrape();
        var entireTree = root.getData();
        console.log('number of failed objects:', scraper.failedScrapingObjects.length)
        await scraper.createLog({ fileName: 'log', object: entireTree })
        await scraper.createLog({ fileName: 'failedObjects', object: scraper.failedScrapingObjects })

        if (scraper.failedScrapingObjects.length > 0) {

            // console.log('number of failed objects:', scraper.failedScrapingObjects.length, 'repeating')

            await scraper.repeatErrors();
            var entireTree = root.getData();
            await scraper.createLog({ fileName: 'log', object: entireTree })
            await scraper.createLog({ fileName: 'failedObjects', object: scraper.failedScrapingObjects })

        }
        console.log('no errors, all done, number of images:', downloadedImages)
    } catch (error) {
        // console.log('error from outer scope', error)
        console.error('there was an error in the root selector', error);
        // process.exit();

    }
    // fs.writeFile('./failedObjects.json', JSON.stringify(root.context.failedScrapingObjects), (err) => {
    //     if (err) {
    //         console.log(err)
    //     } else {
    //         console.log('The file has been saved!');
    //     }

    // });
    // if (typeof entireTree !== 'undefined') {
    //     fs.writeFile('./log.json', JSON.stringify(entireTree), (err) => {
    //         if (err) {
    //             console.log(err)
    //         } else {
    //             console.log('The file has been saved!');
    //         }

    //     });
    // }

    // if (scraper.failedScrapingObjects.length > 0) {
    //     // console.log('number of failed objects:', scraper.failedScrapingObjects.length, 'repeating')

    //     await scraper.repeatErrors();
    // }

    console.log('notfounderrors', notFoundErrors)

    // if (allErrors) {
    //     fs.writeFile('./errors.json', JSON.stringify(allErrors), (err) => {
    //         if (err) {
    //             console.log(err)
    //         } else {
    //             console.log('The file has been saved!');
    //         }

    //     });
    // }

    // fs.writeFile('./image_errors.json', JSON.stringify(imageErrors), (err) => {
    //     if (err) {
    //         console.log(err)
    //     } else {
    //         console.log('The file has been saved!');
    //     }

    // });
    // fs.writeFile('./product_errors.json', JSON.stringify(productErrors), (err) => {
    //     if (err) {
    //         console.log(err)
    //     } else {
    //         console.log('The file has been saved!');
    //     }

    // });
    // fs.writeFile('./category_errors.json', JSON.stringify(categoryErrors), (err) => {
    //     if (err) {
    //         console.log(err)
    //     } else {
    //         console.log('The file has been saved!');
    //     }

    // });
    // if(productTree) {

    //     fs.writeFile('./products.json', JSON.stringify(productTree), (err) => {
    //         if (err) {
    //             console.log(err)
    //         } else {
    //             console.log('The file has been saved!');
    //         }

    //     });

    // }
    // if(allImages) {
    //     fs.writeFile('./images.json', JSON.stringify(allImages), (err) => {
    //         if (err) {
    //             console.log(err)
    //         } else {
    //             console.log('The file has been saved!');
    //         }

    //     });

    // }




})()



const init = {
    type: 'root',
    config: {
        baseSiteUrl: `https://www.profesia.sk`,
        startUrl: `https://www.profesia.sk/praca/`
    },
    children: [
        {
            type: 'page',
            config: { querySelector: '.list-row a.title', name: 'link' },
            children: [
                {
                    type: 'image',
                    config: { querySelector: 'img', name: 'image' }
                }
            ]

        }

    ]
}





function createObjectsFromTree(object) {
    let Class = getClassMap()[object.type];
    const instance = new Class(object.config || {});

    if (object.children && object.children.length > 0) {
        object.children.forEach((child) => {
            console.log('child object');
            instance.addSelector(createObjectsFromTree(child));
        })
    }

    return instance

}




