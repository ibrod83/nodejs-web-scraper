class ScrapingObject {

    /**
     * Holds the data for any http operation. Can be repeated later on.
     * @param {string} address 
     * @param {string} type 
     * @param {Function} operationObjectReferenceGetter 
     */
    constructor(address, type, operationObjectReferenceGetter) {
        this._identifier= 'ScrapingObject'
        this.address = address//The image href            
        this.referenceToOperationObject = operationObjectReferenceGetter
        this.successful = false
        this.data = []
        this.error = null;
        this.errorCode = null;

        if (type)
            this.type = type;

    }

    /**
     * 
     * @param {string} errorString 
     * @param {number} errorCode 
     */
    setError(errorString,errorCode) {
        this.error = errorString;
        this.errorCode = errorCode;
    }

    // async processSelf(func){
    //     await func();
    // }

}

module.exports = ScrapingObject;