const { Qyu } = require('qyu');
/**
     * 
     * @param {Array} itterable 
     * @param {Function} promiseFunction 
     * @param {number} concurrency 
     */
async function mapPromisesWithLimitation(itterable, promiseFunction, concurrency) {//Will execute scraping objects with concurrency limitation.

    const q = new Qyu({ concurrency })

    await q(itterable, promiseFunction,concurrency)

}

module.exports = {
    mapPromisesWithLimitation
}