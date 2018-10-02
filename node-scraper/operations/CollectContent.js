const Operation = require('./Operation')
var cheerio = require('cheerio');
var cheerioAdv = require('cheerio-advanced-selectors')
cheerio = cheerioAdv.wrap(cheerio)


class CollectContent extends Operation {

    constructor(querySelector, config) {
        super(config);
        this.querySelector = querySelector;
        this.validateOperationArguments();

    }

    async scrape(responseObjectFromParent) {
        // this.emit('scrape')
        this.contentType = this.contentType || 'text';
        !responseObjectFromParent && console.log('empty reponse from content operation', responseObjectFromParent)
        const currentWrapper = {//The envelope of all scraping objects, created by this operation. Relevant when the operation is used as a child, in more than one place.
            type: 'Collect Content',
            name: this.name,
            address: responseObjectFromParent.config.url,
            data: []
        }

        var $ = cheerio.load(responseObjectFromParent.data);
        const elementList = this.createElementList($);


        elementList.forEach(( element) => {
            
            // console.log('element',element)
            const content = this.getNodeContent(element);
            
            currentWrapper.data.push({ element: element.name, [this.contentType]: content });
        })
        $ = null;

        if (this.afterScrape) {
            await this.afterScrape(this.createPresentableData(currentWrapper));
        }



        // this.overallCollectedData.push(this.currentlyScrapedData);
        this.data = [...this.data, currentWrapper];

        return this.createMinimalData(currentWrapper);

       

    }

    getNodeContent(elem) {
        switch (this.contentType) {
            case 'text':
                return elem.text();
            case 'html':
                return elem.html();
            default:
                return elem.text();

        }
    }





}

module.exports = CollectContent;