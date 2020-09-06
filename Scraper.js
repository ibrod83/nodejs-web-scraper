
// const Promise = require('bluebird');
const { Qyu } = require('qyu');
const fs = require('fs');
const path = require('path');
const {verifyDirectoryExists} = require('./utils/files')
const {Root} = require('./');//For jsdoc
const ScrapingObject = require('./structures/ScrapingObject');//For jsdoc



class Scraper {

    /**
     * 
     * @param {Object} globalConfig 
     * @param {string} globalConfig.startUrl 
     * @param {string} globalConfig.baseSiteUrl 
     * @param {boolean} [globalConfig.cloneImages = true ]
     * @param {boolean} [globalConfig.removeStyleAndScriptTags = true ]     
     * @param {number} [globalConfig.concurrency = 3] 
     * @param {number} [globalConfig.maxRetries = 5]         
     * @param {number} [globalConfig.delay = 200] 
     * @param {number} [globalConfig.timeout = 6000] 
     * @param {string} [globalConfig.filePath= null] 
     * @param {Object} [globalConfig.auth = null] 
     * @param {Object} [globalConfig.headers = null] 
     * @param {Object} [globalConfig.proxy = null] 
     */
    constructor(globalConfig) {
        // debugger;
        // global.counter=0;
        this.config = {
            cloneImages: true,//If an image with the same name exists, a new file with a number appended to it is created. Otherwise. it's overwritten.
            removeStyleAndScriptTags: true,           
            concurrency: 3,//Maximum concurrent requests.
            maxRetries: 5,//Maximum number of retries of a failed request.            
            startUrl: '',
            baseSiteUrl: '',
            delay: 200,
            timeout: 6000,
            filePath: null,//Needs to be provided only if a DownloadContent operation is created.
            auth: null,
            headers: null,
            proxy: null
        }
        // this.state = new State();
        this.state = {
            existingUserFileDirectories: [],
            failedScrapingObjects: [],
            downloadedFiles: 0,
            currentlyRunning: 0,
            registeredOperations: [],//Holds a reference to each created operation.
            numRequests: 0,
            repetitionCycles: 0,
            scrapingObjects: []//for debugging
        }



        this.validateGlobalConfig(globalConfig);

        for (let prop in globalConfig) {
            this.config[prop] = globalConfig[prop];
        }

        this.config.fakeErrors = false;
        this.config.errorCodesToSkip = [404, 403, 400];
        // this.config.useQyu = true;
        this.config.mockImages = false;
        this.qyu = new Qyu({ concurrency: this.config.concurrency })//Creates an instance of the task-qyu for the requests.
        this.requestSpacer = Promise.resolve();
        
        this.referenceToRoot = null;

    }

    registerOperation(Operation){
        this.state.registeredOperations.push(Operation)
    }

    destroy() {
        console.error('Scraper.destroy() is deprecated. You can now have multiple instances, without calling this method.')
    }

    

    validateGlobalConfig(conf) {
        if (!conf || typeof conf !== 'object')
            throw 'Scraper constructor expects a configuration object';
        if (!conf.baseSiteUrl || !conf.startUrl)
            throw 'Please provide both baseSiteUrl and startUrl';
    }

     
   


    /**
     * 
     * @param {Root} rootObject 
     */
    async scrape(rootObject) {//This function will begin the entire scraping process. Expects a reference to the root operation.
        if (!rootObject || rootObject.constructor.name !== 'Root')
            throw 'Scraper.scrape() expects a Root object as an argument!';

        this.referenceToRoot = rootObject;
        // debugger;
        rootObject.injectScraper(this)
        // rootObject.init(this)
        await rootObject.scrape();
        if (this.areThereRepeatableErrors()) {
            console.error('Number of repeatable failed requests: ', this.state.failedScrapingObjects.length);
        } else {
            console.log('All done, no repeatable errors');
        }
        // this.outPutErrors();
        if (this.config.logPath) {
            try {
                await this.createLogs();
            } catch (error) {
                console.error('Error creating logs', error)
            }
        }
        // console.log('global.counter of alternative src ',global.counter)
        console.log('overall files: ', this.state.downloadedFiles)


    }

    // outPutErrors() {
    //     const numErrors = this.state.failedScrapingObjects.length;
    //     if (numErrors > 0) {
    //         console.error('Number of repeatable failed requests: ', numErrors);
    //     } else {
    //         console.log('All done, no repeatable errors');
    //     }
    // }

    areThereRepeatableErrors() {
        // debugger;
        return this.state.failedScrapingObjects.length > 0;
    }

    /**
     * 
     * @param {ScrapingObject} scrapingObject 
     */
    reportFailedScrapingObject(scrapingObject){
        debugger;
        const errorCode = scrapingObject.errorCode;
        const shouldNotBeSkipped = !this.config.errorCodesToSkip.includes(errorCode);
        if (!this.state.failedScrapingObjects.includes(scrapingObject) && shouldNotBeSkipped) {
            // console.log('scrapingObject not included,pushing it!')
            this.state.failedScrapingObjects.push(scrapingObject);
        }
    }


    /**
     * 
     * @param {Object} data 
     * @param {string} fileName    
     */
    saveFile(data,fileName) {
        // verifyDirectoryExists(this.config.logPath);
        return new Promise(async (resolve, reject) => {
            await verifyDirectoryExists(this.config.logPath);
            console.log('saving file')
            debugger;
            fs.writeFile(path.join(this.config.logPath, `${fileName}.json`), JSON.stringify(data), (error) => {
                if (error) {
                    reject(error)
                } else {
                    console.log(`Log file ${fileName} saved`);
                    resolve();
                }

            });

        })

    }

    async createLogs() {
        debugger;
        for (let operation of this.state.registeredOperations) {
            const fileName = operation.constructor.name === 'Root' ? 'log' : operation.config.name;
            const data = operation.getData();
            await this.createLog({ fileName, data })
        }
        await this.createLog({ fileName: 'failedRepeatableRequests', data: this.state.failedScrapingObjects })
        await this.createLog({ fileName: 'allErrors', data: this.referenceToRoot.getErrors() })
    }


    /**
     * 
     * @param {Object} obj 
     * @param {string} obj.fileName
     * @param {ScrapingObject | ScrapingObject[]} obj.data
     */
    async createLog(obj) {
        await this.saveFile(obj.data,obj.fileName);
    }



    async repeatAllFailedRequests(numCycles = 1) {
        let cycleCounter = 0;

        while (cycleCounter < numCycles) {
            // debugger;
            if (this.areThereRepeatableErrors()) {
                await this.repeatErrors();

                cycleCounter++;

                await this.createLogs();

            } else {
                console.log('No repeatable errors');
                break;
            }
        }

    }


    async repeatErrors() {
        // debugger;
        // console.log('Beginning a cycle of repetition');
        this.state.repetitionCycles++
        console.log('Repetition cycle number:', this.state.repetitionCycles);
        console.log('Number of failed objects before repetition cycle:', this.state.failedScrapingObjects.length)

        await Promise.all(
            this.state.failedScrapingObjects.map(async (failedObject) => {
                const operationContext = failedObject.referenceToOperationObject();
                await operationContext.processOneScrapingObject(failedObject);
                if (failedObject.successful == true) {
                    delete failedObject.error;
                    this.state.failedScrapingObjects.splice(this.state.failedScrapingObjects.indexOf(failedObject), 1);
                }

            })
        )

        console.log('One cycle of error repetition is done!')
    }




}



module.exports = Scraper;
// debugger;



