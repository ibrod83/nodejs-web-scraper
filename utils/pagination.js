/**
     * 
     * @param {string} address 
     * @param {Object} config
     * @return {string[]}
     */
function getPaginationUrls(address, { numPages, begin, end, offset = 1, queryString, routingString }) {
    const firstPage = typeof begin !== 'undefined' ? begin : 1;
    const lastPage = end || numPages;
    const paginationUrls = []
    for (let i = firstPage; i <= lastPage; i = i + offset) {

        const mark = address.includes('?') ? '&' : '?';
        var paginationUrl;

        if (queryString) {
            paginationUrl = `${address}${mark}${queryString}=${i}`;
        } else {
            paginationUrl = `${address}/${routingString}/${i}`.replace(/([^:]\/)\/+/g, "$1");
        }
        paginationUrls.push(paginationUrl)

    }

    return paginationUrls;
}

module.exports = {
    getPaginationUrls
}