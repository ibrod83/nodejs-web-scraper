
/**
 * 
 * @param {string} base 
 * @param {string} relative 
 * @return {string} newUrl
 */
function getAbsoluteUrl(base, relative) {//Handles the absolute URL.

    const newUrl = new URL(relative, base).toString();
    return newUrl;
}

/**
 * 
 * @param {string} url
 * @return {boolean} 
 */
function isDataUrl(url) {
    if (!url || !url.startsWith("data:image"))
        return false

    return true;
}

/**
 * 
 * @param {string} dataurl 
 * @return {string}
 */
function getDataUrlExtension(dataurl) {
    return dataurl.split('/')[1].split(';')[0]
}

module.exports = {
    getAbsoluteUrl,
    isDataUrl,
    getDataUrlExtension
}