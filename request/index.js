const fetch = require('node-fetch')
var HttpsProxyAgent = require('https-proxy-agent');
// import AbortController from 'abort-controller';


function createInstance(config) {

    return new Request(config);
}

function request(config) {
    return createInstance(config).getFinalResponseObject();
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

    // cancel(){
    //     // debugger;
    //     this.originalResponse.body.destroy();
    // }

    // isCanceled(){
    //     return this.originalResponse.body.destroyed;
    // }
}

class CustomError extends Error {
    constructor({ code, response, message,errno }) {
        super(message)
        // this.config = config;//The config object of the failing request
        this.errno=errno//Error constant. Will be set Only in the case of network errors.
        this.code = code;//http code.Null if network error
        this.response = response//Reference to the customResponse. Will not be set in network errors.
    }
}
// module.exports = class Request {
class Request {

    originalResponse = null;//Original response object from fetch.

    constructor(config) {
        // debugger;
        // this.abortController = new AbortController()
        const defaultConfig = {
            method: 'GET',
            timeout: 6000,
            headers: null,
            proxy: null,//Proxy string
            responseType: 'text',//'text','json' or 'stream'. If 'stream' is chosen, the stream itself is returned.
            // Otherwise, the FINAL output of the request is returned.
            auth: null
        }
        // debugger;
        this.config = { ...defaultConfig, ...config };
        if (this.config.auth) {
            const { username, password } = this.config.auth;
            let buff = new Buffer(username + ":" + password);
            let base64data = buff.toString('base64');
            this.config.headers = {
                ...this.config.headers,
                Authorization: 'Basic ' + base64data
            }
            // debugger;
        }
        if (this.config.proxy) {

            // this.config.agent = getAgent(this.config.proxy);
            this.config.agent = new HttpsProxyAgent(this.config.proxy)

        }
        // debugger;


    }

    // abort = ()=>{
    //     this.response.body.destroy();
    // }
    async  performRequest(config) {

        // controller.abort()
        const url = config.url;
        // debugger;

        const response = await fetch(url, config);
        // debugger;
        this.originalResponse = response;
        return response;
    }



    getRequestHeaders() {
        // debugger;
        // console.log(this)
        return {
            "Accept-Encoding": "gzip,deflate",
            'User-Agent': "node-fetch/1.0 (+https://github.com/bitinn/node-fetch)",
            "Accept": "*/*",
            ...this.config.headers,

        }
    }

    createCustomResponseObjectFromFetchResponse = async (fetchResponse) => {
        let data;
        switch (this.config.responseType) {
            case 'text':
                // debugger;
                data = await fetchResponse.text();

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
        // debugger;
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
        // debugger;
        // const {status} = fetchResponse
        // const response= this.createCustomResponseObjectFromFetchResponse(fetchResponse);
        if (customResponse.status >= 400) {
            const error = new CustomError({ code: customResponse.status, response: customResponse, message: `Server responded with ${customResponse.status}` })
            // debugger;
            throw error;

        }
    }

    createCustomErrorFromFetchError(fetchError) {//Fetch errors are thrown only for network errors. There is no actual "response".
        const error = new CustomError({ errno:fetchError.errno,message: fetchError.message })
        return error;

    }

    async getFinalResponseObject() {

        // console.log(this.config)
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

// module.exports.default = request;
module.exports = request;
// module.exports.Request = Request;

// debugger;