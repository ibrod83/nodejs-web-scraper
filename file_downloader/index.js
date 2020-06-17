// const axios = require('axios');
counter=0;
const request = require('../request/request.js');
const sanitize = require('sanitize-filename');
const path = require('path');
const FileProcessor = require('./file_processor');
const util = require('util');
const stream = require('stream');
const pipeline = util.promisify(stream.pipeline);

// const Promise = require('bluebird');
const fs = require('fs');
var mime = require('mime-types')



class FileDownloader {
    constructor({ url, useContentDisposition = false, dest, clone, flag, auth, timeout, headers, proxy }) {
        this.url = url;
        this.dest = dest;
        this.clone = clone;
        // this.mockImages = mockImages
        // this.flag = flag;
        this.useContentDisposition = useContentDisposition;
        // this.responseType = responseType
        this.auth = auth;
        this.timeout = timeout;
        this.headers = headers;
        this.proxy = proxy
    }

    async download() {
        // debugger;
        try {
            // const response = await axios({
            //     method: 'GET',
            //     url: this.url,
            //     timeout: this.timeout,
            //     responseType: this.responseType,
            //     auth: this.auth,
            //     headers: this.headers,
            //     proxy:this.proxy

            // })
            // debugger;
            const response = await request({
                method: 'GET',
                url: this.url,
                timeout: this.timeout,
                responseType: 'stream',
                auth: this.auth,
                // timeout:10,
                headers: this.headers,
                // proxy:this.proxy
                proxy: this.proxy
                // proxy:true

            })
            // console.log('YOTYO')
            // debugger;
            // response.abort();
            // if (this.mockImages)
            //     return
            // console.log(response.data)
            this.response = response;
            // debugger;
            // this.response.cancel();
            // return response;
        } catch (error) {
            // debugger;
            // debugger;
            throw error;
        }


    }

    /**
     * @return {string} Rturns the filename, or an empty string.
     */
    getFileNameFromHeaders() {
        const headers = this.response.headers;
        const contentDisposition = headers['content-disposition'] || headers['Content-Disposition'];
        if (!contentDisposition || !contentDisposition.includes('filename=')) {
            return "";
        }

        let filename = "";
        var filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        var matches = filenameRegex.exec(contentDisposition);
        if (matches != null && matches[1]) {
            filename = matches[1].replace(/['"]/g, '');
        }

        return filename;



    }

    deduceFileNameFromUrl() {
        let fileName = ""
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
        return fileName;
    }

    getFileNameData() {

        // debugger;
        let originalFileName = "";
        // if(this.getFileNameFromHeaders()){
        //     console.log('filenamefromheaders: true')
        // }else{
        //     console.log('filenamefromheaders: false')
        // }
        if (this.useContentDisposition) {
            const fileNameFromHeaders = this.getFileNameFromHeaders()

            if (fileNameFromHeaders) {

                originalFileName = fileNameFromHeaders
            } else {
                originalFileName = this.deduceFileNameFromUrl();
            } originalFileName
        } else {
            originalFileName = this.deduceFileNameFromUrl();
        }

        // debugger;
        let finalFileName;
        const fileProcessor = new FileProcessor({ fileName: originalFileName, path: this.dest });
        if (this.clone) {

            finalFileName = fileProcessor.getAvailableFileName();
        } else {
            finalFileName = originalFileName;
        }
        // debugger;
        const initialFileNameExists = fileProcessor.didInitialFileNameExist();
        // const initialFileNameExists = fileProcessor.doesFileExist(this.dest+'/'+originalFileName);//Boolean 
        if (initialFileNameExists) counter++
        // console.log('initialFileNameExists',counter)

        return {//Return an object with both the "original"(deduced from the URL and headers) file name, and the final one
            finalFileName,
            originalFileName,
            initialFileNameExists
        };
    }



    async save() {
        // debugger;
        try {
            // debugger;
            const { originalFileName, finalFileName, initialFileNameExists } = this.getFileNameData();
            // let newFileCreated = true;
            // debugger;
            // if(!initialFileNameExists){
            //     console.log('NO')
            //     debugger;
            // }
            if (!this.clone) {
                if (initialFileNameExists) {
                    // debugger;
                    this.response.abort()
                }
            }
            // console.log('flag of stream:', this.flag);
            // debugger;
            if (!this.response.isAborted()) {
                const write = fs.createWriteStream(path.join(this.dest, finalFileName));
                await this.saveFromStream(this.response.data, write)
            }





            // return {
            //     newFileCreated
            // }
            // }


        }
        catch (error) {
            // debugger;
            throw error
        }

    }


    async saveFromStream(readableStream, writableStream) {

        // const fileName = this.getFileName();
        // // console.log('flag of stream:', this.flag);
        // const write = fs.createWriteStream(path.join(this.dest, fileName));
        await pipeline(readableStream, writableStream)

    }
}

module.exports = FileDownloader;