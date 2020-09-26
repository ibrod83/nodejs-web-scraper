
// const Promise = require('bluebird');
const { Qyu } = require('qyu');
const fs = require('fs');
const path = require('path');
const {verifyDirectoryExists} = require('./utils/files')
const {Root} = require('./');//For jsdoc
// const PathQueue = require('./utils/PathQueue');



class Scraper {

    /**
     * 
     * @param {Object} globalConfig 
     * @param {string} globalConfig.startUrl 
     * @param {string} globalConfig.baseSiteUrl 
     * @param {boolean} [globalConfig.cloneFiles = true ]
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
            cloneFiles: true,//If an image with the same name exists, a new file with a number appended to it is created. Otherwise. it's overwritten.
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
            failedScrapingIterations: [],
            downloadedFiles: 0,
            currentlyRunning: 0,
            registeredOperations: [],//Holds a reference to each created operation.
            numRequests: 0,
            repetitionCycles: 0,
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
        // this.pathQueue = new PathQueue();
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
     * Starts the recursive scraping process
     * @param {Root} rootObject 
     * @return {Promise<void>}
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
            console.error('Number of requests that failed, in their last attempt: ', this.state.failedScrapingIterations.length);
        } else {
            console.log('All done, no final errors');
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


    /**
     * @return {boolean}
     */
    areThereRepeatableErrors() {
        // debugger;
        return this.state.failedScrapingIterations.length > 0;
    }

    /**
     * 
     * @param {string} errorString 
     * @return {void}
     */
    reportFailedScrapingAction(errorString){
        this.state.failedScrapingIterations.push(errorString);
    }


    /**
     * 
     * @param {Object} data 
     * @param {string} fileName  
     * @return {Promise<void>}  
     */
    saveFile(data,fileName) {
        // verifyDirectoryExists(this.config.logPath);
        return new Promise(async (resolve, reject) => {
            await verifyDirectoryExists(this.config.logPath);

            console.log('saving file')
            // debugger;
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

    /**
     * @return {Promise<void>}
     */
    async createLogs() {
        // debugger;
        for (let operation of this.state.registeredOperations) {
            const fileName = operation.constructor.name === 'Root' ? 'log' : operation.config.name;
            const data = operation.getData();
            await this.createLog({ fileName, data })
        }
        await this.createLog({ fileName: 'finalErrors', data: this.state.failedScrapingIterations })
        // await this.createLog({ fileName: 'allErrors', data: this.referenceToRoot.getErrors() })
    }


    /**
     * 
     * @param {Object} obj 
     * @param {string} obj.fileName
     * @param {ScrapingAction | ScrapingAction[]} obj.data    
     */
    async createLog(obj) {
        await this.saveFile(obj.data,obj.fileName);
    }


}



module.exports = Scraper;
// debugger;



