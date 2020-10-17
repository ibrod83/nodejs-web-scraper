
const { Qyu } = require('qyu');
const fs = require('fs');
const path = require('path');
const { verifyDirectoryExists } = require('./utils/files')
const { deepSpread } = require('./utils/objects')
const { Root } = require('./');//For jsdoc
// const PathQueue = require('./utils/PathQueue');
const PuppeteerSimple = require('puppeteer-simple').default



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
     * @param {Object} [globalConfig.proxy = null] 
     * @param {boolean} [globalConfig.usePuppeteer = false] 
     * @param {object} [globalConfig.puppeteerConfig]
     * @param {boolean} [globalConfig.puppeteerConfig.headless = false] 
     * @param {number} [globalConfig.puppeteerConfig.timeout = 40000] 
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
            usePuppeteer: false,
            puppeteerDebugMode: false,//For debugging
            puppeteerConfig: {
                headless: false,
                timeout: 40000,//40 seconds for full page load(network idle)
                waitUntil: 'networkidle0'
            }
        }
        // this.state = new State();
        this.state = {
            // existingUserFileDirectories: [],
            failedScrapingIterations: [],
            downloadedFiles: 0,
            currentlyRunning: 0,
            registeredOperations: [],//Holds a reference to each created operation.
            numRequests: 0,
            repetitionCycles: 0,
        }



        this.validateGlobalConfig(globalConfig);
        deepSpread(this.config,globalConfig)
        
        // debugger;
        this.config.errorCodesToSkip = [404, 403, 400];

        this.qyu = new Qyu({ concurrency: this.config.concurrency })//Creates an instance of the task-qyu for the requests.
        this.requestSpacer = Promise.resolve();
        // debugger;
        if (this.config.usePuppeteer) {
            // debugger;
            const puppeteerConfig = this.config.puppeteerConfig;
            const { headless, } = puppeteerConfig;
            this.puppeteerSimple = new PuppeteerSimple({ headless})
            this.isBrowserReady = this.puppeteerSimple.createBrowser();
        }




        // this.pathQueue = new PathQueue();
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

    getPuppeteerSimpleInstance() {
        return this.puppeteerSimple;
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
        // rootObject.injectScraper(this)
        // debugger;
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
        // this.outPutErrors();
        if (this.config.logPath) {
            try {
                await this.createLogs();
            } catch (error) {
                this.log('Error creating logs', error)
            }
        }
        // this.log('global.counter of alternative src ',global.counter)
        this.log(`overall files:  ${this.state.downloadedFiles}`)

        if (this.config.usePuppeteer) {
            // setTimeout(()=>{
            if (!this.config.puppeteerDebugMode) {
                try {
                  await this.puppeteerSimple.close()  
                } catch (error) {
                    this.log('Error shutting down puppeteer',error)
                }
                
            }

            // },1000)

        }


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
    reportFailedScrapingAction(errorString) {
        this.state.failedScrapingIterations.push(errorString);
    }


    /**
     * 
     * @param {Object} data 
     * @param {string} fileName  
     * @return {Promise<void>}  
     */
    saveFile(data, fileName) {
        // verifyDirectoryExists(this.config.logPath);
        return new Promise(async (resolve, reject) => {
            await verifyDirectoryExists(this.config.logPath);

            // this.log('saving file')
            // debugger;
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
        await this.saveFile(obj.data, obj.fileName);
    }

    log(message) {
        if (this.config.showConsoleLogs) {
            console.log(message);
        }
    }


}



module.exports = Scraper;
// debugger;



