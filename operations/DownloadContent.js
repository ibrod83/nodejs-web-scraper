const HttpOperation = require('./HttpOperation');
var cheerio = require('cheerio')
const fs = require('fs');
const { promisify } = require('util');
const writeFile = promisify(fs.writeFile)
const Downloader = require('../file_downloader')
const FileProcessor = require('../file_downloader/file_processor');
const crypto = require('crypto')
const { verifyDirectoryExists } = require('../utils/files')
const { getBaseUrlFromBaseTag, createElementList } = require('../utils/cheerio')
const { getAbsoluteUrl, isDataUrl, getDataUrlExtension } = require('../utils/url');
const { mapPromisesWithLimitation } = require('../utils/concurrency');




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
     * @param {Function} [config.getException = null] Listens to every exception. Receives the Error object. 
     */
    constructor(querySelector, config = {}) {
        super(config);


        this.querySelector = querySelector;
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
      * @param {{url:string,html:string}} params 
     * @return {Promise<{type:string,name:string,data:[]}>}
     */
    async scrape({ html, url }) {
        // debugger;
        if (!this.directoryVerified) {
            await verifyDirectoryExists(this.config.filePath || this.scraper.config.filePath);
            this.directoryVerified = true;
        }


        this.config.contentType = this.config.contentType || 'image';
        var $ = cheerio.load(html);
        const baseUrlFromBaseTag = getBaseUrlFromBaseTag($, this.scraper.config.baseSiteUrl);

        const elementList = await createElementList($, this.querySelector, { condition: this.config.condition, slice: this.config.slice });

        if (this.config.getElementList) {
            await this.config.getElementList(elementList);
        }
        const fileRefs = this.getFileRefs(url, elementList, baseUrlFromBaseTag)


        await mapPromisesWithLimitation(fileRefs, (ref) => {
            return this.processOneIteration(ref)
        }, this.scraper.config.concurrency)

        const iterations = fileRefs;
        this.data.push(...iterations)
        return { type: this.constructor.name, name: this.config.name, data: iterations };
    }



    /**
     * 
     * @param {string} url 
     * @param {Array} elementList 
     * @param {string} baseUrlFromBaseTag 
     * @return {string[]} fileRefs
     */
    getFileRefs(url, elementList, baseUrlFromBaseTag) {
        const fileRefs = []
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
                        const errorString = `Invalid image href:' ${src}, on page: ${url}, alternative srcs: ${this.alternativeSrc}`;
                        this.scraper.log(errorString);
                        this.errors.push(errorString);
                        return;
                    }
                }
            }
            const absoluteUrl = getAbsoluteUrl(baseUrlFromBaseTag || url, src);
            fileRefs.push(absoluteUrl);

        })

        return fileRefs;
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
            this.scraper.log('Src is base64. Creating a file form it, with a hashed name.')

            const extension = getDataUrlExtension(url);
            const split = url.split(';base64,');

            var base64Data = split[1]
            let fileName = crypto.createHash('md5').update(base64Data).digest("hex")

            const fileProcessor = new FileProcessor({ fileName: `${fileName}.${extension}`, path: this.config.filePath || this.scraper.config.filePath });
            if (this.scraper.config.cloneFiles) {
                fileName = fileProcessor.getAvailableFileName();
            } else {
                fileName = fileName + '.' + extension;
            }

            await writeFile(`${this.config.filePath || this.scraper.config.filePath}/${fileName}`, base64Data, 'base64');
            this.scraper.state.downloadedFiles++


        }


    }



    async getFile(url) {

        if (url.startsWith("data:image")) {
            var promiseFactory = this.saveDataUrlPromiseFactory(url);
        } else {


            const options = {
                url,
                directory: this.config.filePath || this.scraper.config.filePath,
                cloneFiles: this.scraper.config.cloneFiles,
                shouldBufferResponse: this.config.contentType === 'image' ? true : false,
                auth: this.scraper.config.auth,
                timeout: this.scraper.config.timeout,
                headers: this.scraper.config.headers,
                proxy: this.scraper.config.proxy,
                agent: this.scraper.config.agent
            }


            var promiseFactory = async () => {

                await this.beforePromiseFactory('Fetching file:' + url);

                try {

                    const downloader = new Downloader(options)

                    await downloader.download();
                    await downloader.save();
                    this.scraper.state.downloadedFiles++

                    this.scraper.log(`Files: ${this.scraper.state.downloadedFiles}`)


                } catch (err) {
                    throw err;
                } finally {
                    this.afterPromiseFactory();
                }

            }
        }

        return await this.qyuFactory(() => this.repeatPromiseUntilResolved(promiseFactory, url));


    }


    async processOneIteration(fileHref) {

        try {
            await this.getFile(fileHref);


        } catch (error) {

            const errorString = `There was an error fetching file:, ${fileHref}, ${error}`
            this.errors.push(errorString);
            this.handleFailedScrapingIteration(errorString);

        }

    }



}


module.exports = DownloadContent;
