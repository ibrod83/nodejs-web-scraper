const path = require('path');
const fs = require('fs');


class FileProcessor {
    constructor(config) {
        // console.log(config)
        // debugger;
        this.originalFileName = config.fileName;
        this.fileExtension = path.extname(this.originalFileName);
        this.fileNameWithoutExtension = config.fileName.split('.').slice(0, -1).join('.')
        this.basePath = config.path[config.path.length - 1] === '/' ? config.path : config.path + '/';

        // console.log(this);
    }

    getAvailableFileName() {

        return this.createNewFileName(this.originalFileName);
    }

    createNewFileName(fileName, counter = 1) {
     

        if (!this.fileNameExists(fileName)) {
            // console.log('new file name', newFileName)
            return fileName;
        }

        counter = counter + 1;
        let newFileName = this.fileNameWithoutExtension + counter + this.fileExtension;

        return this.createNewFileName(newFileName,counter);

    }
    fileNameExists(fileName) {
        if (fs.existsSync(this.basePath+fileName)) {
            // console.log(`file ${fileName} already exists!`);
            return true;
        }
        // console.log(`file ${fileName} is being created for the first time`);
        return false;

    }
}

module.exports = FileProcessor;
