const HttpOperation = require('./HttpOperation');
const CompositeMixin = require('./mixins/CompositeMixin');
const PageHelper = require('./helpers/PageHelper')


/**
 * //Methods are added after class declaration.
 * @mixes CompositeMixin
 */
class Root extends HttpOperation {//Fetches the initial page, and starts the scraping process.

    /**
     *     
     * @param {Object} [config]    
     * @param {Object} [config.pagination = null] Look at the pagination API for more details.      
     * @param {Function} [config.getPageData = null] 
     * @param {Function} [config.getPageObject = null] Receives a dictionary of children, and an _address
     * @param {Function} [config.getPageResponse = null] Receives an axiosResponse object
     * @param {Function} [config.getPageHtml = null] Receives htmlString and pageAddress
     * @param {Function} [config.getException = null] Listens to every exception. Receives the Error object. 

     */
    constructor(config) {
        super(config)
        this.operations = [];//References to child operation objects.
        this.pageHelper = new PageHelper(this);
    }

    /**
     * 
     * @param {Operation} Operation 
     */
    addOperation(Operation) {
        this._addOperation(Operation);
    }

   

    /**
     * @return {Promise<void>}
     */
    async scrape() {

        const shouldPaginate = this.config.pagination ? true : false;

        const data =  await this.pageHelper.processOneIteration(this.scraper.config.startUrl,shouldPaginate);
       
        // debugger;
        this.data = data
        if(this.config.getPageData){
            await this.config.getPageData(data)
        }

    }

    /**
     * Will get the errors from all registered operations.
     * @return {string[]}
     */
    getErrors() {
        // debugger;
        let errors = [...this.errors];

        this.scraper.state.registeredOperations.forEach((operation) => {
            if (operation.constructor.name !== 'Root')
                errors = [...errors, ...operation.getErrors()]
        })
        return errors;
    }

    validateOperationArguments() {
        // return;
    }

 


}

Object.assign(Root.prototype, CompositeMixin)

module.exports = Root;