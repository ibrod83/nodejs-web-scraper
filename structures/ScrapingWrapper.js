/**
 * Holds the data of the scraping operation, in its current usage cycle(in case the same Operation object is reused more than once)
 */
class ScrapingWrapper{

    /**
     * 
     * @param {string} type 
     * @param {string} name 
     * @param {string} address 
     */
    constructor(type,name,address) {
        this._identifier= 'ScrapingWrapper'
        this.type = type;
        this.name = name;
        this.address = address;
        this.data = [];
       
    }
}

module.exports = ScrapingWrapper