
const { Qyu } = require('qyu');
const fs = require('fs');
const path = require('path');
const { verifyDirectoryExists } = require('./utils/files')
const { deepSpread } = require('./utils/objects');

/**
 * @callback errorCallback
 * @param {string} errorString
 */
class Scraper {

    /**
     * 
     * @param {Object} globalConfig 
     * @param {string} globalConfig.startUrl 
     * @param {string} globalConfig.baseSiteUrl 
     * @param {boolean} [globalConfig.showConsoleLogs = true ]
     * @param {boolean} [globalConfig.cloneFiles = true ]
     * @param {boolean} [globalConfig.removeStyleAndScriptTags = true ]     
     * @param {number} [globalConfig.concurrency = 3] 
     * @param {number} [globalConfig.maxRetries = 5]         
     * @param {number} [globalConfig.delay = 200] 
     * @param {number} [globalConfig.timeout = 6000] 
     * @param {string} [globalConfig.filePath= null] 
     * @param {Object} [globalConfig.auth = null] 
     * @param {Object} [globalConfig.headers = {}] 
     * @param {string} [globalConfig.proxy = null] 
     * @param {Agent} [globalConfig.agent = null] 
     * @param {Function} [globalConfig.onError = null]
     */


    constructor(globalConfig) {

        //Default config
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
            headers: {},
            proxy: null,
            showConsoleLogs: true,
            onError: null //callback runs whenever any error occurs during scraping
        }
        this.state = {
            failedScrapingIterations: [],
            downloadedFiles: 0,
            currentlyRunning: 0,
            registeredOperations: [],//Holds a reference to each created operation.
            numRequests: 0,
            repetitionCycles: 0,
        }

        this.validateGlobalConfig(globalConfig);

        deepSpread(this.config,globalConfig)

        if (globalConfig.agent) {
            this.config.agent = globalConfig.agent;
        }        

        this.config.errorCodesToSkip = [404, 403, 400];

        this.qyu = new Qyu({ concurrency: this.config.concurrency })//Creates an instance of the task-qyu for the requests.
        this.requestSpacer = Promise.resolve();

        if (this.config.usePuppeteer) {
            throw new Error('usePuppeteer is deprecated since version 5. If you need it, downgrade to version 4.2.2')
        }

        this.referenceToRoot = null;

    }

    registerOperation(Operation) {
        this.state.registeredOperations.push(Operation)
    }

    destroy() {
        this.log('Scraper.destroy() is deprecated. You can now have multiple instances, without calling this method.')
    }

    async awaitBrowserReady() {
        await this.isBrowserReady;
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

        rootObject.injectScraper(this)

        if (this.config.usePuppeteer) {
            await this.awaitBrowserReady();
        }


        await rootObject.scrape();

        if (this.areThereRepeatableErrors()) {
            this.log(`Number of requests that failed, in their last attempt: ${this.state.failedScrapingIterations.length}`);
        } else {
            this.log('All done, no final errors');
        }
        if (this.config.logPath) {
            try {
                await this.createLogs();
            } catch (error) {
                this.log('Error creating logs', error)
            }
        }
        this.log(`overall files:  ${this.state.downloadedFiles}`)

    }


    /**
     * @return {boolean}
     */
    areThereRepeatableErrors() {
        return this.state.failedScrapingIterations.length > 0;
    }

    /**
     * 
     * @param {string} errorString 
     * @return {void}
     */
    reportFailedScrapingAction(errorString) {
        this.state.failedScrapingIterations.push(errorString);
        if (this.config.onError) this.config.onError(errorString);
    }


    /**
     * 
     * @param {Object} data 
     * @param {string} fileName  
     * @return {Promise<void>}  
     */
    saveFile(data, fileName) {
        return new Promise(async (resolve, reject) => {
            await verifyDirectoryExists(this.config.logPath);

            fs.writeFile(path.join(this.config.logPath, `${fileName}.json`), JSON.stringify(data), (error) => {
                if (error) {
                    reject(error)
                } else {
                    this.log(`Log file ${fileName} saved`);
                    resolve();
                }
            });

        })

    }

    /**
     * @return {Promise<void>}
     */
    async createLogs() {

        for (let operation of this.state.registeredOperations) {
            const fileName = operation.constructor.name === 'Root' ? 'log' : operation.config.name;
            const data = operation.getData();
            await this.createLog({ fileName, data })
        }
        await this.createLog({ fileName: 'finalErrors', data: this.state.failedScrapingIterations })
    }


    /**
     * 
     * @param {Object} obj 
     * @param {string} obj.fileName
     * @param {ScrapingAction | ScrapingAction[]} obj.data    
     */
    async createLog(obj) {
        await this.saveFile(obj.data, obj.fileName);
    }

    log(message) {
        if (this.config.showConsoleLogs) {
            console.log(message);
        }
    }


}



module.exports = Scraper;




