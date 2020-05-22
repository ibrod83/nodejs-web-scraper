const InterneticOperation = require('./InterneticOperation');
var cheerio = require('cheerio');
var cheerioAdv = require('cheerio-advanced-selectors');
cheerio = cheerioAdv.wrap(cheerio);
const fs = require('fs');
const file_downloader = require('../file_downloader')
const FileProcessor = require('../file_downloader/file_processor');
const crypto = require('crypto')
// const YoyoTrait = require('../YoyoTrait');

let counter=0
// console.log(DownloadContent)

class DownloadContent extends InterneticOperation {//Responsible for downloading files and images from a given page.

    constructor(querySelector, objectConfig) {
        super(objectConfig);
        // debugger;
        // this.lodash=_;
        // this.special = special
        // this.useTrait(YoyoTrait);
        // this.yoyo('chuj ci w dupsko!',this);
        //    debugger;

        this.querySelector = querySelector;
        this.overridableProps = ['filePath', 'fileFlag', 'imageResponseType'];
        for (let prop in objectConfig) {
            if (this.overridableProps.includes(prop))
                this[prop] = objectConfig[prop];
        }
        // debugger;
        this.validateOperationArguments();

        // this.yoyo();



    }


    async scrape(responseObjectFromParent) {
      
        const currentWrapper = this.createWrapper(responseObjectFromParent.config.url);

        this.contentType = this.contentType || 'image';
        var $ = cheerio.load(responseObjectFromParent.data);
        // debugger;
        const baseUrlFromBaseTag = this.getBaseUrlFromBaseTag($);

        const elementList = this.createElementList($);
        // debugger;
        const fileRefs = [];
        elementList.forEach((element) => {
           
            // debugger;
            // const normalSrcString = element.attr('src')
            var src;
            src = element.attr(this.contentType === 'image' ? 'src' : 'href')
            // if(src.startsWith('data:image')){
            //     debugger;
            //     global.counter++;
            //     console.log('counter',global.counter)
            // }
            // if (!src || src.startsWith("data:image")) {
            if (!src) {//If the element doesn't have an "src" tag(in case on content type image)
                // debugger;
                const alternativeAttrib = this.alternativeSrc && this.getAlternativeAttrib(element[0].attribs);
                if (alternativeAttrib) {
                    
                    src = element.attr(alternativeAttrib);
                    // console.log('alternative src result', src)
                } else {
                    // console.log('page of image error:', responseObjectFromParent.request.res.responseUrl)

                    const errorString = `Invalid image href:' ${src}, on page: ${responseObjectFromParent.request.res.responseUrl}, alternative srcs: ${this.alternativeSrc}`;
                    console.error(errorString);
                    this.errors.push(errorString);
                    return;
                }
            }
            // debugger;
            // else if(src.startsWith("data:image")){

            // }

            // src = this.processRelativeSrc(src);
            // debugger;
            const absoluteUrl = this.getAbsoluteUrl(baseUrlFromBaseTag || responseObjectFromParent.request.res.responseUrl, src);
            fileRefs.push(absoluteUrl);
            // currentWrapper.data.push(absoluteUrl);



        })
        $ = null;

        if (!fileRefs.length) {
            // this.errors.push(`No images found by the query, in ${dataFromParent.address}`);
            // overallErrors++
            return;
        }

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

    getAlternativeAttrib(alternativeAttribs) {
        for (let attrib in alternativeAttribs) {
            if (typeof this.alternativeSrc === 'object') {
                if (this.alternativeSrc.includes(attrib)) {
                    // console.log('alternative attrib:')
                    return attrib;
                }
            } else {
                if (this.alternativeSrc === attrib)
                    return attrib;
            }

        }
    }

    getDataUrlExtension(dataurl) {
        return dataurl.split('/')[1].split(';')[0]
    }

    saveDataUrlPromiseFactory(url) {
        return () => {
            return new Promise((resolve, reject) => {
                console.log('Src is base64. Creating a file form it, with a hashed name.')
                
                const extension = this.getDataUrlExtension(url);
                const split = url.split(';base64,');
                // debugger;
                // console.log('split',split)
                // var base64Data = url.split(';base64,').pop();
                var base64Data = split[1]
                let fileName = crypto.createHash('md5').update(base64Data).digest("hex")

                // debugger;
                const fileProcessor = new FileProcessor({ fileName:`${fileName}.${extension}`, path: this.filePath || this.scraper.config.filePath});
                if ( this.scraper.config.cloneImages) {

                    fileName = fileProcessor.getAvailableFileName();
                }else{
                    fileName = fileName+'.'+extension;
                }
                this.scraper.verifyDirectoryExists(this.filePath || this.scraper.config.filePath);
                // console.log('rejecting')
                // return reject('yoyo');
                // debugger;
                // fs.writeFile(`${this.filePath || this.scraper.config.filePath}/${u}.${this.getDataUrlExtension(url)}`, base64Data, 'base64', function (err) {
                fs.writeFile(`${this.filePath || this.scraper.config.filePath}/${fileName}`, base64Data, 'base64', function (err) {
                    // console.log(err);
                    if (err) {
                        reject(err);
                    } else {
                        counter++
                        // console.log('NUMBER OF DATAURL FILES CREATED ',counter)
                        resolve();
                    }
                });
            })
        }


    }

    async getFile(url) {
        // debugger;

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
        let useContentDisposition=false;
        if (this.contentType === 'file') {
            responseType = 'stream';
            useContentDisposition=true;
        } else {

            if (this.imageResponseType) {
                responseType = this.imageResponseType;
            } else {
                responseType = this.scraper.config.imageResponseType || 'arraybuffer';
            }

        }

        if (url.startsWith("data:image")) {
            var promiseFactory = this.saveDataUrlPromiseFactory(url);
        } else {
            const options = {
                url,
                useContentDisposition,
                dest: this.filePath || this.scraper.config.filePath,
                clone: this.scraper.config.cloneImages,
                flag: this.fileFlag || this.scraper.config.fileFlag,
                responseType,
                auth: this.scraper.config.auth,
                timeout: this.scraper.config.timeout,
                headers: this.scraper.config.headers,
                proxy: this.scraper.config.proxy,

            }

            this.scraper.verifyDirectoryExists(options.dest);



            var promiseFactory = async () => {

                await this.beforePromiseFactory('Fetching file:' + url);

                try {
                    const fileDownloader = new file_downloader(options);
                    //**************TAKE CARE OF PROGRAM ENDING BEFORE ALL FILES COMPLETED**************** */
                    await fileDownloader.download();
                    if (!this.scraper.config.mockImages) {
                        await fileDownloader.save();
                        this.scraper.state.downloadedImages++; console.log('images:', this.scraper.state.downloadedImages)
                    }

                } catch (err) {

                    if (err.code === 'EEXIST') {
                        console.log('File already exists in the directory, NOT overwriting it:', url);
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



        return await this.repeatPromiseUntilResolved(() => { return this.qyuFactory(promiseFactory) }, url)


    }


    async processOneScrapingObject(scrapingObject) {

        delete scrapingObject.data;//Deletes the unnecessary 'data' attribute.
        const fileHref = scrapingObject.address;
        // if (!fileHref) {
        //     throw 'Image href is invalid, skipping.';
        // }
        try {


            await this.getFile(fileHref);
            // debugger;
            scrapingObject.successful = true;

        } catch (error) {
            // debugger;
            // error.code
            const errorCode = error.code
            const errorString = `There was an error fetching file:, ${fileHref}, ${error}`
            this.errors.push(errorString);
            this.handleFailedScrapingObject(scrapingObject, errorString, errorCode);

            return;


        }

    }


}



// DownloadContent.useTrait(YoyoTrait,DownloadContent);
// console.log(DownloadContent.prototype)
// YoyoTrait.prototype = Object.create(DownloadContent.prototype);
// Object.keys(YoyoTrait.prototype).forEach((prop) => {
//     if (YoyoTrait.prototype.hasOwnProperty(prop)) {
//         DownloadContent.prototype[prop] = DownloadContent.prototype[prop] || YoyoTrait.prototype[prop];
//     }
// })
// debugger;
// console.log(DownloadContent.prototype)
// console.log(DownloadContent.__proto__)

module.exports = DownloadContent;
