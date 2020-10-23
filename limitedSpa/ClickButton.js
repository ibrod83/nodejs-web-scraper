const Operation = require('../operations/Operation')
const SPA_CompositeScrapeMixin = require('./mixins/SPA_CompositeScrapeMixin')
const CompositeInjectMixin = require('../operations/mixins/CompositeInjectMixin')


/**
 * This operation should be used to click "buttons". It should NOT be used, to click a link, or anything else that causes browser navigation.
 * Unlike other operations that receive a querySelector, this one does not support cheerio(JQuery), but only standart selectors.
 * Also, the selector uses document.querySelector, not document.querySelectorAll(only one item is clicked).
 * @mixes SPA_CompositeScrapeMixin
 * @mixes CompositeInjectMixin
 */
class ClickButton extends Operation {
    constructor(querySelector, config = { }) {
        const defaultConfig = {
            numRepetitions: 1, delay: 0, scrapeChildrenAfterNumRepetitions: 1
        }
        // debugger;
        super({ ...defaultConfig, ...config })
        // debugger;
        this.querySelector = querySelector;
        this.operations = [];
    }

    addOperation(operation) {
        this.operations.push(operation);
    }

    async iterationFunc(puppeteerSimplePage){
        const {  delay } = this.config;
        await puppeteerSimplePage.click(this.querySelector, {  delay });
    }    


    validateOperationArguments() {

    }
}


Object.assign(ClickButton.prototype, SPA_CompositeScrapeMixin)
Object.assign(ClickButton.prototype, CompositeInjectMixin)


module.exports = ClickButton;