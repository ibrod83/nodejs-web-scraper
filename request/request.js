const fetch = require('node-fetch')
var HttpsProxyAgent = require('https-proxy-agent');

function createInstance(config) {

    return new Request(config);
}

function request(config) {
    return createInstance(config).getFinalResponseObject();
}




class Request {

    constructor(config) {

        this.originalResponse = null;//Original response object from fetch.

        const defaultConfig = {
            method: 'GET',
            timeout: 6000,
            headers: null,
            proxy: null,//Proxy string
            responseType: 'text',//'text','json' or 'stream'. If 'stream' is chosen, the stream itself is returned.
            // Otherwise, the FINAL output of the request is returned.
            auth: null
        }

        if (config.headers) {
            const isEmpty = Object.keys(config.headers).length === 0 && config.headers.constructor === Object;
            if (isEmpty) {
                config.headers = null;
            }
        }
        this.config = { ...defaultConfig, ...config };
        if (this.config.auth) {
            const { username, password } = this.config.auth;
            let buff = new Buffer(username + ":" + password);
            let base64data = buff.toString('base64');
            this.config.headers = {
                ...this.config.headers,
                Authorization: 'Basic ' + base64data
            }

        }
        if (this.config.proxy) {
            this.config.agent = new HttpsProxyAgent(this.config.proxy)

        }



    }

    async performRequest(config) {

        const url = config.url;

        const response = await fetch(url, config);

        this.originalResponse = response;

        return response;
    }



    getRequestHeaders() {

        return {
            "Accept-Encoding": "gzip,deflate",
            'User-Agent': "node-fetch/1.0",
            "Accept": "*/*",
            ...this.config.headers,
        }
    }

    async createCustomResponseObjectFromFetchResponse(fetchResponse) {
        let data;
        switch (this.config.responseType) {
            case 'text':
                data = await fetchResponse.text();

                break;

            case 'buffer':

                data = await fetchResponse.buffer();

                break;
            case 'json':
                data = await fetchResponse.json();
                break;
            case 'stream':
                data = fetchResponse.body;
                break;
            default:
                break;
        }

        const { status, statusText } = fetchResponse;
        const headers = {}
        for (let header of fetchResponse.headers) {
            headers[header[0]] = header[1];
        }
        const requestHeaders = this.getRequestHeaders()

        return new CustomResponse({
            config: { ...this.config, headers: requestHeaders },
            url: fetchResponse.url,
            originalResponse: fetchResponse,
            data,
            status,
            statusText,
            headers
        });
    }

    handleStatusCodes(customResponse) {
        if (customResponse.status >= 400) {
            const error = new CustomError({ code: customResponse.status, response: customResponse, message: `Server responded with ${customResponse.status}` })
            throw error;
        }
    }

    createCustomErrorFromFetchError(fetchError) {//Fetch errors are thrown only for network errors. There is no actual "response".

        const error = new CustomError({ errno: fetchError.errno, message: fetchError.message })
        return error;

    }

    async getFinalResponseObject() {
        try {
            var response = await this.performRequest(this.config);
        } catch (fetchError) {//Network error has ocurred.

            const error = this.createCustomErrorFromFetchError(fetchError)
            throw error;

        }
        //Will reach this stage only if there is no network request.
        const customResponse = await this.createCustomResponseObjectFromFetchResponse(response);


        //Make every status of >=400 throw an error. handleStatusCodes throws an exception, which is not caught here.
        this.handleStatusCodes(customResponse)

        return customResponse;

    }
}

class CustomResponse {
    constructor({ url, config, originalResponse, data, status, statusText, headers }) {
        this.url = url
        this.config = config
        this.originalResponse = originalResponse
        this.data = data
        this.status = status
        this.statusText = statusText
        this.headers = headers
    }

}



class CustomError extends Error {

    constructor({ code, response, message, errno }) {
        super(message)
        this.errno = errno//Error constant. Will be set Only in the case of network errors.
        this.code = code;//http code.Null if network error
        this.response = response//Reference to the customResponse. Will not be set in network errors.
    }
}

module.exports = { request, CustomResponse };

