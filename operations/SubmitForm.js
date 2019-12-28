const InterneticOperation = require('./InterneticOperation');
const axios = require('axios');
var cheerio = require('cheerio');
var cheerioAdv = require('cheerio-advanced-selectors');
cheerio = cheerioAdv.wrap(cheerio);
const FormData = require('form-data');
const URL = require('url').URL;





class SubmitForm extends InterneticOperation {

    constructor(querySelector, config) {
        super(config);
        this.querySelector = querySelector;
        // this.validateOperationArguments();


    }

    async scrape(responseObjectFromParent) {
        // debugger;
        // console.log('address',responseObjectFromParent.request.res.responseUrl)

        const currentWrapper = this.createWrapper(responseObjectFromParent.request.res.responseUrl);

        var $ = cheerio.load(responseObjectFromParent.data);

        const baseUrlFromBaseTag = this.getBaseUrlFromBaseTag($);

        const elementList = this.createElementList($);
        const actions = []
        for (let element of elementList) {
            // debugger;
            const action = element[0].attribs.action;

            const absoluteUrl = this.getAbsoluteUrl(baseUrlFromBaseTag || responseObjectFromParent.request.res.responseUrl, action);

            actions.push(absoluteUrl)

            // await this.submit(absoluteUrl);
        }

        const scrapingObjects = this.createScrapingObjectsFromRefs(actions);

        await this.executeScrapingObjects(scrapingObjects);


        currentWrapper.data = [...currentWrapper.data, ...scrapingObjects];

        this.data.push(currentWrapper);

        return this.createMinimalData(currentWrapper);

        $ = null;



    }

    async processOneScrapingObject(scrapingObject) {

        delete scrapingObject.data;//Deletes the unnecessary 'data' attribute.
        const action = scrapingObject.address;

        // debugger;

        try {


            const response = await this.submit(action);
            // debugger;
            if (this.getSubmissionResponse)
                await this.getSubmissionResponse(response)

            scrapingObject.successful = true;

        } catch (error) {
            // debugger;
            // error.code
            const errorCode = error.code
            const errorString = `There was an error submitting form:, ${action}, ${error}`
            this.errors.push(errorString);
            this.handleFailedScrapingObject(scrapingObject, errorString, errorCode);

            return;


        }

    }

    createFormData(obj) {
        var form = new FormData();
        for (let field in obj) {

            form.append(field, obj[field])
        }
        // debugger;
        return form;
    }

    async submit(url) {

        const promiseFactory = async () => {

            const form = this.createFormData(this.fields);

            await this.beforePromiseFactory('Submitting form:' + url);

            const headers = { ...form.getHeaders(), ...this.scraper.config.headers };

            try {
                // debugger;
                var resp = await axios({
                    url: this.customUrl || url,
                    method: 'post',
                    headers,
                    data: form
                })
                debugger;
                console.log(resp)

            } catch (error) {
                throw error;
            }

            finally {
                this.afterPromiseFactory();            
            }
            return resp;

        }
        return await this.repeatPromiseUntilResolved(() => { return this.qyuFactory(promiseFactory) }, url)



    }







}

module.exports = SubmitForm;


                // var resp="";
                // await new Promise((resolve, reject) => {
                //     const config = {
                //         method: 'post',
                //         host,
                //         path,
                //         headers: form.getHeaders()
                //     }

                //     var request = isHttps ? https.request(config) : http.request(config);

                //     form.pipe(request);                

                //     request.on('response', function (res) {
                //         res.on('data',(chunk)=>{
                //             resp+=chunk
                //             // debugger;  
                //         })
                //         res.on('end', function () {
                //             // debugger;
                //             // console.log(body);
                //             resolve()
                //           });

                //     });

                //     request.on('error', function (e) {
                //         reject(e)
                //     });
                // })