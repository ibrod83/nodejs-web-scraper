


var Input = require('prompt-input');
var sizeof = require('object-sizeof');
const Promise = require('bluebird');
const { Qyu } = require('qyu');
const fs = require('fs');
const path = require('path');
// const Root = require('./operations/Root');



//*********************** */
let _scraperInstance;


class Scraper {
    constructor(globalConfig) {

        this.config = {
            cloneImages: true,//If an image with the same name exists, a new file with a number appended to it is created. Otherwise. it's overwritten.
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
            headers: null
        }

        this.validateGlobalConfig(globalConfig);

        for (let prop in globalConfig) {

            this.config[prop] = globalConfig[prop];
        }
        this.existingUserFileDirectories = [];
        this.failedScrapingObjects = [];
        this.fakeErrors = false;
        this.useQyu = true;
        this.mockImages = false;
        this.downloadedImages = 0;
        this.currentlyRunning=0;
        this.registeredOperations = []//Holds a reference to each created operation.
        this.numRequests = 0;
        this.scrapingObjects = []//for debugging    

        this.qyu = new Qyu({ concurrency: this.config.concurrency })//Creates an instance of the task-qyu for the requests.
        this.requestSpacer = Promise.resolve();
        _scraperInstance = this;

    }

    static getInstance() {

        return _scraperInstance;
    }

    validateGlobalConfig(conf) {
        if (!conf || typeof conf !== 'object')
            throw 'Scraper constructor expects a configuration object';
        if (!conf.baseSiteUrl || !conf.startUrl)
            throw 'Please provide both baseSiteUrl and startUrl';
    }

    verifyDirectoryExists(path) {//Will make sure the target directory exists.
        if (!this.existingUserFileDirectories.includes(path)) {
            console.log('checking if dir exists:', path)
            if (!fs.existsSync(path)) {//Will run ONLY ONCE, so no worries about blocking the main thread.
                console.log('creating dir:', path)
                fs.mkdirSync(path);
            }
            this.existingUserFileDirectories.push(path);
        }

    }

    async scrape(rootObject) {//This function will begin the entire scraping process. Expects a reference to the root operation.
        // debugger;
        if (rootObject.constructor.name !== 'Root'  || !rootObject)
            throw 'Scraper.scrape() expects a root object as an argument!';

        await rootObject.scrape();
        if (this.config.logPath) {
            try {
                await this.createLogs();
            } catch (error) {
                console.error('Error creating logs', error)
            }
        }

        console.log('overall images: ', this.downloadedImages)
        await this.repeatAllErrors(rootObject);
    }

 
    handleNewOperationCreation(Operation) {
        this.registeredOperations.push(Operation);
    }

    saveFile(obj) {
        this.verifyDirectoryExists(this.config.logPath);
        // debugger;
        return new Promise((resolve, reject) => {
            console.log('saving file')
            fs.writeFile(path.join(this.config.logPath,`${obj.fileName}.json`), JSON.stringify(obj.data), (error) => {
                // reject('chuj ci w dupe')
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
        for (let operation of this.registeredOperations) {
            const fileName = operation.constructor.name === 'Root' ? 'log' : operation.name;
            const data = operation.getData();
            await this.createLog({ fileName, data })
        }
        await this.createLog({ fileName: 'failedObjects', data: this.failedScrapingObjects })
    }


    async createLog(obj) {
        await this.saveFile(obj);
    }

    


    async repeatAllErrors(referenceToRootOperation) {
        while (true) {
            if (this.failedScrapingObjects.length) {

                const repeat = await this.repeatErrors();
                if (repeat === 'done')
                    return;
                var entireTree = referenceToRootOperation.getData();

                await this.createLog({ fileName: 'log', data: entireTree })
                await this.createLog({ fileName: 'failedObjects', data: this.failedScrapingObjects })

            } else {
                return
            }

        }

    }

    async repeatErrors() {
        var input = new Input({
            name: 'shouldScraperRepeat',
            message: 'Would you like to retry the failed operations? Type "y" for yes, any other key for no.'
        });

        // this.fakeErrors = false;
        let counter = 0
        // const failedImages = this.failedScrapingObjects.filter((object) => { return !object.data })
        console.log('number of failed objects:', this.failedScrapingObjects.length)
        const shouldScraperRepeat = await input.run();
        console.log(shouldScraperRepeat);
        if (shouldScraperRepeat !== 'y' && shouldScraperRepeat !== 'Y')
            return 'done';
        await Promise.all(
            this.failedScrapingObjects.map(async (failedObject) => {
                counter++
                console.log('failed object counter:', counter)
                console.log('failed object', failedObject)
                const operationContext = failedObject.referenceToOperationObject();

                await operationContext.processOneScrapingObject(failedObject);
                console.log('failed object after repetition', failedObject);
                if (failedObject.successful == true) {
                    delete failedObject.error;
                    this.failedScrapingObjects.splice(this.failedScrapingObjects.indexOf(failedObject), 1);
                }

            })
        )

        console.log('done repeating objects!')
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
//         const paginationSelector = this.scraper.createSelector('page', this.pagination.nextButton);
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



