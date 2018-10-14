
const Promise = require('bluebird');
const { Qyu } = require('qyu');
const fs = require('fs');
const path = require('path');

// const Root = require('./operations/Root');



//*********************** */
let scraperInstance;//Will hold a reference to the Scraper object.


class Scraper {
    constructor(globalConfig) {

        this.config = {
            cloneImages: true,//If an image with the same name exists, a new file with a number appended to it is created. Otherwise. it's overwritten.
            removeStyleAndScriptTags:true,
            fileFlag: 'w',//The flag provided to the file saving function. 
            concurrency: 3,//Maximum concurrent requests.
            maxRetries: 5,//Maximum number of retries of a failed request.
            imageResponseType: 'arraybuffer',//Either 'stream' or 'arraybuffer'
            startUrl: '',
            baseSiteUrl: '',
            delay: 100,
            timeout: 5000,
            filePath: null,//Needs to be provided only if an image operation is created.
            auth: null,
            headers: null,         
        }

        this.state = {
            existingUserFileDirectories: [],
            failedScrapingObjects: [],
            downloadedImages: 0,
            currentlyRunning: 0,
            registeredOperations: [],//Holds a reference to each created operation.
            numRequests: 0,
            repetitionCycles:0,
            scrapingObjects: []//for debugging
        }



        this.validateGlobalConfig(globalConfig);

        for (let prop in globalConfig) {
            this.config[prop] = globalConfig[prop];
        }

        this.config.fakeErrors = false;
        this.config.errorCodesToSkip = [404,403,400];     
        this.config.useQyu = true;
        this.config.mockImages = false;
        this.qyu = new Qyu({ concurrency: this.config.concurrency })//Creates an instance of the task-qyu for the requests.
        this.requestSpacer = Promise.resolve();
        if (scraperInstance)
            throw 'Scraper can have only one instance.'
        scraperInstance = this;
        this.referenceToRoot=null;

    }

    static getScraperInstance() {

        return scraperInstance;
    }


    validateGlobalConfig(conf) {
        if (!conf || typeof conf !== 'object')
            throw 'Scraper constructor expects a configuration object';
        if (!conf.baseSiteUrl || !conf.startUrl)
            throw 'Please provide both baseSiteUrl and startUrl';
    }

    verifyDirectoryExists(path) {//Will make sure the target directory exists.
        if (!this.state.existingUserFileDirectories.includes(path)) {
            console.log('checking if dir exists:', path)
            if (!fs.existsSync(path)) {//Will run ONLY ONCE, so no worries about blocking the main thread.
                console.log('creating dir:', path)
                fs.mkdirSync(path);
            }
            this.state.existingUserFileDirectories.push(path);
        }

    }

    async scrape(rootObject) {//This function will begin the entire scraping process. Expects a reference to the root operation.
        if (rootObject.constructor.name !== 'Root' || !rootObject)
            throw 'Scraper.scrape() expects a root object as an argument!';

        this.referenceToRoot = rootObject;
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
        console.log('overall images: ', this.state.downloadedImages)


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


    saveFile(obj) {
        this.verifyDirectoryExists(this.config.logPath);
        return new Promise((resolve, reject) => {
            console.log('saving file')
            fs.writeFile(path.join(this.config.logPath, `${obj.fileName}.json`), JSON.stringify(obj.data), (error) => {
                if (error) {
                    reject(error)
                } else {
                    console.log(`Log file ${obj.fileName} saved`);
                    resolve();
                }

            });

        })

    }

    async createLogs() {
        // debugger;
        for (let operation of this.state.registeredOperations) {
            const fileName = operation.constructor.name === 'Root' ? 'log' : operation.name;
            const data = operation.getData();
            await this.createLog({ fileName, data })
        }
        await this.createLog({ fileName: 'failedRepeatableRequests', data: this.state.failedScrapingObjects })
        await this.createLog({ fileName: 'allErrors', data: this.referenceToRoot.getErrors() })
    }


    async createLog(obj) {
        await this.saveFile(obj);
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
        console.log('Repetition cycle number:',this.state.repetitionCycles);
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

















// const init = {
//     type: 'root',
//     config: {
//         baseSiteUrl: `https://www.profesia.sk`,
//         startUrl: `https://www.profesia.sk/praca/`
//     },
//     children: [
//         {
//             type: 'page',
//             config: { querySelector: '.list-row a.title', name: 'link' },
//             children: [
//                 {
//                     type: 'image',
//                     config: { querySelector: 'img', name: 'image' }
//                 }
//             ]

//         }

//     ]
// }





// function createObjectsFromTree(object) {
//     let Class = getClassMap()[object.type];
//     const instance = new Class(object.config || {});

//     if (object.children && object.children.length > 0) {
//         object.children.forEach((child) => {
//             console.log('child object');
//             instance.addSelector(createObjectsFromTree(child));
//         })
//     }

//     return instance

// }

// if (this.pagination && this.pagination.nextButton) {
//     var paginationSelectors = [];
//     for (let i = 0; i < this.pagination.numPages; i++) {
//         const paginationSelector = this.state.createSelector('page', this.pagination.nextButton);
//         paginationSelector.operations = this.operations;
//         paginationSelectors.push(paginationSelector);
//     }
//     // for(let paginationSelector of paginationSelectors){
//     //    this.addSelector(paginationSelector);  
//     // }
//     paginationSelectors.map(paginationSelector => this.operations = [...this.operations, paginationSelector])

// }



// module.exports = {
//     Scraper,
//     Root,
//     DownloadContent,
//     Inquiry,
//     OpenLinks,
//     CollectContent
// };


module.exports = Scraper;
// debugger;



