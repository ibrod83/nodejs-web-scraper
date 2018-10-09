Nodejs-web-scraper is a simple, yet powerful tool for Node programmers who want to quickly setup a complex scraping job of server-side rendered web sites.
It supports features like automatic retries of failed requests, concurrency limitation, pagination, request delay, etc.

# Readme file is still being written...

## Installation

```sh
$ npm install nodejs-web-scraper
```
# Table of Contents
- [Basic example](#basic-example) 
- [Advanced](#advanced-examples)  
- [API](#api) 
- [Pagination explained](#pagination-explained) 
- [Error Handling](#error-handling) 
- [Memory consumption](#memory-consumption) 
- [Concurrency](#concurrency) 

## Basic example

#### Nodejs-web-scraper has a semantic API:
```javascript
const { Scraper, Root, DownloadContent, OpenLinks, CollectContent, Inquiry } =  require('nodejs-web-scraper');    

(async()=>{
    const config = {
        baseSiteUrl: `https://www.nytimes.com/`,
        startUrl: `https://www.nytimes.com/`,
        concurrency: 10,     
        maxRetries: 3,//The scraper will try to repeat a failed request few times(excluding 404)
        cloneImages: true,//Will create a new image file with a modified name, if the name already exists.	  
        filePath: './images/',
        logPath: './logs/'//Highly recommended: Creates a friendly JSON for each operation object, with all the relevant data. 
    }  

    const scraper =  new Scraper(config);//Create a new Scraper instance, and pass config to it.

    //Now we create the "operations" we need:

    const root =  new Root();//The root object fetches the startUrl, and starts the process.  

    const category =  new OpenLinks('.css-1wjnrbv');//Opens each category page.

    const article =  new OpenLinks('article a');//Opens each article page

    const image =  new DownloadContent('img');//Downloads every image from a given page.  

    const h1 =  new CollectContent('h1');//"Collects" the text from each H1 element.


    root.addOperation(category);//Then we create a scraping "tree":
        category.addOperation(article);
            article.addOperation(image);
            article.addOperation(h1);
            
    await scraper.scrape(root);//Pass the root object to the Scraper.scrape method, and the work begins.

    //All done. We specified a 'logPath', so now JSON files were automatically created.        

    //You can also manually get the data of each operation object, by calling the getData() method, for example:

    const articleFinalData = article.getData();
    const h1FinalData = h1.getData();

    //Do something with that data...

    })();
    

```
This basically means: "go to www.nytimes.com; Open every category; Then open every article in each category page; Then collect the h1 tags in each article, and download all images on that page".

&nbsp;


## Advanced Examples

#### Pagination and an "afterOneLinkScraped" callback.

```javascript

(async()=>{

    const ads=[];

    const afterOneLinkScrape = async (dataFromAd) => {
      ads.push(dataFromAd)
    }//This is passed as a callback to "afterOneLinkScraped", in the jobAd object.Receives formatted data as an argument. 

    config = {        
        baseSiteUrl: `https://www.profesia.sk`,
        startUrl: `https://www.profesia.sk/praca/`,
        filePath: './images/',
        logPath: './logs/'
    }
    const scraper = new Scraper(config);

    const root = new Root({ pagination: { queryString: 'page_num', begin: 1, end: 10 } });//Open pages 1-10. You need to supply the querystring that the site uses(more details in the API docs).

    const jobAd = new OpenLinks('.list-row a.title', {  afterOneLinkScrape });//Opens every job ad, and calls a callback after every page is done.

    const image = new DownloadContent('img:first', { name: 'Good Image' });//Notice that you can give each operation a name, for clarity in the logs.

    const span = new CollectContent('span');
    
    const header = new CollectContent('h4,h2');

    root.addOperation(jobAd);
        jobAd.addOperation(span);
        jobAd.addOperation(header);    
        jobAd.addOperation(image);    
    root.addOperation(header);//Notice that i use the same "header" object object as a child of two different objects. This means, the data will be collected both from the root, and from each job ad page. You can compose your scraping as you wish.

    await scraper.scrape(root);
    console.log(ads)//Doing something with the array we created from the callbacks...
})()



```
Let's describe again in words, what's going on here: "Go to https://www.profesia.sk/praca/; Then paginate the root page, from 1 to 10; Then, on each pagination page, open every job ad; Then, collect span,h2,h4 elements and download the first image; Also collect h2,h4 in the root(each pagination)."

&nbsp;



#### File download(non-image) and a "getElementContent" callback.

```javascript

const getElementContent = (contentString)=>{
    if(contentString.includes('Hey!')){
          return `${contentString} some appended phrase...`;//You need to return a new string.
    }
    //If you dont return anything, the original string is used.
  
}

config = {        
        baseSiteUrl: `https://www.some-content-site.com`,
        startUrl: `https://www.some-content-site.com/videos`,
        filePath: './videos/'
        logPath: './logs/'
    }
   

    const scraper = new Scraper(config);   

    const root = new Root();

    const video = new DownloadContent('a.video',{ contentType: 'file' });//The "contentType" makes it clear for the scraper that this is NOT an image(therefore the "href is used instead of "src"). 

    const description = new CollectContent('h1'{getElementContent});//Using a callback on each node text.       

    root.addOperation(video);      
    root.addOperation(description);//Notice that i use the same "header" object object as a child of two different objects. This means, the data will be collected both from the root, and from each job ad page. You can compose your scraping as you wish.

   await scraper.scrape(root);

    console.log(description.getData())//You can call the "getData" method on every operation object, giving you the aggregated data collected by it.
```
Description: "Go to https://www.some-content-site.com; Download every video; Collect each h1, while processing the content with a callback; At the end, get the entire data from the "description" object;


&nbsp;

#### "processUrl" callback and a "beforeOneLinkScrape" callback.

```javascript

  const beforeOneLinkScrape = async (response) => {
        //Do something with response.data(the HTML content). No need to return anything.
    }

    const processUrl =async (originalUrl) => {       
        const newUrl = originalUrl.replace('https://www.nice-site.com/url?q=', 'some string...');       
        return newUrl;
    }

    config = {        
        baseSiteUrl: `https://www.nice-site`,
        startUrl: `https://www.nice-site/some-section`,       
       }

    const scraper = new Scraper(config);

    const root = new Root();

    const article = new OpenLinks('article a'{processUrl});//Will be called for each link, before the HTTP request is made, allowing you to modify the URL, if needed for some reason.

    const post = new OpenLinks('.post a'{beforeOneLinkScrape});//Is called after the HTML of a link was fetched, but before the children have been scraped. Is passed the response object of the page.    

    const myDiv = new CollectContent('.myDiv');

    root.addOperation(article);      
        article.addOperation(myDiv);
    root.addOperation(post);
        post.addOperation(myDiv)   

   await scraper.scrape(root);

    
```
Description: "Go to https://www.nice-site/some-section; Collect every article link; Call processUrl(); Collect each .myDiv".

"Also, from https://www.nice-site/some-section, open every post; Before scraping the children(myDiv object), call beforeOneLinkScrape(); CollCollect each .myDiv".

&nbsp;

## API

## class Scraper(config)

The main nodejs-web-scraper object. Starts the scraping entire scraping process via Scraper.scrape(Root). Holds the configuration and global state.

These are available options for the scraper, with their default values:

```javascript
const config ={
            baseSiteUrl: '',//Mandatory.If your site sits in a subfolder, provide the path WITHOUT it.
            startUrl: '',//Mandatory. The page from which the process begins.   
            logPath://Highly recommended.Will create a log for each scraping operation(object).  
            shouldPromptForScrapingRepetition:true//At the end of the scraping process, Prompts you from the console, whether all failed requests should repeat. For more details refer to the "error handling section.       
            cloneImages: true,//If an image with the same name exists, a new file with a number appended to it is created. Otherwise. it's overwritten.
            fileFlag: 'w',//The flag provided to the file saving function. 
            concurrency: 3,//Maximum concurrent requests.Highly recommended to keep it at 10 at most. 
            maxRetries: 5,//Maximum number of retries of a failed request.            
            imageResponseType: 'arraybuffer',//Either 'stream' or 'arraybuffer'
            delay: 100,
            timeout: 5000,
            filePath: null,//Needs to be provided only if a "downloadContent" operation is created.
            auth: null,//Can provide basic auth credentials(no clue what sites actually use it).
            headers: null//Provide custom headers for the requests.
        }
```
Public methods:

| Name         | Description                                |
|--------------|--------------------------------------------|
| scrape(Root) | After all operations have created and assembled, you begin the process by calling this method, passing the root object |

&nbsp;

 

## class Root([config])

Root is responsible for fetching the first page, and then scrape the children. It can also be paginated, hence the optional config. For instance:
```javascript
const root= new Root({ pagination: { queryString: 'page', begin: 1, end: 100 }})

```

Public methods:

| Name        | Description                                                                                               |
|-------------|-----------------------------------------------------------------------------------------------------------|
| getData()   | Gets all data collected by this operation. In the case of root, it will just be the entire scraping tree. |
| getErrors() | In the case of root, it will show all errors in every operation.|                                                   

&nbsp;

## class Openlinks(querySelector,[config])

Responsible for "opening links" in a given page. Basically it just creates a nodelist of anchor elements, fetches their html, and continues the process of scraping, in those pages - according to the user-defined scraping tree.

The optional config can have these properties:

```javascript
{
    name:'some name',//Like every operation object, you can specify a name, for better clarity in the logs.
    pagination:{},//Look at the pagination API for more details.
    getElementList:(elementList)=>{},//Is called each time an element list is created. In the case of OpenLinks, will happen with each list of anchor tags that it collects. Those elements all have Cheerio methods available to them.
    afterOneLinkScrape:(cleanData)=>{}//Called after every all data was collected from a link, opened by this operation.(if a given page has 10 links, it will be called 10 times, with the child data).
    beforeOneLinkScrape:(axiosResponse)=>{}//Will be called after a link's html was fetched, but BEFORE the child operations are performed on it(like, collecting some data from it). Is passed the axios response object. Notice that any modification to this object, might result in an unexpected behavior with the child operations of that page.
    afterScrape:(data)=>{},//Is called after all scraping associated with the current "OpenLinks" operation is completed(like opening 10 pages, and downloading all images form them). Notice that if this operation was added as a child(via "addOperation()") in more than one place, then this callback will be called multiple times, each time with its corresponding data.
    slice:[start,end]//You can define a certain range of elements from the node list.Also possible to pass just a number, instead of an array, if you only want to specify the start. This uses the Cheerio/Jquery slice method.
}

```
Public methods:

| Name        | Description                                    |
|-------------|------------------------------------------------|
| getData()   | Will get the data from all pages processed by this operation|
| getErrors() | Gets all errors encountered by this operation. |

&nbsp;

## class CollectContent(querySelector,[config])
Responsible for simply collecting text/html from a given page.
The optional config can receive these properties:
```javascript
{
    name:'some name',
    contentType:'text',//Either 'text' or 'html'. Default is text.   
    shouldTrim:true,//Default is true. Applies JS String.trim() method.
    getElementList:(elementList)=>{},  
    getElementContent:(elementContentString)=>{}//Called with each element collected.  
    afterScrape:(data)=>{},//In the case of CollectContent, it will be called with each page, this operation collects content from.
    slice:[start,end]
}

```
Public methods:

| Name      | Description                                |
|-----------|--------------------------------------------|
| getData() | Gets all data collected by this operation. |

&nbsp;

## class DownloadContent(querySelector,[config])
Responsible downloading files/images from a given page.
The optional config can receive these properties:
```javascript
{
    name:'some name',
    contentType:'image',//Either 'image' or 'file'. Default is image.
    alternativeSrc:['first-alternative','second-alternative']//Some images might not have an actual "src", but a data:url. You can provide as many alternative src's as you wish. If the scraper doesn't find a valid src, it will try the alternatives.  
    getElementList:(elementList)=>{},    
    afterScrape:(data)=>{},//In this case, it will just return a list of downloaded items.
    filePath:'./somePath',//Overrides the global filePath passed to the Scraper config.
    fileFlag:'wx',//Overrides the global fileFlag.
    imageResponseType:'arraybuffer',//Overrides the global imageResponseType.Notice that this is relevant only for images. Other files are always of responseType stream.
    slice:[start,end]
}

```


Public methods:

| Name        | Description                                    |
|-------------|------------------------------------------------|
| getData()   | Gets all file names that were downloaded, and their relevant data     |
| getErrors() | Gets all errors encountered by this operation. |


&nbsp;

## class Inquiry(conditionFunction)
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

Notice that this whole thing could also be achieved simply by using callbacks, with the OpenLinks operation.

Public methods:

| Name        | Description                                    |
|-------------|------------------------------------------------|
| getData()   | Gets all inquiries    |

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

### Repeating failed requests on the fly

nodejs-web-scraper will automatically repeat every failed request(except 404). Number of repetitions depends on the global config option "maxRetries", which you pass to the Scraper. If a request fails "indefinitely", it will be skipped, and an object representing it will be pushed into a "failedRequests" array. After the entire scraping process is complete, all failed objects will be printed as a JSON into a file called **"failedRequests.json"**(assuming you provided a logPath). 

### Repeating all failedRequests again, after scraping process has ended
After Scraper.scrape() has has come to an end, and if the failedRequests array isn't empty, nodejs-web-scraper **will prompt you from the console**, asking you if you want to repeat those failed requests. Notice that this is totally separate from the automatic repetition of failed requests, discussed before. If you press "y", the repetition will begin, and you will be prompted again and again - until all requests have finally succeeded. You can just press "n" at any time, if you do not wish to repeat.  

## Memory consumption

In scraping jobs that require the "opening" of many large HTML pages at the same time(some sites completely bloat their HTML. I'm using regex to clean-up scripts and CSS), memory consumption can reach about 250MB. This is of course fine, **but if you're using Chrome devtools for debugging,  consumtion can sky-rocket**. I do not know why this happens, but the solution is to shutdown the devtools. 

## Concurrency

nodejs-web-scraper uses a rather complex concurrency management. Being that the memory consumption can get very high in certain scenarios, I've force-limited the concurrency of pagination and "nested" OpenLinks operations. It should still be very quick. As a general note, i recommend to limit the concurrency to 10 at most.













