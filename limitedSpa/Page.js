const PuppeteerSimple = require('puppeteer-simple').default;//For intellisense

class Page {
    /**
     * 
     * @param {PuppeteerSimple} puppeteerSimple 
     * @param {string} url 
     * @param {object} config 
     */
    constructor(puppeteerSimple, url, config = {}) {
        this.puppeteerSimple = puppeteerSimple;//PuppeteerSimple instance.
        this.url = url;
        this.puppeteerSimplePage = null;//The PuppeteerSimple PAGE instance
        this.operations = [];
        this.html = null;
        this.respone = null;//
    }

    addOperation(operation) {
        this.operations.push(operation)
    }

    /**
     * Perform all operations on the page
     */
    
    async scrape() {
        try {
            // process.exit('yoyoyoyoyo')
            var puppeteerSimplePage = await this.puppeteerSimple.createPage(this.url);
            this.puppeteerSimplePage = puppeteerSimplePage;
            const response = await puppeteerSimplePage.navigate();
            if(response._status >= 400){
                const error = new CustomError({code:response._status,message:'Error opening page',errno:null,response})
                throw error;
            }
            this.response = response;
            await this.scrapeChildren(this.puppeteerSimplePage);
            // const html = await puppeteerSimplePage.getHtml();
            // if (!html) {
            //     debugger
            //     console.log('no html from SPA_page');
            //     process.exit()
    
            // }
            // this.html = html;
        } catch (error) {
            // debugger;
            throw error;
        }

        // return data;
    }

    async scrapeChildren(puppeteerSimplePage) {
        for (let operation of this.operations) {
            // debugger;
            await operation.scrape(puppeteerSimplePage);
        }
    }

    
    getResponse(){
        const {_status,_statusText,_headers,_url} =  this.response;
        // debugger;
        return {
            status:_status,
            statusText:_statusText,
            url:_url,
            headers:_headers
        }
    }

    async getHtml() {
        const html = await this.puppeteerSimplePage.getHtml();
        this.html = html;
        // if(!this.html){
        //     debugger;
        // }
        // return this.html;
        return html;
    }

    async close() {
        try {
          await this.puppeteerSimplePage.close()  
        } catch (error) {
            // process.kill()
            // debugger;
            throw error;
        }
        
    }


}

class CustomError extends Error {
    // debugger;
    constructor({ code, response, message, errno }) {
        super(message)
        // this.config = config;//The config object of the failing request
        this.errno = errno//Error constant. Will be set Only in the case of network errors.
        this.code = code;//http code.Null if network error
        this.response = response//Reference to the customResponse. Will not be set in network errors.
    }
}

module.exports = Page;