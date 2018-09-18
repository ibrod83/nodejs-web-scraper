const path = require('path');
const fs = require('fs');

// const renameExistingFile = (fileName="placeholder.jpg")=>{


// }

class FileProcessor {
    constructor(config) {
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
        // if ($this->encrypt_name === TRUE)
        // {
        // 	$filename = md5(uniqid(mt_rand())).$this->file_ext;
        // }

        // if ($this->overwrite === TRUE OR ! file_exists($path.$filename))
        // {
        // 	return $filename;
        // }

        // $filename = str_replace($this->file_ext, '', $filename);

        if (!this.fileNameExists(fileName)) {
            // console.log('new file name', newFileName)
            return fileName;
        }

        counter = counter + 1;
        let newFileName = this.fileNameWithoutExtension + counter + this.fileExtension;

        // if (counter == 1) {
        //     newFileName =  this.originalFileName ;
        // } else {
        //     newFileName =  this.fileNameWithoutExtension + counter + this.fileExtension;

        // }



        // if (!this.fileNameExists(this.basePath+newFileName)) {
        //     console.log('new file name',newFileName)
        //     return newFileName;
        // }

        // console.log(counter)

        return this.createNewFileName(newFileName,counter);


        // if ($new_filename === '') {
        //     $this -> set_error('upload_bad_filename', 'debug');
        //     return FALSE;
        // }

        // return $new_filename;
    }
    // this.basePath + this.originalFileName
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
