const HttpOperation = require('./HttpOperation');
var cheerio = require('cheerio');
var cheerioAdv = require('cheerio-advanced-selectors');
cheerio = cheerioAdv.wrap(cheerio);
const fs = require('fs');
const { promisify } = require('util');
const writeFile = promisify(fs.writeFile)
const file_downloader = require('../file_downloader')
const FileProcessor = require('../file_downloader/file_processor');
const crypto = require('crypto')
const { verifyDirectoryExists } = require('../utils/files')
const { getBaseUrlFromBaseTag, createElementList } = require('../utils/cheerio')
const { getAbsoluteUrl, isDataUrl, getDataUrlExtension } = require('../utils/url');
const ScrapingWrapper = require('../structures/ScrapingWrapper');
const MinimalData = require('../structures/MinimalData');



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
                this.config[prop] = config[prop];
        }

        this.directoryVerified = false;

        this.alternativeSrc = config.alternativeSrc || [
            'data-src',
            'data-src-large',
            'data-src-medium',
            'data-src-small',
        ]
    }

    validateOperationArguments() {
        if (!this.scraper.config.filePath && !this.config.filePath)
            throw new Error(`DownloadContent operation Must be provided with a filePath, either locally or globally.`);
        if (!this.querySelector || typeof this.querySelector !== 'string')
            throw new Error(`DownloadContent operation must be provided with a querySelector.`);
    }




    /**
     * 
     * @param {CustomResponse} responseObjectFromParent 
     * @return {Promise<{type: string;name: string;data: Array;}>}
     */
    async scrape(responseObjectFromParent) {
        if (!this.directoryVerified) {
            await verifyDirectoryExists(this.config.filePath || this.scraper.config.filePath);
            this.directoryVerified = true;
        }

        const currentWrapper = new ScrapingWrapper('DownloadContent', this.config.name, responseObjectFromParent.config.url);

        this.config.contentType = this.config.contentType || 'image';
        var $ = cheerio.load(responseObjectFromParent.data);
        const baseUrlFromBaseTag = getBaseUrlFromBaseTag($, this.scraper.config.baseSiteUrl);

        const elementList = await createElementList($, this.querySelector, { condition: this.config.condition, slice: this.config.slice });

        if (this.config.getElementList) {
            await this.config.getElementList(elementList);
        }
        // debugger;config.
        const fileRefs = [];

        elementList.forEach((element) => {

            var src;
            src = element.attr(this.config.contentType === 'image' ? 'src' : 'href')
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

            const absoluteUrl = getAbsoluteUrl(baseUrlFromBaseTag || responseObjectFromParent.url, src);
            fileRefs.push(absoluteUrl);

        })
        $ = null;

        const scrapingObjects = this.createScrapingObjectsFromRefs(fileRefs);
        // debugger;
        await this.executeScrapingObjects(scrapingObjects, (scrapingObject) => {
            return this.processOneScrapingObject(scrapingObject)
        });

        currentWrapper.data = [...currentWrapper.data, ...scrapingObjects];


        this.data.push(currentWrapper);
        // this.data.push(currentWrapper.data);

        if (this.config.afterScrape) {
            await this.config.afterScrape(currentWrapper);
        }

        // return this.createMinimalData(currentWrapper);
        return new MinimalData(currentWrapper.type, currentWrapper.name, currentWrapper.data)

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

            const fileProcessor = new FileProcessor({ fileName: `${fileName}.${extension}`, path: this.config.filePath || this.scraper.config.filePath });
            if (this.scraper.config.cloneImages) {

                fileName = fileProcessor.getAvailableFileName();
            } else {
                fileName = fileName + '.' + extension;
            }

            await writeFile(`${this.config.filePath || this.scraper.config.filePath}/${fileName}`, base64Data, 'base64');
            this.scraper.state.downloadedFiles++

            console.log('images:', this.scraper.state.downloadedFiles)

        }


    }

    /**
     * 
     * @param {string} href
     * @return {Promise<string>} 
     */
    async runProcessUrlHook(href) {
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
    }


    async getFile(url) {

        const finalUrl = await this.runProcessUrlHook(url);

        if (finalUrl.startsWith("data:image")) {
            var promiseFactory = this.saveDataUrlPromiseFactory(finalUrl);
        } else {

            const options = {
                url: finalUrl,
                dest: this.config.filePath || this.scraper.config.filePath,
                clone: this.scraper.config.cloneImages,
                shouldBufferResponse: this.config.contentType === 'image' ? true : false,
                auth: this.scraper.config.auth,
                timeout: this.scraper.config.timeout,
                headers: this.scraper.config.headers,
                proxy: this.scraper.config.proxy,
            }


            var promiseFactory = async () => {

                await this.beforePromiseFactory('Fetching file:' + finalUrl);

                try {
                    const fileDownloader = new file_downloader(options);
                    //**************TAKE CARE OF PROGRAM ENDING BEFORE ALL FILES COMPLETED**************** */
                    await fileDownloader.download();
                    if (!this.scraper.config.mockImages) {

                        await fileDownloader.save();

                        this.scraper.state.downloadedFiles++

                        console.log('images:', this.scraper.state.downloadedFiles)
                    }

                } catch (err) {
                    throw err;
                } finally {
                    this.afterPromiseFactory();
                }
                // return resp;

            }
        }

        return await this.qyuFactory(() => this.repeatPromiseUntilResolved(promiseFactory, finalUrl));


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
