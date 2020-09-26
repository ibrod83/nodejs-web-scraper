
/**
 * To prevent dictionary key-collision, get a number-appended key. Returns a higher order function, to preserve original key.
 * @param {string} originalKey 
 */
function getDictionaryKey(originalKey) {
    const func = (keyName, dictionary, counter = 1) => {

        if (!dictionary[keyName]) {
            // console.log('new file name', newFileName)
            return keyName;
        }

        counter = counter + 1;
        let newKeyName = originalKey + counter;

        return func(newKeyName, dictionary, counter);

    }

    return func;

}

module.exports = {
    getDictionaryKey
}