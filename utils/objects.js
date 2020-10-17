
/**
 * To prevent dictionary key-collision, get a number-appended key. Returns a higher order function, to preserve original key.
 * @param {string} originalKey 
 */
function getDictionaryKey(originalKey) {
    const func = (keyName, dictionary, counter = 1) => {

        if (!dictionary[keyName]) {
            // console.log('new file name', newFileName)
            return keyName;
        }

        counter = counter + 1;
        let newKeyName = originalKey + counter;

        return func(newKeyName, dictionary, counter);

    }

    return func;

}

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

/**
 * 
 * @param {Object} originalObject 
 * @param {Object} secondaryObject 
 * @return {void}
 */
function deepSpread(originalObject,secondaryObject){
    // debugger
    if(!originalObject)
        originalObject = {}

    for(let prop in secondaryObject){
        if(typeof secondaryObject[prop] === 'object' && !Array.isArray(secondaryObject[prop])){
            // debugger;
            deepSpread(originalObject[prop],secondaryObject[prop]); 
        }else{
          originalObject[prop] = secondaryObject[prop]  
        }
        
    }
}

module.exports = {
    getDictionaryKey,
    deepSpread
}