const fs = require('fs');

function verifyDirectoryExists(path) {//Will make sure the target directory exists.   
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path, { recursive: true });
    }
}


function verifyDirectoryExistsAsync(path) {

    return new Promise((resolve, reject) => {
        fs.access(path, (err) => {
            if (err) {
                fs.mkdir(path, { recursive: true }, (err) => {
                    resolve();
                })
            } else {
                resolve();
            }
        })
    })



}

module.exports = {
    verifyDirectoryExists,
    verifyDirectoryExistsAsync
}