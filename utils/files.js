const fs = require('fs')
function verifyDirectoryExists(path) {//Will make sure the target directory exists.   
    if (!fs.existsSync(path)) {//Will run ONLY ONCE, so no worries about blocking the main thread.
        console.log('creating dir:', path)
        fs.mkdirSync(path);
    }
}

module.exports = {
    verifyDirectoryExists
}