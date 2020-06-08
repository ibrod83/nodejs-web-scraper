// const axios = require('axios');
const request = require('../request');
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
                responseType:'stream',
                auth: this.auth,
                headers: this.headers,
                // proxy:this.proxy
                proxy:this.proxy
                // proxy:true

            })
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

    getFileName() {

        // debugger;
        let fileName = "";
        // if(this.getFileNameFromHeaders()){
        //     console.log('filenamefromheaders: true')
        // }else{
        //     console.log('filenamefromheaders: false')
        // }
        if (this.useContentDisposition) {
            const fileNameFromHeaders = this.getFileNameFromHeaders()

            if (fileNameFromHeaders) {

                fileName = fileNameFromHeaders
            } else {
                fileName = this.deduceFileNameFromUrl();
            }
        } else {
            fileName = this.deduceFileNameFromUrl();
        }

        // debugger;
        const fileProcessor = new FileProcessor({ fileName, path: this.dest });
        if (this.clone) {

            fileName = fileProcessor.getAvailableFileName();
        }
        return fileName;
    }

    

    async save() {
        // debugger;
        try {
            // debugger;
            // if(!this.response.isCanceled()){
              await this.saveFromStream(this.response.data)  
            // }
            

        } 
        catch (error) {

            throw error
        }

    }
    

    async saveFromStream(readableStream) {

        const fileName = this.getFileName();
        // console.log('flag of stream:', this.flag);
        const write = fs.createWriteStream(path.join(this.dest, fileName));
        await pipeline(readableStream, write )
       
    }
}

module.exports = FileDownloader;