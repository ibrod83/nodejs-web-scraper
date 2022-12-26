const { request } = require('../request/request.js');
const path = require('path');
const FileProcessor = require('./file_processor');
const util = require('util');
const stream = require('stream');
const pipeline = util.promisify(stream.pipeline);
const fs = require('fs');
const writeFile = util.promisify(fs.writeFile)
const getFileNameFromResponse = require('./fileNameFromResponse')




class FileDownloader {
    constructor({ url, shouldBufferResponse = false, directory, cloneFiles, auth, timeout, headers, proxy }) {
        this.url = url;
        this.directory = directory;
        this.cloneFiles = cloneFiles;
        this.shouldBufferResponse = shouldBufferResponse//Whether the readableStream should be cached in memory.
        // //If true, the readableStream will be assembled in a buffer, and only then streamed to the destination. 
        this.auth = auth;
        this.timeout = timeout;
        this.headers = headers;
        this.proxy = proxy
    }

    async download() {

        try {

            const response = await request({
                method: 'GET',
                url: this.url,
                timeout: this.timeout,
                responseType: this.shouldBufferResponse ? 'buffer' : 'stream',
                auth: this.auth,
                headers: this.headers,
                proxy: this.proxy

            })
            this.response = response;
            this.data = response.data;

        } catch (error) {
            throw error;
        }
    }


    getFileNameData() {

        const originalFileName = getFileNameFromResponse(this.url, this.response.headers);

        let finalFileName;

        const fileProcessor = new FileProcessor({ fileName: originalFileName, path: this.directory });
        if (this.cloneFiles) {

            finalFileName = fileProcessor.getAvailableFileName();
        } else {
            finalFileName = originalFileName;
        }
        const initialFileNameExists = fileProcessor.didInitialFileNameExist();

        return {//Return an object with both the "original"(deduced from the URL and headers) file name, and the final one
            finalFileName,
            originalFileName,
            initialFileNameExists
        };
    }



    async save() {
        try {
            const { finalFileName } = this.getFileNameData();

            if (this.shouldBufferResponse) {

                const buffer = await this.getBufferFromResponse();
                await this.saveFromBuffer(path.join(this.directory, finalFileName), buffer);
            } else {
                const write = fs.createWriteStream(path.join(this.directory, finalFileName));
                await this.saveFromStream(this.data, write)
            }
        }
        catch (error) {
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