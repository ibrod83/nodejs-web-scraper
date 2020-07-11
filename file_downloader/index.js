counter = 0;
const request = require('../request/request.js');
// const sanitize = require('sanitize-filename');
const path = require('path');
const FileProcessor = require('./file_processor');
const util = require('util');
const stream = require('stream');
const pipeline = util.promisify(stream.pipeline);
const fs = require('fs');
const writeFile = util.promisify(fs.writeFile)
const getFileNameFromResponse = require('./fileNameFromResponse')
// var mime = require('mime-types')



class FileDownloader {
    constructor({ url,  shouldBufferResponse = false, dest, clone,  auth, timeout, headers, proxy }) {
        this.url = url;
        this.dest = dest;
        this.clone = clone;
        // this.mockImages = mockImages

        // this.useContentDisposition = useContentDisposition;
        this.shouldBufferResponse = shouldBufferResponse//Whether the readableStream should be cached in memory.
        // //If true, the readableStream will be assembled in a buffer, and only then streamed to the destination. 

        this.auth = auth;
        this.timeout = timeout;
        this.headers = headers;
        this.proxy = proxy
    }

    async download() {
        // debugger;
        try {

            const response = await request({
                method: 'GET',
                url: this.url,
                timeout: this.timeout,
                responseType: this.shouldBufferResponse ? 'buffer' : 'stream',
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
            this.data = response.data;
            // console.log(this.data)
            // debugger;
            // this.response.cancel();
            // return response;
        } catch (error) {
            // debugger;
            // debugger;
            throw error;
        }


    }

    

   

    getFileNameData() {

        // let originalFileName = "";
        // if(this.getFileNameFromHeaders()){
        //     console.log('filenamefromheaders: true')
        // }else{
        //     console.log('filenamefromheaders: false')
        // }
        // if (this.useContentDisposition) {
        //     const fileNameFromHeaders = this.getFileNameFromHeaders()

        //     if (fileNameFromHeaders) {

        //         originalFileName = fileNameFromHeaders
        //     } else {
        //         originalFileName = this.deduceFileNameFromUrl();
        //     } originalFileName
        // } else {
        //     originalFileName = this.deduceFileNameFromUrl();
        // }

        const originalFileName = getFileNameFromResponse(this.url,this.response.headers);

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
            // if (!this.clone) {
            //     if (initialFileNameExists) {
            //         // debugger;
            //         console.log('exists, aborting')
            //         this.response.abort()
            //     }
            // }
            // console.log('flag of stream:', this.flag);
            // debugger;
            // if (!this.response.isAborted()) {


            if (this.shouldBufferResponse) {

                // const buffer = await this.createBufferFromReadableStream(this.response.data);
                const buffer = await this.getBufferFromResponse();
                await this.saveFromBuffer(path.join(this.dest, finalFileName), buffer);
            } else {
                const write = fs.createWriteStream(path.join(this.dest, finalFileName));
                await this.saveFromStream(this.data, write)
            }

            // }





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

    async getBufferFromResponse() {
        return this.data;//This assumes "data" is already a buffer, due to configuration.
    }

    async saveFromStream(readableStream, writableStream) {

        await pipeline(readableStream, writableStream)

    }

    async saveFromBuffer(path, buffer) {

        await writeFile(path, buffer)

    }


}

module.exports = FileDownloader;