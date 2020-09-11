class ScrapingAction {

    /**
     * Holds the data for an ITERATION of any Operation.scrape(). Can be repeated later on.
     * @param {Object} [params] 
     * @param {string} [params.address] 
     * @param {string} [params.type] 
     * @param {string} [params.parentAddress] 
     * @param {Function} operationObjectReferenceGetter
     */
    constructor({ address, type, parentAddress }, operationObjectReferenceGetter) {
        this._identifier = 'ScrapingAction'
        this.address = address
        this.parentAddress = parentAddress
        this.referenceToOperationObject = operationObjectReferenceGetter
        this.successful = false
        this.data = []
        this.error = undefined;
        this.errorCode = undefined;

        // if (type)
        this.type = type;

    }

    getData(){
        return this.data;
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