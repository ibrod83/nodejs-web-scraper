const { Qyu } = require('qyu');
/**
     * 
     * @param {itterable[]} scrapingObjects 
     * @param {Function} overwriteConcurrency 
     * @param {number} concurrency 
     */
async function mapPromisesWithLimitation(itterable, promiseFunction, concurrency) {//Will execute scraping objects with concurrency limitation.

    const q = new Qyu({ concurrency })

    await q(itterable, promiseFunction,concurrency)

}

module.exports = {
    mapPromisesWithLimitation
}