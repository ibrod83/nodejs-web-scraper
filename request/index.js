const fetch = require('node-fetch')
var HttpsProxyAgent = require('https-proxy-agent');


function createInstance(config) {
   
    return new Request(config);
}

function request(config) {
    return createInstance(config).getFinalResponseObject();
}

class CustomError extends Error {
    constructor({ code, response, message }) {
        super(message)
        // this.config
        // this.request
        this.code = code;
        this.response = response
    }
}
// module.exports = class Request {
class Request {

    constructor(config) {
        // debugger;

        const defaultConfig = {
            method: 'GET',
            timeout: 6000,
            headers: null,
            proxy: null,//Proxy string
            responseType: 'text',//'text','json' or 'stream'. If 'stream' is chosen, the stream itself is returned.
            // Otherwise, the FINAL output of the request is returned.
            auth: null
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

        // this.config.agent = getAgent(this.config.proxy);
        this.config.agent = new HttpsProxyAgent(this.config.proxy)

        }
        // debugger;


    }
    async  performRequest(config) {
        const url = config.url;
        // debugger;

        const response = await fetch(url, config);
        // debugger;
        this.response = response;
        return response;
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
        return {
            config: this.config,
            // request: {
            //     res: {
            //         responseUrl: fetchResponse.url
            //     }
            // },
            url:fetchResponse.url,
            originalFetchResponse:fetchResponse,
            data,
            status,
            statusText,
            headers
        };
    }

    handleCustomError(customResponse) {
        // debugger;
        // const {status} = fetchResponse
        // const response= this.createCustomResponseObjectFromFetchResponse(fetchResponse);
        if (customResponse.status >= 400) {
            const error = new CustomError({ code: customResponse.status, response: customResponse, message: `Server responded with ${customResponse.status}` })
            // debugger;
            throw error;

        }
    }

    async getFinalResponseObject() {
        // console.log(this.config)
        const response = await this.performRequest(this.config);
        // debugger;
        const customResponse = await this.createCustomResponseObjectFromFetchResponse(response);
        // debugger;
        try {
            this.handleCustomError(customResponse);
        } catch (error) {
            throw error;
        }

        return customResponse;


    }
}

// module.exports.default = request;
module.exports = request;
// module.exports.Request = Request;

// debugger;