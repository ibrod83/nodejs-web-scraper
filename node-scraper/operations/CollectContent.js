const Operation = require('./Operation')
var cheerio = require('cheerio');
var cheerioAdv = require('cheerio-advanced-selectors')
cheerio = cheerioAdv.wrap(cheerio)
const YoyoTrait = require('../YoyoTrait');


class CollectContent extends Operation {

    constructor(querySelector, config) {
        super(config);
        debugger;
        // this.useTrait(YoyoTrait);
        // // debugger;
        // this.chuj('heyyyyy');
        this.querySelector = querySelector;
        this.validateOperationArguments();
        if(typeof this.shouldTrim !== 'undefined' ){//Checks if the user passed a "shouldTrim" property.
            this.shouldTrim = this.shouldTrim;
        }else{
            this.shouldTrim = true;
        }
     
        

       

    }

    async scrape(responseObjectFromParent) {

        const currentWrapper = this.createWrapper(responseObjectFromParent.config.url);

        this.contentType = this.contentType || 'text';
        !responseObjectFromParent && console.log('empty reponse from content operation', responseObjectFromParent)

        var $ = cheerio.load(responseObjectFromParent.data);
        const elementList = this.createElementList($);


        elementList.forEach((element) => {
            const content = this.getNodeContent(element);

            currentWrapper.data.push({ element: element.name, [this.contentType]: content });
        })
        $ = null;

        if (this.afterScrape) {
            await this.afterScrape(currentWrapper);
        }



        // this.overallCollectedData.push(this.currentlyScrapedData);
        this.data = [...this.data, currentWrapper];

        return this.createMinimalData(currentWrapper);



    }

    getNodeContent(elem) {
        const getText = () => this.shouldTrim  ? elem.text().trim() : elem.text();//Will trim the string, if "shouldTrim" is true.
        switch (this.contentType) {
            case 'text':
                return getText();
            case 'html':
                return elem.html();
            default:
                return getText();;

        }
    }





}

module.exports = CollectContent;