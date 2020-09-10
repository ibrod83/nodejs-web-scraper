const HttpOperation = require('./HttpOperation');
const ScrapingAction = require('../structures/ScrapingAction')
const CompositeMixin = require('./mixins/CompositeMixin');
// const PageMixin = require('./mixins/PageMixin');
const PageHelper = require('./helpers/PageHelper')
const ScrapingWrapper = require('../structures/ScrapingWrapper');

// const CompositeHelper = require('./helpers/CompositeHelper')
// const { createScrapingActionsForPagination } = require('../utils/pagination.js')

/**
 * //Methods are added after class declaration.
 * @mixes CompositeMixin
 */
class Root extends HttpOperation {//Fetches the initial page, and starts the scraping process.

    /**
     *     
     * @param {Object} [config]    
     * @param {Object} [config.pagination = null] Look at the pagination API for more details.      
     * @param {Function} [config.getElementList = null] Receives an elementList array    
     * @param {Function} [config.getPageData = null] 
     * @param {Function} [config.getAllPagesData = null] 
     * @param {Function} [config.getPageResponse = null] Receives an axiosResponse object
     * @param {Function} [config.getPageHtml = null] Receives htmlString and pageAddress
     * @param {Function} [config.getException = null] Listens to every exception. Receives the Error object. 

     */
    constructor(config) {
        super(config)
        this.operations = [];//References to child operation objects.
        this.pageHelper = new PageHelper(this);
        // this.compositeHelper = new CompositeHelper(this);
    }

    /**
     * 
     * @param {Operation} Operation 
     */
    addOperation(Operation){
        this._addOperation(Operation);
    }

    async scrape() {

        // if (this.config.pagination) {
        //     var scrapingActions = createScrapingActionsForPagination({
        //         ...this.config.pagination,
        //         address: this.scraper.config.startUrl,                
        //         referenceToOperationObject: this.referenceToOperationObject.bind(this)
        //     })
        //     this.data = [...scrapingActions]
        //     this.scraper.state.scrapingActions.push([...scrapingActions])
        //     // debugger;
        //     return await this.executeScrapingActions(scrapingActions,(scrapingAction)=>{
        //         return this.processOneScrapingAction(scrapingAction)
        //     }, '3');
        // }

        // const scrapingAction = this.createScrapingAction(this.scraper.config.startUrl, this.pagination && 'pagination')
        const scrapingAction = new ScrapingAction(this.scraper.config.startUrl, this.config.pagination && 'pagination', this.referenceToOperationObject.bind(this))
        
        this.scraper.state.scrapingActions.push(scrapingAction)

        // await this.processOneScrapingAction(scrapingAction);
        await this.pageHelper.processOneScrapingAction(scrapingAction);
        
        this.data.push(scrapingAction);
        const scrapingWrapper  = new ScrapingWrapper({type:'Root',name:this.config.name,address:this.scraper.config.startUrl,data:[scrapingAction]})
        return scrapingWrapper;

    }

    getErrors() {//Will get the errors from all registered operations.
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
// Object.assign(Root.prototype, PageMixin)

module.exports = Root;