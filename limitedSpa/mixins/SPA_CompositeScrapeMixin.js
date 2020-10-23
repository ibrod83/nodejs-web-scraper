
/**
 * Used by composite operations(operations that contain other operations)
 * @mixin
 */
const SPA_CompositeScrapeMixin = {

   
  
  
    scrapeChildren:async function(puppeteerSimplePage) {
        // debugger;
        const { url } = puppeteerSimplePage
        const html = await puppeteerSimplePage.getHtml()
        const scrapedData = []
        for (let operation of this.operations) {
            const dataFromChild = await operation.scrape({ html, url }, puppeteerSimplePage);

            scrapedData.push(dataFromChild);
        }

        return scrapedData;

    },

    scrape:async function({ html, url }, puppeteerSimplePage) {

        const iterations = []
        const { numRepetitions, scrapeChildrenAfterNumRepetitions } = this.config;
        for (let i = 1; i <= numRepetitions; i++) {

            const div = i / scrapeChildrenAfterNumRepetitions//A whole number means this itteration should also scrape children.

            const scrapeChildren = Number.isInteger(div);

            const dataFromIteration = await this.processOneIteration(puppeteerSimplePage, scrapeChildren);

            iterations.push(dataFromIteration);

        }

        this.data.push(...iterations)
        return { type: this.constructor.name, name: this.config.name, data: iterations };
    },

    /**
     * 
     * @param {PuppeteerSimplePage} puppeteerSimplePage 
     * @param {boolean} scrapeChildren 
     * @param {Function} iterationFunc 
     * @return {Promise<array>}
     */
    processOneIteration:async function(puppeteerSimplePage, scrapeChildren) {

        try {
            
            var dataFromChildren = [];
            // await this.performScroll(puppeteerSimplePage);
            await this.iterationFunc(puppeteerSimplePage);
            // debugger;
            if (scrapeChildren && this.operations.length) {
                // counter++
                // console.log('counter', counter)
                dataFromChildren = await this.scrapeChildren(puppeteerSimplePage)
            }


        } catch (error) {
            // debugger;
            const errorString = `There was an error scrolling down:, ${puppeteerSimplePage.url}, ${error}`
            this.errors.push(errorString);
            this.handleFailedScrapingIteration(errorString);
            if (this.config.getException)
                await this.getException(error)


        } finally {
            return dataFromChildren;
        }



    }
  
  };
  
  
  module.exports = SPA_CompositeScrapeMixin;