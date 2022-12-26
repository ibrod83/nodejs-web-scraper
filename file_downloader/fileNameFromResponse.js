const sanitize = require('sanitize-filename');
const path = require('path');
var mime = require('mime-types')


module.exports = function getFileNameFromResponse(url, headers) {
    const cleanUrl = removeQueryString(url)
    
    const fileNameFromContentDisposition = getFileNameFromContentDisposition(headers['content-disposition'] || headers['Content-Disposition']);

    if (fileNameFromContentDisposition) return fileNameFromContentDisposition;

    
    //Second option
    if (path.extname(cleanUrl)) {//First check if the url even has an extension
        const fileNameFromUrl = deduceFileNameFromUrl(cleanUrl);
        if (fileNameFromUrl) return fileNameFromUrl;
    }

    //Third option
    const fileNameFromContentType = getFileNameFromContentType(headers['content-type'] || headers['Content-Type'],cleanUrl)
    if (fileNameFromContentType) return fileNameFromContentType


    //Fallback option
    return sanitize(path.basename(cleanUrl))

}



function getFileNameFromContentDisposition(contentDisposition) {
    
    if (!contentDisposition || !contentDisposition.includes('filename=')) {
        return "";
    }
    let filename = "";
    var filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
    var matches = filenameRegex.exec(contentDisposition);
    if (matches != null && matches[1]) {
        filename = matches[1].replace(/['"]/g, '');
    }

    return filename ? sanitize(filename) : "";
}

function getFileNameFromContentType(contentType,url) {

    let extension = mime.extension(contentType)
   
    const fileNameWithoutExtension = removeExtension(path.basename(url));
    return `${sanitize(fileNameWithoutExtension)}.${extension}`;
}


function removeQueryString(url) {
    return url.split(/[?#]/)[0];
}

function removeExtension(str) {
    
    const arr = str.split('.');
    if (arr.length == 1) {
        return str;
    }
    return arr.slice(0, -1).join('.')

}

/**
 * 
 * @param {string} url 
 * @return {string} fileName
 */
function deduceFileNameFromUrl(url) {
    
    const baseName = sanitize(path.basename(url));
    return baseName;

}