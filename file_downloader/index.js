const axios = require('axios');
const sanitize = require('sanitize-filename');
const path = require('path');
const FileProcessor = require('./file_processor');

const Promise = require('bluebird');
const fs = require('fs');
var mime = require('mime-types')



class FileDownloader {
    constructor({ url, dest, clone, flag, responseType, auth, timeout, headers }) {
        this.url = url;
        this.dest = dest;
        this.clone = clone;
        this.flag = flag;
        this.responseType = responseType
        this.auth = auth;
        this.timeout = timeout;
        this.headers = headers;
    }

    async download() {
        try {
            const response = await axios({
                method: 'GET',
                url: this.url,
                timeout: this.timeout,
                responseType: this.responseType,
                auth: this.auth,
                headers: this.headers

            })
            // if (this.mockImages)
            //     return
            // console.log(response.data)
            this.response = response;
        } catch (error) {


            throw error;
        }


    }

    getFileName() {
        // 'bin'

        // const extension  =  path.extname(this.url)//Gets the url.
        // const extensionWithoutDot = extension.substr(1);
        //Checks if the extension length makes sense. Pure hack..I did it because some "extensions" might not be an actual one.
        // const urlEndsWithValidExtension =extensionWithoutDot.length >=2  && extensionWithoutDot.length <=4 ?  true : false;
        // debugger;
        // console.log('extension', path.extname(this.url))
        let fileName = "";
        if (!this.response.headers['content-type'] || path.extname(this.url) === '.jpg') {//If it makes sense, i treat it normally.
            const baseName = path.basename(this.url);
            fileName = sanitize(baseName);
        }
        else {//If not, i rely on the content type. 
            var contentType = this.response.headers['content-type'];

            let extension = mime.extension(contentType)


            const baseName = path.basename(this.url, `.${extension}`);
            if (extension === 'bin' && baseName.includes('.exe')) {
                fileName = sanitize(baseName);
            } else {
                fileName = `${sanitize(baseName)}.${extension}`;
            }


        }
        // debugger;
        const fileProcessor = new FileProcessor({ fileName, path: this.dest });
        if (this.clone) {

            fileName = fileProcessor.getAvailableFileName();
        }
        return fileName;
    }

    async saveFromBuffer() {
        // const possibleExtensions = ['.jpg', '.jpeg', '.bmp', '.png', '.svg', '.gif'];
        const fileName = this.getFileName();
        return new Promise((resolve, reject) => {

            fs.writeFile(path.join(this.dest, fileName), this.response.data, { encoding: 'binary', flag: this.flag }, (err) => {

                if (err) {

                    reject(err);
                } else {
                    resolve();
                }


            })
        })
    }

    async save() {
        try {
            if (this.responseType === 'arraybuffer') {

                await this.saveFromBuffer();
            } else {
                await this.saveFromStream()
            }
        } catch (error) {

            throw error
        }

    }

    saveFromStream() {
        // const possibleExtensions = ['.jpg', '.jpeg', '.bmp', '.png', '.svg', '.gif'];
        const fileName = this.getFileName();
        // console.log('flag of stream:', this.flag);


        return new Promise((resolve, reject) => {
            const writeStream = fs.createWriteStream(path.join(this.dest,fileName), { encoding: 'binary', flags: this.flag })
            writeStream.on('open', () => {
                this.response.data.pipe(writeStream)

                this.response.data.on('end', () => {
                    resolve()
                })

                this.response.data.on('error', (error) => {
                    reject(error)
                })
            })
            writeStream.on('error', (error) => {
                reject(error);
            })

        })
    }
}

module.exports = FileDownloader;