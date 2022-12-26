/**
 * To prevent dictionary key-collision, get a number-appended key. Returns a higher order function, to preserve original key.
 * @param {string} originalKey 
 */
function getDictionaryKey(originalKey) {
    const func = (keyName, dictionary, counter = 1) => {

        if (!dictionary[keyName]) {
            return keyName;
        }

        counter = counter + 1;
        let newKeyName = originalKey + counter;

        return func(newKeyName, dictionary, counter);

    }

    return func;

}



/**
 * 
 * @param {Object} originalObject 
 * @param {Object} secondaryObject 
 * @return {void}
 */
function deepSpread(originalObject, secondaryObject) {
    if (!originalObject)
        originalObject = {}

    for (let prop in secondaryObject) {
        if (typeof secondaryObject[prop] === 'object' && !Array.isArray(secondaryObject[prop])) {

            deepSpread(originalObject[prop], secondaryObject[prop]);
        } else {
            originalObject[prop] = secondaryObject[prop]
        }

    }
}

module.exports = {
    getDictionaryKey,
    deepSpread
}