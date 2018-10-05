const Operation = require('./Operation')

class Inquiry extends Operation {

    constructor(conditionFunction) {
        super({});
        this.condition = conditionFunction;
        this.validateOperationArguments();
    }

    async scrape(responseObjectFromParent) {
        const currentWrapper = this.createWrapper(responseObjectFromParent.config.url);

        let meetsCondition;

        if (await this.condition(responseObjectFromParent) === true)
            meetsCondition = true;
        else
            meetsCondition = false;

        currentWrapper.data = { meetsCondition}

        if (this.afterScrape) {
            await this.afterScrape(currentWrapper);
        }



        this.data = [...this.data, currentWrapper];

        return this.createMinimalData(currentWrapper);

    }

}

module.exports = Inquiry;