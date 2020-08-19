class ScrapingObject {//Creates a scraping object, for all operations.
    
    /**
     * 
     * @param {string} address 
     * @param {string} type 
     * @param {Function} operationObjectReferenceGetter 
     */
    constructor(address, type, operationObjectReferenceGetter) {

        this.address = address,//The image href            
            this.referenceToOperationObject = operationObjectReferenceGetter,
            this.successful = false,
            this.data = []

        if (type)
            this.type = type;

    }

}

module.exports = ScrapingObject;