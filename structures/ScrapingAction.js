class ScrapingAction {

    /**
     * Holds the data for an ITERATION of any Operation.scrape(). Can be repeated later on.
     * @param {string} address 
     * @param {string} type 
     * @param {Function} operationObjectReferenceGetter 
     */
    constructor(address, type, operationObjectReferenceGetter) {
        this._identifier = 'ScrapingAction'
        this.address = address//The image href            
        this.referenceToOperationObject = operationObjectReferenceGetter
        this.successful = false
        this.data = []
        this.error = null;
        this.errorCode = null;

        // if (type)
        this.type = type;

    }

    // getCleanData(){
    //     return {
    //         address:this.address,
    //         successful: this.successful,
    //         data:this.data,            
            
    //     }
    // }

    /**
     * 
     * @param {string} errorString 
     * @param {number} errorCode 
     */
    setError(errorString, errorCode) {
        this.error = errorString;
        this.errorCode = errorCode;
    }

    // async processSelf(func){
    //     await func();
    // }

}

module.exports = ScrapingAction;