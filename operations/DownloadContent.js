const InterneticOperation = require('./InterneticOperation');
var cheerio = require('cheerio');
var cheerioAdv = require('cheerio-advanced-selectors');
cheerio = cheerioAdv.wrap(cheerio);
const file_downloader = require('../file_downloader')

// const YoyoTrait = require('../YoyoTrait');


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
        // debugger;
        // console.log('dependency:',this._)
        // console.log('now from dependency injected _:', this._.now())
        // console.log(this.prototype)
        const currentWrapper = this.createWrapper(responseObjectFromParent.config.url);

        this.contentType = this.contentType || 'image';
        var $ = cheerio.load(responseObjectFromParent.data);
        // debugger;
        const baseUrlFromBaseTag = this.getBaseUrlFromBaseTag($);

        const elementList = this.createElementList($);

        const fileRefs = [];
        elementList.forEach((element) => {
            var src;
            src = element.attr(this.contentType === 'image' ? 'src' : 'href')
            if (!src || src.startsWith("data:image")) {
                const alternativeAttrib = this.alternativeSrc && this.getAlternativeAttrib(element[0].attribs);
                if (alternativeAttrib) {

                    src = element.attr(alternativeAttrib);
                    console.log('alternative src result', src)
                } else {
                    // console.log('page of image error:', responseObjectFromParent.request.res.responseUrl)

                    const errorString = `Invalid image href:' ${src}, on page: ${responseObjectFromParent.request.res.responseUrl}, alternative srcs: ${this.alternativeSrc}`;
                    console.error(errorString);
                    this.errors.push(errorString);
                    return;
                }
            }

            // src = this.processRelativeSrc(src);

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
        if (this.contentType === 'file') {
            responseType = 'stream';
        } else {

            if (this.imageResponseType) {
                responseType = this.imageResponseType;
            } else {
                responseType = this.scraper.config.imageResponseType || 'arraybuffer';
            }

        }

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



        const promiseFactory = async () => {

            await this.beforePromiseFactory('Fetching file:'+url);

            try {
                const fileDownloader = new file_downloader(options);
                //**************TAKE CARE OF PROGRAM ENDING BEFORE ALL FILES COMPLETED**************** */
                await fileDownloader.download();             
                if (!this.scraper.config.mockImages){
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
            this.handleFailedScrapingObject(scrapingObject, errorString,errorCode);

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
