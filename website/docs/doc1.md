nodejs-web-scraper is a simple tool for scraping/crawling server-side rendered pages.
It supports features like recursive scraping, automatic retries of failed requests, concurrency limitation, pagination, request delay, etc. Tested on Node 10 and 12(Windows 7, Linux Mint).

The API uses cheerio-advanced-selectors. [Click here for reference](https://www.npmjs.com/package/cheerio-advanced-selectors) 


## Installation

```sh
$ npm install nodejs-web-scraper
```
# Table of Contents
- [Basic examples](#basic-examples)     
  * [Collect articles from a news site](#collect-articles-from-a-news-site)  
  * [Download images](#download-all-images-in-a-page)  
- [Advanced](#advanced-examples) 
  * [Pagination](#pagination)  
  * [Get an entire HTML file](#get-an-entire-html-file)  
  * [Downloading a file that is not an image](#downloading-a-file-that-is-not-an-image)  
  * [getElementContent and getPageResponse hooks](#getelementcontent-and-getpageresponse-hooks)  
  * [Add additional conditions](#add-additional-conditions)  
  * [Scraping an auth protected site](#scraping-an-auth-protected-site)  
- [API](#api) 
- [Pagination explained](#pagination-explained) 
- [Error Handling](#error-handling)  
- [Automatic Logs](#automatic-logs) 
- [Memory consumption](#memory-consumption) 
- [Concurrency](#concurrency) 
- [Disclaimer](#disclaimer) 


## Basic examples
#### Collect articles from a news site

Let's say we want to get every article(from every category), from a news site. We want each item to contain the title,
story and image link(or links).

```javascript
const { Scraper, Root, DownloadContent, OpenLinks, CollectContent } = require('nodejs-web-scraper');
const fs = require('fs');

(async () => {

    const config = {
        baseSiteUrl: `https://www.nytimes.com/`,
        startUrl: `https://www.nytimes.com/`,
        filePath: './images/',
        concurrency: 10,//Maximum concurrent jobs. More than 10 is not recommended.Default is 3.
        maxRetries: 3,//The scraper will try to repeat a failed request few times(excluding 404). Default is 5.       
        logPath: './logs/'//Highly recommended: Creates a friendly JSON for each operation object, with all the relevant data. 
    }

    const articles = [];//Holds all article objects.

    const getPageObject = (pageObject) => {//This will create an object for each page, with "title", "story" and "image" properties(The names we chose for our scraping operations below)
        articles.push(pageObject)
    }

    const scraper = new Scraper(config);//Create a new Scraper instance, and pass config to it.

    //Now we create the "operations" we need:

    const root = new Root();//The root object fetches the startUrl, and starts the process.  
 
    //Any valid cheerio-advanced-selectors selector can be passed. For further reference: https://cheerio.js.org/
    const category = new OpenLinks('.css-1wjnrbv',{name:'category'});//Opens each category page.

    const article = new OpenLinks('article a', {name:'article', getPageObject });//Opens each article page, and calls the getPageObject hook.
    const image = new DownloadContent('img', { name: 'image' });//Downloads images. *It's important to choose a name, for the
    //getPageObject hook to produce the expected results.*  

    const title = new CollectContent('h1', { name: 'title' });//"Collects" the text from each H1 element.

    const story = new CollectContent('section.meteredContent', { name: 'story' });//"Collects" the the article body.

    root.addOperation(category);//Then we create a scraping "tree":
      category.addOperation(article);
       article.addOperation(image);
       article.addOperation(title);
       article.addOperation(story);

    await scraper.scrape(root);

    fs.writeFile('./articles.json', JSON.stringify(articles), () => { })//Will produce a formatted JSON containing all article pages and their selected data.

})();    

```
This basically means: "go to www.nytimes.com; Open every category; Then open every article in each category page; Then collect the title, story and image href, and download all images on that page".

&nbsp;

#### Download all images in a page

A simple task to download all images in a page(including base64)

```javascript
const { Scraper, Root, DownloadContent } = require('nodejs-web-scraper');

(async () => {

   const config = {
        baseSiteUrl: `https://spectator.sme.sk`,//Important to provide the base url, which is the same as the starting url, in this example.
        startUrl: `https://spectator.sme.sk/`,
        filePath: './images/',
        cloneImages: true,//Will create a new image file with an appended name, if the name already exists. Default is false. 
       }

    const scraper = new Scraper(config);

    const root = new Root();//Root corresponds to the config.startUrl. This object starts the entire process

    const images = new DownloadContent('img')//Create an operation that downloads all image tags in a given page(any Cheerio selector can be passed).

    root.addOperation(images);//We want to download the images from the root page, we need to Pass the "images" operation to the root.

    await scraper.scrape(root);//Pass the Root to the Scraper.scrape() and you're done.

})();    

```
When done, you will have an "images" folder with all downloaded files.

&nbsp;




## Advanced Examples

#### Pagination

Get every job ad from a job-offering site. Each job object will contain a title, a phone and image hrefs. Being that the site is paginated, use the pagination feature.

```javascript

const { Scraper, Root, OpenLinks, CollectContent, DownloadContent } = require('nodejs-web-scraper');
const fs = require('fs');

(async () => {

    const pages = [];//All ad pages.

    //pageObject will be formatted as {title,phone,images}, becuase these are the names we chose for the scraping operations below.
    const getPageObject = (pageObject) => {                  
        pages.push(pageObject)
    }

    const config = {
        baseSiteUrl: `https://www.profesia.sk`,
        startUrl: `https://www.profesia.sk/praca/`,
        filePath: './images/',
        logPath: './logs/'
    }

    const scraper = new Scraper(config);

    const root = new Root({ pagination: { queryString: 'page_num', begin: 1, end: 10 } });//Open pages 1-10. You need to supply the querystring that the site uses(more details in the API docs).

    const jobAds = new OpenLinks('.list-row h2 a', { name: 'Ad page', getPageObject });//Opens every job ad, and calls the getPageObject, passing the formatted object.

    const phones = new CollectContent('.details-desc a.tel', { name: 'phone' })//Important to choose a name, for the getPageObject to produce the expected results.

    const images = new DownloadContent('img', { name: 'images' })

    const titles = new CollectContent('h1', { name: 'title' });

    root.addOperation(jobAds);
     jobAds.addOperation(titles);
     jobAds.addOperation(phones);
     jobAds.addOperation(images);

    await scraper.scrape(root);
    
    fs.writeFile('./pages.json', JSON.stringify(pages), () => { });//Produces a formatted JSON with all job ads.
})()

```
Let's describe again in words, what's going on here: "Go to https://www.profesia.sk/praca/; Then paginate the root page, from 1 to 10; Then, on each pagination page, open every job ad; Then, collect the title, phone and images of each ad."

&nbsp;

#### Get an entire HTML file

```javascript

const sanitize = require('sanitize-filename');//Using this npm module to sanitize file names.
const fs = require('fs');
const { Scraper, Root, OpenLinks } = require('nodejs-web-scraper');

(async () => {
    const config = {
        baseSiteUrl: `https://www.profesia.sk`,
        startUrl: `https://www.profesia.sk/praca/`,
        removeStyleAndScriptTags: false//Telling the scraper NOT to remove style and script tags, cause i want it in my html files, for this example.        
    }

    let directoryExists;

    const getHtml = (html, pageAddress) => {//Saving the HTML file, using the page address as a name.

        if(!directoryExists){
            fs.mkdirSync('./html');
            directoryExists = true;
        }
        const name = sanitize(pageAddress)
        fs.writeFile(`./html/${name}.html`, html, () => { })
    }

    const scraper = new Scraper(config);

    const root = new Root({ pagination: { queryString: 'page_num', begin: 1, end: 100 } });

    const jobAds = new OpenLinks('.list-row h2 a', { getHtml });//Opens every job ad, and calls a hook after every page is done.

    root.addOperation(jobAds);

    await scraper.scrape(root);
})() 

```
Description: "Go to https://www.profesia.sk/praca/; Paginate 100 pages from the root; Open every job ad; Save every job ad page as an html file;


&nbsp;

#### Downloading a file that is not an image



```javascript

  const config = {        
        baseSiteUrl: `https://www.some-content-site.com`,
        startUrl: `https://www.some-content-site.com/videos`,
        filePath: './videos/'
        logPath: './logs/'
    }
   

    const scraper = new Scraper(config);   

    const root = new Root();

    const video = new DownloadContent('a.video',{ contentType: 'file' });//The "contentType" makes it clear for the scraper that this is NOT an image(therefore the "href is used instead of "src"). 

    const description = new CollectContent('h1').       

    root.addOperation(video);      
    root.addOperation(description);

   await scraper.scrape(root);

    console.log(description.getData())//You can call the "getData" method on every operation object, giving you the aggregated data collected by it.
```
Description: "Go to https://www.some-content-site.com; Download every video; Collect each h1; At the end, get the entire data from the "description" object;


&nbsp;

#### getElementContent and getPageResponse hooks

```javascript

  const getPageResponse = async (response) => {
        //Do something with response.data(the HTML content). No need to return anything.
    }

    const myDivs=[];

    const getElementContent = (content, pageAddress) => {
               
        myDivs.push(`myDiv content from page ${pageAddress} is ${content}...`)
    }

    const config = {        
        baseSiteUrl: `https://www.nice-site`,
        startUrl: `https://www.nice-site/some-section`,       
       }

    const scraper = new Scraper(config);

    const root = new Root();

    const articles = new OpenLinks('article a');

    const posts = new OpenLinks('.post a'{getPageResponse});//Is called after the HTML of a link was fetched, but before the children have been scraped. Is passed the response object of the page.    

    const myDiv = new CollectContent('.myDiv',{getElementContent});//Will be called after every "myDiv" element is collected.

    root.addOperation(articles);      
        articles.addOperation(myDiv);
    root.addOperation(posts);
        posts.addOperation(myDiv)   

   await scraper.scrape(root);
    
```
Description: "Go to https://www.nice-site/some-section; Open every article link; Collect each .myDiv; Call getElementContent()".

"Also, from https://www.nice-site/some-section, open every post; Before scraping the children(myDiv object), call getPageResponse(); CollCollect each .myDiv".

&nbsp;

#### Add additional conditions

In some cases, using the cheerio-advanced-selectors isn't enough to properly filter the DOM nodes. This is where the "condition" hook comes in. Both OpenLinks and DownloadContent can register a function with this hook, allowing you to decide if this DOM node should be scraped, by returning true or false.

```javascript  

    
    const config = {        
        baseSiteUrl: `https://www.nice-site`,
        startUrl: `https://www.nice-site/some-section`,       
       }

    /**
     * Will be called for each node collected by cheerio, in the given operation(OpenLinks or DownloadContent)      
     */
   const condition = (cheerioNode) => {      
         //Note that cheerioNode contains other useful methods, like html(), hasClass(), parent(), attr() and more.           
        const text = cheerioNode.text().trim();//Get the innerText of the <a> tag.
        if(text === 'some text i am looking for'){//Even though many links might fit the querySelector, Only those that have this innerText,
        // will be "opened".
            return true
        }
    }   

    const scraper = new Scraper(config);

    const root = new Root();

    //Let's assume this page has many links with the same CSS class, but not all are what we need.
    const linksToOpen = new OpenLinks('some-css-class-that-is-just-not-enough',{condition});    

    root.addOperation(linksToOpen);      
          

   await scraper.scrape(root);
    
```

&nbsp;

#### Scraping an auth protected site

Please refer to this guide: [https://nodejs-web-scraper.ibrod83.com/blog/2020/05/23/crawling-subscription-sites](https://nodejs-web-scraper.ibrod83.com/blog/2020/05/23/crawling-subscription-sites)


&nbsp;

## API

#### class Scraper(config)

The main nodejs-web-scraper object. Starts the entire scraping process via Scraper.scrape(Root). Holds the configuration and global state.

These are the available options for the scraper, with their default values:

```javascript
const config ={
            baseSiteUrl: '',//Mandatory.If your site sits in a subfolder, provide the path WITHOUT it.
            startUrl: '',//Mandatory. The page from which the process begins.   
            logPath:null,//Highly recommended.Will create a log for each scraping operation(object).               
            cloneImages: true,//If an image with the same name exists, a new file with a number appended to it is created. Otherwise. it's overwritten.
            removeStyleAndScriptTags: true,// Removes any <style> and <script> tags found on the page, in order to serve Cheerio with a light-weight string. change this ONLY if you have to.           
            concurrency: 3,//Maximum concurrent requests.Highly recommended to keep it at 10 at most. 
            maxRetries: 5,//Maximum number of retries of a failed request.      
            delay: 200,
            timeout: 6000,
            filePath: null,//Needs to be provided only if a "downloadContent" operation is created.
            auth: null,//Can provide basic auth credentials(no clue what sites actually use it).
            headers: null,//Provide custom headers for the requests.
            proxy:null//Use a proxy. Pass a full proxy URL, including the protocol and the port.
        }
```
Public methods:

| Name                                     | Description                                                                                                                                                                                                                                                                                                                   |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| async scrape(Root)                       | After all objects have been created and assembled, you begin the process by calling this method, passing the root object 
| destroy()                       | Call this method, before creating a new Scraper instance(Scraper can only have one instance at a time)                                                                                                                                                                                          |
| async repeatAllFailedRequests(numCycles) | The scraper keeps track of all "repeatable" errors(excluding 400,404,403 and invalid images), that failed even after repeating them on the fly. Call this method to give them a last try. numCycles argument allows to run this process more than once(default is 1). If there are no repeatable errors, nothing will happen. |

&nbsp;

 

#### class Root([config])

Root is responsible for fetching the first page, and then scrape the children. It can also be paginated, hence the optional config. For instance:
```javascript
const root= new Root({ pagination: { queryString: 'page', begin: 1, end: 100 }})

```
The optional config takes these properties:
```javascript
{    
    pagination:{},//In case your root page is paginated.    
    getPageObject:(pageObject)=>{},//Gets a formatted page object with all the data we choose in our scraping setup.
    getHtml:(htmlString,pageAddress)=>{}//Get the entire html page, and also the page address. Called with each link opened by this OpenLinks object.
    getElementList:(elementList)=>{},//Is called each time an element list is created. In the case of OpenLinks, will happen with each list of anchor tags that it collects. Those elements all have Cheerio methods available to them.
    getPageData:(cleanData)=>{}//Called after all data was collected by the root and its children.
    getPageResponse:(response)=>{}//Will be called after a link's html was fetched, but BEFORE the child operations are performed on it(like, collecting some data from it). Is passed the response object(a custom response object, that also contains the original node-fetch response). Notice that any modification to this object, might result in an unexpected behavior with the child operations of that page.
    getException:(error)=>{}//Get every exception thrown by Root.  
    
}

```

Public methods:

| Name        | Description                                                                                               |
| ----------- | --------------------------------------------------------------------------------------------------------- |
| addOperation(Operation)   | Add a scraping "operation"(OpenLinks,DownloadContent)                                       |
| getData()   | Gets all data collected by this operation. In the case of root, it will just be the entire scraping tree. |
| getErrors() | In the case of root, it will show all errors in every operation.                                          |

&nbsp;

#### class OpenLinks(querySelector,[config])

Responsible for "opening links" in a given page. Basically it just creates a nodelist of anchor elements, fetches their html, and continues the process of scraping, in those pages - according to the user-defined scraping tree.

The optional config can have these properties:

```javascript
{
    name:'some name',//Like every operation object, you can specify a name, for better clarity in the logs.
    pagination:{},//Look at the pagination API for more details.
    condition:(cheerioNode)=>{},//Use this hook to add additional filter to the nodes that were received by the querySelector. Return true to include, falsy to exclude.
    getPageObject:(pageObject)=>{},//Gets a formatted page object with all the data we choose in our scraping setup.
    getHtml:(htmlString,pageAddress)=>{}//Get the entire html page, and also the page address. Called with each link opened by this OpenLinks object.
    getElementList:(elementList)=>{},//Is called each time an element list is created. In the case of OpenLinks, will happen with each list of anchor tags that it collects. Those elements all have Cheerio methods available to them.
    getPageData:(cleanData)=>{}//Called after all data was collected from a link, opened by this object.(if a given page has 10 links, it will be called 10 times, with the child data).
    getPageResponse:(response)=>{}//Will be called after a link's html was fetched, but BEFORE the child operations are performed on it(like, collecting some data from it). Is passed the response object(a custom response object, that also contains the original node-fetch response). Notice that any modification to this object, might result in an unexpected behavior with the child operations of that page.
    getException:(error)=>{}//Get every exception throw by this openLinks operation, even if this was later repeated successfully.
    afterScrape:(data)=>{},//Is called after all scraping associated with the current "OpenLinks" operation is completed(like opening 10 pages, and downloading all images form them). Notice that if this operation was added as a child(via "addOperation()") in more than one place, then this hook will be called multiple times, each time with its corresponding data.
    slice:[start,end]//You can define a certain range of elements from the node list.Also possible to pass just a number, instead of an array, if you only want to specify the start. This uses the Cheerio/Jquery slice method.
}

```
Public methods:

| Name        | Description                                                  |
| ----------- | ------------------------------------------------------------ |
| addOperation(Operation)   | Add a scraping "operation"(OpenLinks,DownloadContent) |
| getData()   | Will get the data from all pages processed by this operation |
| getErrors() | Gets all errors encountered by this operation.               |

&nbsp;

#### class CollectContent(querySelector,[config])
Responsible for simply collecting text/html from a given page.
The optional config can receive these properties:
```javascript
{
    name:'some name',
    contentType:'text',//Either 'text' or 'html'. Default is text.   
    shouldTrim:true,//Default is true. Applies JS String.trim() method.
    getElementList:(elementList)=>{},  
    getElementContent:(elementContentString,pageAddress)=>{}//Called with each element collected.  
    afterScrape:(data)=>{},//In the case of CollectContent, it will be called with each page, this operation collects content from.
    slice:[start,end]
}

```
Public methods:

| Name      | Description                                |
| --------- | ------------------------------------------ |
| getData() | Gets all data collected by this operation. |

&nbsp;

#### class DownloadContent(querySelector,[config])
Responsible downloading files/images from a given page.
The optional config can receive these properties:
```javascript
{
    name:'some name',
    contentType:'image',//Either 'image' or 'file'. Default is image.
    alternativeSrc:['first-alternative','second-alternative']//Some images might not have an actual "src", but a data:url. You can provide as many alternative src's as you wish. If the scraper doesn't find a valid src, it will try the alternatives.  
    condition:(cheerioNode)=>{},//Use this hook to add additional filter to the nodes that were received by the querySelector. Return true to include, falsy to exclude.
    getElementList:(elementList)=>{},
    getException:(error)=>{}//Get every exception throw by this downloadContent operation, even if this was later repeated successfully.    
    afterScrape:(data)=>{},//In this case, it will just return a list of downloaded items.
    filePath:'./somePath',//Overrides the global filePath passed to the Scraper config.  
    slice:[start,end]
}

```


Public methods:

| Name        | Description                                                       |
| ----------- | ----------------------------------------------------------------- |
| getData()   | Gets all file names that were downloaded, and their relevant data |
| getErrors() | Gets all errors encountered by this operation.                    |


&nbsp;

#### class Inquiry(conditionFunction)
Allows you to perform a simple inquiry on a page, to see if it meets your conditions. Accepts a function, that should return true if the condition is met. Example:
```javascript

 const condition = (response) => {
        if (response.data.includes('perfume') || (response.data.includes('Perfume') ){
            return true;
        }
    }

 const products = new OpenLinks('.product')
 const productHasAPerfumeString = new Inquiry(condition)

 products.addOperation(productHasAPerfumeString);

```
In the scraping tree log, you will see a boolean field "meetsCondition", for each page.

Notice that this whole thing could also be achieved simply by using hooks, with the OpenLinks operation.

Public methods:

| Name      | Description        |
| --------- | ------------------ |
| getData() | Gets all inquiries |

&nbsp;

## Pagination explained
nodejs-web-scraper covers most scenarios of pagination(assuming it's server-side rendered of course).



``` javascript

    //If a site uses a queryString for pagination, this is how it's done:

    const productPages = new openLinks('a.product'{ pagination: { queryString: 'page_num', begin: 1, end: 1000 } });//You need to specify the query string that the site uses for pagination, and the page range you're interested in.

    //If the site uses some kind of offset(like Google search results), instead of just incrementing by one, you can do it this way:
    
    { pagination: { queryString: 'page_num', begin: 1, end: 100,offset:10 } }

    //If the site uses routing-based pagination:

    { pagination: { routingString: '/', begin: 1, end: 100 } }
```

&nbsp;

## Error Handling

#### Repeating failed requests on the fly

nodejs-web-scraper will automatically repeat every failed request(except 404,400,403 and invalid images). Number of repetitions depends on the global config option "maxRetries", which you pass to the Scraper. If a request fails "indefinitely", it will be skipped, and an object representing it will be pushed into a "failedRequests" array. After the entire scraping process is complete, all failed objects will be printed as a JSON into a file called **"failedRepeatableRequests.json"**(assuming you provided a logPath). 

#### Repeating all failedRepeatableRequests again, after scraping process has ended
After Scraper.scrape() has has come to an end, You can call the Scraper.repeatAllFailedRequests(numCycles), to retry those requests. Notice that this is totally separate from the automatic repetition of failed requests, discussed before. At the end of this process, log files will be overwritten, with the fresh situation. 


## Automatic logs
If a logPath was provided, the scraper will create a log for each operation object you create, and also the following ones: "log.json"(summary of the entire scraping tree), "allErrors.json"(an array of all errors encountered) and "failedRepeatableRequests.json"(an array of all errors that can be repeated). I really recommend using this feature, along side your own hooks and data handling.

## Memory consumption

In scraping jobs that require the "opening" of many large HTML pages at the same time(some sites completely bloat their HTML. I'm using regex to clean-up scripts and CSS), memory consumption can reach about 250MB. This is of course fine, **but if you're using Chrome devtools for debugging,  consumption can sky-rocket**. I do not know why this happens, but the solution is to shutdown the devtools. 

## Concurrency

The program uses a rather complex concurrency management. Being that the memory consumption can get very high in certain scenarios, I've force-limited the concurrency of pagination and "nested" OpenLinks operations. It should still be very quick. As a general note, i recommend to limit the concurrency to 10 at most.

## Disclaimer

Nodejs Web Scraper uses ISC License https://opensource.org/licenses/ISC

The author, ibrod83, doesn't condone the usage of the program or a part of it, for any illegal activity, and will not be held responsible for actions taken by the user. Please use it with discretion, and in accordance with international/your local law.