const fs = require('fs')
function verifyDirectoryExists(path) {//Will make sure the target directory exists.   
    if (!fs.existsSync(path)) {
        console.log('creating dir:', path)
        fs.mkdirSync(path);
    }
}

module.exports = {
    verifyDirectoryExists
}