const axios = require('axios');
const cheerio = require('cheerio');
const Promise = require('bluebird');
const URL = require('url').URL;
const ConfigClass = require('./configClass');
var stringify = require('json-stringify-safe');

// const util = require('util')
// var rp = require('request-promise');
const download = require('./image_downloader');
// var sanitize = require("sanitize-filename");
// const { Qyu } = require('qyu');
// const path = require('path')
// const _ = require('lodash');
const fs = require('fs');
let downloadedImages = 0;
const fakeErrors = false;
var notFoundErrors = 0;
let overallErrors = 0;
// const qyu = new Qyu({ concurrency: 100 });


class Selector {//Base abstract class for selectors. "leaf" selectors will inherit directly from it.

    constructor(objectConfig) {
        this.globalConfig = ConfigClass.getInstance();

        for (let i in objectConfig) {
            this[i] = objectConfig[i];
        }
        this.data = [];
        this.selectors = [];//References to child selector objects.
        // this.currentlyScrapedData = [];//Will hold the scraped data of a selector, in its current "context"(as a child of a specific selector);
        // this.overallCollectedData = [];//Will hold the scraped data of a selector, in all "contexts"(If a selector was used as a child,in more than one selector).
        this.errors = [];//Holds the overall communication errors, encountered by the selector.
    }

    saveData(data) {//Saves the scraped data in an array, that later will be collected by getCurrentData().
        this.currentlyScrapedData.push(data);

    }

    getCurrentData(){
        return this.data;
    }

    getAllData() {
        return this.overallCollectedData;
    }

    async repeatPromiseUntilResolved(promise, href) {//A utility function, that tries to repeat a promise, a given number of times.
        let numRetries = 2;
        while (true) {

            try {
                const randomNumber = fakeErrors ? Math.floor(Math.random() * (3 - 1 + 1)) + 1 : 3;
                if (randomNumber == 1) {
                    throw 'randomly generated error,' + href;
                }

                return await promise;
            } catch (err) {
                if (typeof err === 'string' && err.includes('random'))
                    throw 'from the catch of repeatPromiseUntilResolved, ' + err;

                if (err.response && err.response.status == 404) {
                    notFoundErrors++;
                    throw `${href} not found, skipping it`;

                }
                if (!(numRetries--)) {

                    console.log(`no retries left`)
                    throw err;
                }
                // console.log('repeating href', href);
                await Promise.delay(1000);

            }
        }
    }

    getErrors() {//gets overall errors of the selector, in all "contexts".
        return this.errors;
    }

    setData(dataObject) {//Passes data from the parent, to the given selector.
        this.dataFromParent = dataObject;
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

    // getErrors(deepErrors = false) {//Will loop through all child selectors, get their errors, and join them into the errors of the current composite selector.
    //     let errors = [...this.errors];
    //     if (deepErrors) {
    //         this.selectors.forEach((childSelector) => {
    //             const childErrors = childSelector.getErrors(deepErrors);
    //             errors = [...errors, ...childErrors];
    //         })
    //     }
    //     // console.log('this.errors,deep or not:', this, deepErrors);
    //     return errors;
    // }


    async getPage(href) {//Fetches the html of a given page.
        console.log('fetching page', href)
        return this.repeatPromiseUntilResolved(axios.get(href), href);

    }


}


class RootSelector extends CompositeSelector {

    constructor(configObj) {

        super(configObj);

        this.globalConfig.setConfigurationData(configObj);

        this.selectors = [];
        this.html = "";
    }

    // getErrors() {
    //     return super.getErrors(true);
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

    

    async scrape() {


        this.currentlyScrapedData = {
            address: `ROOT: ${this.globalConfig.baseSiteUrl}`,
            collectedData: [],//Will hold the data collected from the child selectors.
        }

        try {
            var { data } = await this.getPage(this.globalConfig.startUrl);

        } catch (error) {
            console.log('error from root', error)
            throw error;
        }
        var dataToPass = {
            html: data,
            address: this.globalConfig.startUrl
        }
        this.html = data;
        for (let i = 0; i < this.selectors.length; i++) {
            // console.log('setting html of the child link')
            this.selectors[i].setData(dataToPass);
            await this.selectors[i].scrape();
            const dataFromChild = this.selectors[i].getCurrentData();
            this.data.push(dataFromChild);
        }

        // this.overallCollectedData = this.currentlyScrapedData;

    }

}



class PageSelector extends CompositeSelector {

    createScrapingObject(href) {
        const scrapingObject = {
            attribs: {
                address: href,
                name: this.name,
                type: 'Page Selector',
            },
            referenceToSelectorObject:()=>{return this} ,
            successful: false,
            data: []
        }
        return scrapingObject;
    }
    async scrape() {
        // this.currentlyScrapedData = {
        //     type: 'Page Selector',
        //     name: this.name,
        //     address: this.dataFromParent.address,//The href of the current link item.
        //     collectedData: [],//Will hold the data collected from the child selectors.
        //     errors: []
        // }
        // if (!this.pagination) {
            await this.scrapeOnePaginationPage(this.dataFromParent);
        // }

        


        //  else {
        //     for (let i = 1; i <= this.pagination.numPages; i++) {
        //         const absoluteUrl = this.getAbsoluteUrl(this.globalConfig.baseSiteUrl, `${this.dataFromParent.address}&${this.pagination.queryString}=${i}`);
        //         try {
        //             var {data} =  await this.getPage(absoluteUrl);
        //         } catch (error) {
        //             const errorString = `There was an error opening page ${this.globalConfig.baseSiteUrl}${href},${error}`;
        //             this.currentlyScrapedData.errors.push(errorString);
        //             this.errors.push(errorString)
        //             console.log(errorString);
        //             overallErrors++
        //             // throw error;
        //             continue;  
        //         }

        //         var dataToPass = {
        //             address: absoluteUrl,
        //             html:data

        //         };
        //         await this.scrapeOnePaginationPage(dataToPass);
        //     }
        // }
    }

    async scrapeOnePaginationPage(passedData) {
        const $ = cheerio.load(passedData.html);
        const scrapedLinks = $(this.querySelector);
        const refs = [];

        scrapedLinks.each((index, link) => {
            refs.push(link.attribs.href)

        })

        //*********sequential strategy *******************/
        const scrapingObjects = [];
        refs.forEach((href) => {
            if (href) {
                const scrapingObject = this.createScrapingObject(href);
                scrapingObjects.push(scrapingObject);
            }

        })

        for (let scrapingObject of scrapingObjects) {
            await this.processOneScrapingObject(scrapingObject);
        }

        this.data = scrapingObjects;
    }

    async processOneScrapingObject(scrapingObject) {

        const href = scrapingObject.attribs.address;

        try {
            // if (href) {

            const absoluteUrl = this.getAbsoluteUrl(this.globalConfig.baseSiteUrl, href)

            var { data } = await this.getPage(absoluteUrl);

            // }
            //  else {
            //     throw 'Invalid href';
            // }

        } catch (error) {

            const errorString = `There was an error opening page ${this.globalConfig.baseSiteUrl}${href},${error}`;
            // this.currentlyScrapedData.errors.push(errorString);
            this.errors.push(errorString)


            console.log(errorString);
            overallErrors++
            // throw error;
            // continue;
        }

        this.dataToPass = {//Temporary object, that will hold data that needs to be passed to child selectors.
            html: data,
            address: `${this.globalConfig.baseSiteUrl}${href}`,

        }

        for (let selector of this.selectors) {


            // if (!selector.type === 'Page Selector') {
            selector.setData(this.dataToPass);
            // }
            await selector.scrape();
            const dataFromChild = selector.getCurrentData();
            scrapingObject.data.push(dataFromChild);//Pushes the data from the child

        }

        // if(this.pagination){
        // this.overallCollectedData = [...this.overallCollectedData, currentLinkData]

        // }



        // this.currentlyScrapedData.collectedData.push(currentLinkData)

    }



}


class ContentSelector extends Selector {
    constructor(configObj) {
        super(configObj);
        this.contentType = configObj.contentType;

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
        return this.data[this.data.length-1];
    }



    async scrape() {
        const scrapingObject = {
            attribs: {
                type: 'Content Selector',
                name: this.name
            },
            data: [],
        }



        const $ = cheerio.load(this.dataFromParent.html);

        const nodeList = $(this.querySelector);



        nodeList.each((index, element) => {


            // const wrappedElement = $(element)
            // console.log('wrappedelelemnt before function',wrappedElement)
            // var fn = wrappedElement[this.contentType];
            const content = this.getNodeContent($(element));
            console.log('content', content)
            // console.log('fn',fn.__proto__)
            // console.log('contentype', this.contentType)
            scrapingObject.data.push({ name: this.name, text: content });

        })

        // this.overallCollectedData.push(this.currentlyScrapedData);
        this.data.push(scrapingObject);
        // return this.data;

    }


}

class ImageSelector extends Selector {


    async fetchImage(url) {
        console.log('fetching image:',url);
        const options = {
            url,
            dest: './images/'
        }
        return this.repeatPromiseUntilResolved(download.image(options), url).then(() => { downloadedImages++ });

    }

    // getAllData() {
    //     const allData = {
    //         allImages: [],
    //         errors: this.errors
    //     };

    //     this.overallCollectedData.forEach((data) => {
    //         data.imagesSaved.forEach((item) => allData.allImages.push(item));
    //     })

    //     // for(let key in this.overallCollectedData){
    //     //     if(key == 'imagesSaved'){
    //     //         allData.data.push()
    //     //     }
    //     // }

    //     return allData;

    // }

    getCurrentData() {//Returns the scraped data of the selector.
        return this.data[this.data.length-1];
    }

    createScrapingObject(href) {
        const scrapingObject = {
            attribs: {
                address: href,//The image href
                name: this.name,
                type: 'Image Selector',
            },
            referenceToSelectorObject:()=>{return this} ,
            successful: false,
            data: []
        }
        return scrapingObject;
    }

    async processOneScrapingObject(scrapingObject) {
        // this.currentlyScrapedData = {
        //     type: 'Image Selector',
        //     imagesSaved: [],
        //     errors: []
        // }
        const imageHref = scrapingObject.attribs.address;

        try {
            var absoluteUrl = this.getAbsoluteUrl(this.globalConfig.baseSiteUrl, imageHref);
            await this.fetchImage(absoluteUrl);
            scrapingObject.data.push(absoluteUrl);

            // console.log('pushed image ref', imageHref)
        } catch (error) {
            const errorString = `there was an error fetching image:, ${absoluteUrl}, ${error}`
            console.log(errorString)

            this.currentlyScrapedData.errors.push(errorString);
            this.errors.push(errorString);
            overallErrors++
            throw error;

        }


        if (this.currentlyScrapedData.errors.length == 0) {
            // this.overallCollectedData.push(this.currentlyScrapedData);
            delete this.currentlyScrapedData.errors;
        }

        this.overallCollectedData.push(this.currentlyScrapedData);
        // console.log('this.currently.errors',this.currentlyScrapedData.errors)
    }

    async scrape() {

        const $ = cheerio.load(this.dataFromParent.html);
        const nodeList = $(this.querySelector);
        const imageHrefs = [];
        nodeList.each((index, element) => {
            // for(let i in element.attribs){
            //     console.log(i, element.attribs[i])
            // }

            // console.log('image unwrapped element',element.attribs.src)
            imageHrefs.push(this.customSrc ? $(element).attr(this.customSrc) : $(element).attr('src'));

        })

        if (imageHrefs.length == 0) {
            // this.currentlyScrapedData.errors.push(`No images found by the query, in ${this.dataFromParent.address}`);
            this.errors.push(`No images found by the query, in ${this.dataFromParent.address}`);
            overallErrors++
            return;
        }

        const scrapingObjects = [];

        imageHrefs.forEach((imageHref) => {
            const scrapingObject = this.createScrapingObject(imageHref);
            scrapingObjects.push(scrapingObject);
        })

       

        for (let scrapingObject of scrapingObjects) {
            try {
              await this.processOneScrapingObject(scrapingObject);  
            } catch (error) {
                continue;
            }
            
        }


        this.data.push(scrapingObjects);

        // return this.data;





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
(async () => {

    //*******************cnn site */
    // const config = {
    //     baseSiteUrl: `https://edition.cnn.com/`,
    //     startUrl: `https://edition.cnn.com/sport`
    // }
    // const root = new RootSelector(config);
    // // const category = new PageSelector({ querySelector: '.nav-menu-links__link', name: 'category' });
    // const article = new PageSelector({ querySelector: 'article a', name: 'article' });
    // const paragraph = new ContentSelector({ querySelector: 'h1', name: 'paragraphs' });
    // const image = new ImageSelector({ querySelector: 'img.media__image.media__image--responsive', name: 'image',customSrc:'data-src-medium' });
    // const articleImage = new ImageSelector({ querySelector: 'img', name: 'article image' });
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
    // // root.addSelector(image);
    // // root.addSelector(paragraph);


    // // article.addSelector(image);

    // try {
    //     await root.scrape();
    //     var entireTree = root.getCurrentData();
    //     console.log('no errors, all done, number of images:', downloadedImages)
    // } catch (error) {
    //     console.log('error from outer scope', error)
    //     console.log('there was an error somewhere in the promises, killing the script');
    //     process.exit();

    // }
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
    // const root = new RootSelector(config);
    // const productLink = new PageSelector({ querySelector: '.list-row a:first-of-type', name: 'link' });
    // root.addSelector(productLink);
    // // const publisherData = new ContentSelector('.product_publisher');

    // const productImage = new ImageSelector({ querySelector: 'img', name: 'image' });
    // // productLink.addSelector(publisherData);
    // // productLink.addSelector(authorData);
    // // productLink.addSelector(cityData);
    // productLink.addSelector(productImage);
    // try {
    //     await root.scrape();
    //     var entireTree = root.getCurrentData();
    //     console.log('no errors, all done, number of images:', downloadedImages)
    // } catch (error) {
    //     console.log('error from outer scope', error)
    //     console.log('there was an error somewhere in the promises, killing the script');
    //     process.exit();

    // }
    //**************************books site category ***********************/
    const config = {
        baseSiteUrl: `https://ibrod83.com`,
        startUrl: `https://ibrod83.com/books`
    }
    const root = new RootSelector(config);

    const productPage = new PageSelector({ querySelector: '.product_name_link', name: 'product', pagination: { queryString: 'page', numPages: 3 } });
    const categoryPage = new PageSelector({ querySelector: '#content_65 ol a', name: 'category' });
    root.addSelector(categoryPage);
    categoryPage.addSelector(productPage);
    const publisherData = new ContentSelector({ querySelector: '.product_publisher', name: 'publisher' });
    const productName = new ContentSelector({ querySelector: '.product_name', name: 'name' });
    const authorData = new ContentSelector({ querySelector: '.product_author', name: 'author' });
    const productImage = new ImageSelector({ querySelector: '.book img', name: 'image' });
    productPage.addSelector(publisherData);
    productPage.addSelector(authorData);
    productPage.addSelector(productImage);
    productPage.addSelector(productName);
    // root.addSelector(productImage)
    try {
        await root.scrape();
        var entireTree = root.getCurrentData();
    console.log(entireTree);
        // var productTree = productPage.getAllData();
        // var allErrors = root.getErrors();
        // var allImages = productImage.getAllData();
        console.log('no errors, all done, number of images:', downloadedImages)
    } catch (error) {
        console.log('error from outer scope', error)
        console.log('there was an error somewhere in the promises, killing the script');
        process.exit();

    }

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

    // try {
    //     await root.scrape();
    //     var entireTree = root.getCurrentData();
    //     console.log('no errors, all done, number of images:', downloadedImages)
    // } catch (error) {
    //     console.log('error from outer scope', error)
    //     console.log('there was an error somewhere in the promises, killing the script');
    //     process.exit();

    // }

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
    fs.writeFile('./log.json', JSON.stringify(entireTree), (err) => {
        if (err) {
            console.log(err)
        } else {
            console.log('The file has been saved!');
        }

    });
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


  // function getClassMap() {
    //     return {
    //         link: Link,
    //         root: Root,
    //         data: Data
    //     }

    // }

  // const configObj = {

    //     baseSiteUrl: `https://ibrod83.com`,
    //     startUrl: `https://ibrod83.com/books/Product/america/search?items_per_page=12&filter=NameOrAuthor&location=all`,
    //     type:'root',
    //     selectors: [
    //         {
    //             type: 'link',
    //             name: '.product_name_link',
    //             selectors: [
    //                 {
    //                     type: 'data',
    //                     name: '.product_publisher'
    //                 }                    
    //             ]
    //         }
    //     ]
    // }    
    // const newObject={};

    // function createObjectsFromTree(oldObject,newObject) {
    //     // console.log(object)
    //     const classReference = getClassMap()[oldObject.type];
    //     // console.log(classReference)
    //     if(oldObject.type !== 'root'){
    //         oldObject.actualObject = new classReference(oldObject.name, oldObject.children || null); 
    //     }


    //     if (!oldObject.selectors) {

    //         return;
    //     }

    //     object.selectors.forEach((child) => {


    //         createObjectsFromTree(child)
    //     })


    // }

