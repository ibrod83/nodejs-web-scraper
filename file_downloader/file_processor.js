const path = require('path');
const fs = require('fs');


class FileProcessor {
    constructor(config) {

        this.originalFileName = config.fileName;        
        this.fileExtension = path.extname(this.originalFileName);
        this.fileNameWithoutExtension = config.fileName.split('.').slice(0, -1).join('.')
        this.basePath = config.path[config.path.length - 1] === '/' ? config.path : config.path + '/';
        this.initialFileNameExists = this.doesFileExist(this.basePath+this.originalFileName)

 
    }

    getAvailableFileName() {   
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
 
            return fileName;
        }

        counter = counter + 1;
        let newFileName = this.fileNameWithoutExtension + counter + this.fileExtension;

        return this.createNewFileName(newFileName,counter);

    }
    doesFileExist(path) {

        if (fs.existsSync(path)) {
  
            return true;
        }
    
        return false;

    }
}

module.exports = FileProcessor;

