const HttpOperation = require('./HttpOperation');
var cheerio = require('cheerio');
var cheerioAdv = require('cheerio-advanced-selectors');
cheerio = cheerioAdv.wrap(cheerio);
const fs = require('fs');
const { promisify } = require('util');
const writeFile = promisify(fs.writeFile)
// const file_downloader = require('../file_downloader')
const Downloader = require('nodejs-file-downloader')
// const FileProcessor = require('../file_downloader/file_processor');
const FileProcessor = require('nodejs-file-downloader/FileProcessor.js');
const crypto = require('crypto')
const { verifyDirectoryExists } = require('../utils/files')
const { getBaseUrlFromBaseTag, createElementList } = require('../utils/cheerio')
const {getAbsoluteUrl,isDataUrl,getDataUrlExtension} = require('../utils/url');

// const repeatPromiseUntilResolved = require('repeat-promise-until-resolved');



class DownloadContent extends HttpOperation {//Responsible for downloading files and images from a given page.

    /**
     * 
     * @param {string} querySelector cheerio-advanced-selectors selector 
     * @param {Object} [config]
     * @param {string} [config.contentType = 'image'] Either "image" or "file"(then the href is used, not the src)
     * @param {string} [config.name = 'Default DownloadContent name'] 
     * @param {string[]} [config.alternativeSrc = null] 
     * @param {string} [config.filePath = null]    
     * @param {number[]} [config.slice = null]
     * @param {Function} [config.condition = null] Receives a Cheerio node. Use this hook to decide if this node should be included in the scraping. Return true or false
     * @param {Function} [config.getElementList = null] Receives an elementList array     
     * @param {Function} [config.afterScrape = null] Receives a data object
     * @param {Function} [config.getException = null] Listens to every exception. Receives the Error object. 
     */
    constructor(querySelector, config = {}) {
        // debugger;
        super(config);

        this.querySelector = querySelector;
        // this.overridableProps = ['filePath', 'fileFlag', 'imageResponseType'];
        this.overridableProps = ['filePath'];
        for (let prop in config) {
            if (this.overridableProps.includes(prop))
                this[prop] = config[prop];
        }

        this.directoryVerified = false;

        this.alternativeSrc = config.alternativeSrc || [
            'data-src',
            'data-src-large',
            'data-src-medium',
            'data-src-small',
        ]
    }


    /**
     * 
     * @param {CustomResponse} responseObjectFromParent 
     * @return {Promise<{type: string;name: string;data: Array;}>}
     */
    async scrape(responseObjectFromParent) {
        if (!this.directoryVerified) {
            await verifyDirectoryExists(this.filePath || this.scraper.config.filePath);
            // await this.scraper.pathQueue.verifyDirectoryExists(this.filePath || this.scraper.config.filePath);
            // debugger;
            this.directoryVerified = true;
        }

        const currentWrapper = this.createWrapper(responseObjectFromParent.config.url);

        this.contentType = this.contentType || 'image';
        var $ = cheerio.load(responseObjectFromParent.data);
        // debugger;
        // const baseUrlFromBaseTag = this.getBaseUrlFromBaseTag($);
        const baseUrlFromBaseTag = getBaseUrlFromBaseTag($, this.scraper.config.baseSiteUrl);

        // const elementList = await this.createElementList($);
        const elementList = await createElementList($,this.querySelector,{condition:this.condition,slice:this.slice});

        if (this.getElementList) {
            await this.getElementList(elementList);
        }
        // debugger;
        const fileRefs = [];

        elementList.forEach((element) => {

            var src;
            src = element.attr(this.contentType === 'image' ? 'src' : 'href')
            // const isDataUrl = this.isDataUrl(src);//Give priority to non-base64 images.
            const isImageDataUrl = isDataUrl(src);//Give priority to non-base64 images.
            if (!src || isImageDataUrl) {//If the element doesn't have an "src" tag(in case of content type image), or the src is base64, try getting an alternative.
                const alternativeAttrib = this.alternativeSrc && this.getAlternativeAttrib(element[0].attribs);
                if (alternativeAttrib) {

                    src = element.attr(alternativeAttrib);
                } else {
                    if (!src) {
                        const errorString = `Invalid image href:' ${src}, on page: ${responseObjectFromParent.url}, alternative srcs: ${this.alternativeSrc}`;
                        console.error(errorString);
                        this.errors.push(errorString);
                        return;
                    }

                }
            }

            // const absoluteUrl = this.getAbsoluteUrl(baseUrlFromBaseTag || responseObjectFromParent.url, src);
            const absoluteUrl = getAbsoluteUrl(baseUrlFromBaseTag || responseObjectFromParent.url, src);
            fileRefs.push(absoluteUrl);

        })
        $ = null;

        // if (!fileRefs.length) {//problem, this resolves the promise with undefined, if no images are found.

        //     return;
        // }

        const scrapingObjects = this.createScrapingObjectsFromRefs(fileRefs);
        // debugger;
        await this.executeScrapingObjects(scrapingObjects);

        currentWrapper.data = [...currentWrapper.data, ...scrapingObjects];


        this.data.push(currentWrapper);
        // this.data.push(currentWrapper.data);

        if (this.afterScrape) {
            await this.afterScrape(currentWrapper);
        }

        return this.createMinimalData(currentWrapper);
    }

    /**
     * 
     * @param {string[] | string} alternativeAttribs 
     * @return {string | undefined}  
     */
    getAlternativeAttrib(alternativeAttribs) {
        for (let attrib in alternativeAttribs) {
            if (typeof this.alternativeSrc === 'object') {
                if (this.alternativeSrc.includes(attrib)) {
                    // debugger;

                    // console.log('alternative attrib:')
                    return attrib;
                }
            } else {
                if (this.alternativeSrc === attrib)
                    return attrib;
            }

        }
    }


    saveDataUrlPromiseFactory(url) {

        return async () => {
            console.log('Src is base64. Creating a file form it, with a hashed name.')

            const extension = getDataUrlExtension(url);
            const split = url.split(';base64,');

            var base64Data = split[1]
            let fileName = crypto.createHash('md5').update(base64Data).digest("hex")

            const fileProcessor = new FileProcessor({ fileName: `${fileName}.${extension}`, path: this.filePath || this.scraper.config.filePath });
            if (this.scraper.config.cloneImages) {
                debugger;
                // fileName = await fileProcessor.getAvailableFileName();
                fileName = fileProcessor.getAvailableFileName();
            } else {
                fileName = fileName + '.' + extension;
            }

            await writeFile(`${this.filePath || this.scraper.config.filePath}/${fileName}`, base64Data, 'base64');
            this.scraper.state.downloadedFiles++

            // console.log('images:', this.scraper.state.downloadedFiles)

        }


    }

    async getFile(url) {

        if (this.processUrl) {
            try {
                url = await this.processUrl(url)
            } catch (error) {
                console.error('Error processing URL, continuing with original one: ', url);
            }

        }

        if (url.startsWith("data:image")) {
            var promiseFactory = this.saveDataUrlPromiseFactory(url);
        } else {

            // const options = {
            //     url,
            //     // useContentDisposition,
            //     dest: this.filePath || this.scraper.config.filePath,
            //     clone: this.scraper.config.cloneImages,
            //     // flag: this.fileFlag || this.scraper.config.fileFlag,
            //     // responseType:'stream',
            //     shouldBufferResponse: this.contentType === 'image' ? true : false,
            //     // mockImages:true,
            //     auth: this.scraper.config.auth,
            //     timeout: this.scraper.config.timeout,
            //     headers: this.scraper.config.headers,
            //     proxy: this.scraper.config.proxy,

            // }

            // await verifyDirectoryExists(options.dest);
            
            const options = {
                url,
                // useContentDisposition,
                directory: this.filePath || this.scraper.config.filePath,
                cloneFiles: this.scraper.config.cloneImages,
                // flag: this.fileFlag || this.scraper.config.fileFlag,
                // responseType:'stream',
                shouldBufferResponse: this.contentType === 'image' ? true : false,
                // shouldBufferResponse: true,
                // mockImages:true,
                auth: this.scraper.config.auth,
                timeout: this.scraper.config.timeout,
                // timeout: 150,
                headers: this.scraper.config.headers,
                proxy: this.scraper.config.proxy,

            }


            var promiseFactory = async () => {

                await this.beforePromiseFactory('Fetching file:' + url);

                try {
                    // const fileDownloader = new file_downloader(options);
                    // //**************TAKE CARE OF PROGRAM ENDING BEFORE ALL FILES COMPLETED**************** */
                    // await fileDownloader.download();
                    // if (!this.scraper.config.mockImages) {
                    //     // if (false) {
                    //     // const { newFileCreated } = await fileDownloader.save();
                    //     await fileDownloader.save();

                    //     // newFileCreated && this.scraper.state.downloadedFiles++;
                    //     this.scraper.state.downloadedFiles++

                    //     console.log('images:', this.scraper.state.downloadedFiles)
                    // }
                    // debugger;
                    const downloader = new Downloader(options)
                    // debugger;
                    // downloader.injectPathQueue(this.scraper.pathQueue)
                    // debugger;
                    await downloader.download();
                    this.scraper.state.downloadedFiles++

                    console.log('images:', this.scraper.state.downloadedFiles)

                } catch (err) {
                    debugger;
                    if (err.code === 'EEXIST') {
                        debugger;
                        // console.log('File already exists in the directory, NOT overwriting it:', url);
                    } else {
                        throw err;
                    }
                }

                finally {
                    this.afterPromiseFactory();
                }
                // return resp;

            }
        }

        // return await this.repeatPromiseUntilResolved(() => { return this.qyuFactory(promiseFactory) }, url)
        // return await this.qyuFactory(() => this.repeatPromiseUntilResolved(promiseFactory, url));
        // return await this.qyuFactory(() =>repeatPromiseUntilResolved(promiseFactory, { maxAttempts,  onError }));
        return await this.qyuFactory(() => this.repeatPromiseUntilResolved(promiseFactory, url));


    }


    async processOneScrapingObject(scrapingObject) {

        delete scrapingObject.data;//Deletes the unnecessary 'data' attribute.
        const fileHref = scrapingObject.address;

        try {
            await this.getFile(fileHref);
            scrapingObject.successful = true;

        } catch (error) {

            const errorCode = error.code
            const errorString = `There was an error fetching file:, ${fileHref}, ${error}`
            this.errors.push(errorString);
            this.handleFailedScrapingObject(scrapingObject, errorString, errorCode);

            return;
        }

    }


}


module.exports = DownloadContent;
