const Operation = require('./Operation')

class Inquiry extends Operation {

    constructor(conditionFunction) {
        super({});
        this.condition = conditionFunction;
        // debugger;
        this.validateOperationArguments();
    }

    async scrape(responseObjectFromParent) {

        const currentWrapper = {//The envelope of all scraping objects, created by this operation. Relevant when the operation is used as a child, in more than one place.
            type: 'Inquiry',
            name: this.name,
            address: responseObjectFromParent.config.url,
            data: {
                meetsCondition: false
            }
        }

        if (await this.condition(responseObjectFromParent) === true) {
            currentWrapper.data['meetsCondition'] = true;
        }

        

        this.data = [...this.data, currentWrapper];

        return this.createMinimalData(currentWrapper);

    }

}

module.exports = Inquiry;