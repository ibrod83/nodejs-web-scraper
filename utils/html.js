
/**
 * 
 * @param {string} html
 * @return {string} clean 
 */
function stripTags(html) {//Cleans the html string from script and style tags.
    let clean;
    clean = html.replace(/<\s*script[^>]*>[\s\S]*?(<\s*\/script[^>]*>|$)/ig, '');
    clean = clean.replace(/<style[^>]*>[\s\S]*?(<\/style[^>]*>|$)/ig, '');

    return clean;

}

module.exports = {
    stripTags
}