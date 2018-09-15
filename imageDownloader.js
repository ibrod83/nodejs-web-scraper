const axios = require('axios');
const sanitize = require('sanitize-filename');
const path = require('path');
const FileProcessor = require('./file_processor');

const Promise = require('bluebird');
// const fs = Promise.promisifyAll(require('fs'));
const fs = require('fs');
// import fetch from 'node-fetch';



class ImageDownloader {
    constructor({ url, dest, clone, flag, mockImages, responseType }) {
        this.url = url;
        this.dest = dest;
        this.clone = clone;
        this.flag = flag;
        this.mockImages = mockImages;
        this.responseType = responseType
    }

    async download() {
        try {
            const response = await axios({
                method: 'GET',
                url: this.url,
                timeout: 10000,
                responseType: this.responseType

            })
            // if (this.mockImages)
            //     return
            // console.log(response.data)
            this.response = response;
        } catch (error) {
           

            throw error;
        }


    }

    getImageName() {
        const possiblePathNames = ['.jpg', '.jpeg', '.bmp', '.png', '.svg', '.gif'];
        const urlEndsWithValidImageExtension = possiblePathNames.includes(path.extname(this.url));


        let imageName = "";
        if (urlEndsWithValidImageExtension) {
            imageName = path.basename(this.url);

        } else {
            var contentType = res.headers['content-type'];
            const extension = contentType.split("/")[1];


            imageName = `${sanitize(path.basename(this.url))}.${extension}`;
        }
        const fileProcessor = new FileProcessor({ fileName: imageName, path: this.dest });
        if (this.clone) {
            imageName = fileProcessor.getAvailableFileName();
        }
        return imageName;
    }

    async saveFromBuffer() {

        const imageName = this.getImageName();
        return new Promise((resolve, reject) => {

            fs.writeFile(this.dest + imageName, this.response.data, { encoding: 'binary', flag: this.flag }, (err) => {

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

        const imageName = this.getImageName();
        console.log('flag of stream:', this.flag);
       

        return new Promise((resolve, reject) => {
            const writeStream = fs.createWriteStream(this.dest + imageName, { encoding: 'binary', flags: this.flag })
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

module.exports = ImageDownloader;