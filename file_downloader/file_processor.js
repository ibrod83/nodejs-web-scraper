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
        // debugger;
        this.initialFileNameExists = this.doesFileExist(this.basePath+this.originalFileName)

        // console.log(this);
    }

    getAvailableFileName() {
        // debugger;
        return this.createNewFileName(this.originalFileName);
    }

    /**
     * @return {boolean}
     */
    didInitialFileNameExist(){
        return this.initialFileNameExists;
    }

    

    createNewFileName(fileName, counter = 1) {
     

        if (!this.doesFileExist(this.basePath+fileName)) {
            // console.log('new file name', newFileName)
            return fileName;
        }

        counter = counter + 1;
        let newFileName = this.fileNameWithoutExtension + counter + this.fileExtension;

        return this.createNewFileName(newFileName,counter);

    }
    doesFileExist(path) {
        // debugger;
        if (fs.existsSync(path)) {
            // console.log(`file ${fileName} already exists!`);
            return true;
        }
        // console.log(`file ${fileName} is being created for the first time`);
        return false;

    }
}

module.exports = FileProcessor;

