const { Scraper, Root, DownloadContent, Inquiry, OpenLinks, CollectContent } = require('./scraper');
// const axios = require('axios');
// const Promise = require('bluebird');
const fs = require('fs');

(async () => {
    //***********all mocks*********** */
    // 'bookSiteCategory'
    // 'cnn'
    // 'slovakSite'
    // 'nytimes'
    // 'books_america'
    // 'google'
    // 'foxnews'
    // 'xhamster'
    // 'walla'
    // 'basicauth'
    // 'pagination'
    // 'files'
    // 'zap'
    // 'wplogin'
    // 'booksnextbutton'
    // 'bbc'
    // 'skynews'
    // 'typeface'

    var config = {
        concurrency: 2,
        fileFlag: 'w',
        maxRetries: 3,
        cloneImages: false,
        delay: 50,
        imageResponseType: 'arraybuffer',
        filePath: './images/',
        logPath: './'
    }
    var goodPages = [];
    const currentMockClientCode = 'cnn';
    await mockClientCode(currentMockClientCode);

    async function mockClientCode(siteName) {
        switch (siteName) {

            case 'typeface':

            config = {
                ...config,
                baseSiteUrl: `https://www.grillitype.com/`,
                startUrl: `https://www.grillitype.com/typeface/gt-america/`,
                // headers: {'chuj': 'ci w dupe'}
            }

            var scraper = new Scraper(config);

            var root = new Root();         


            var image = new DownloadContent('img', { name: 'image'});

           
            root.addOperation(image);
          



            await execute();

            break;


            case 'skynews':

                config = {
                    ...config,
                    baseSiteUrl: `https://news.sky.com/`,
                    startUrl: `https://news.sky.com/`,
                    // headers: {'chuj': 'ci w dupe'}
                }
                // {pagination:{nextButton:'a#pnnext',numPages:10}}
                var scraper = new Scraper(config);

                var root = new Root();
                var category = new OpenLinks(".sdc-news-header__nav-item a", { name: 'category', slice: [0, 2] });

                var article = new OpenLinks(".sdc-news-story-grid__link ", { name: 'article' });


                var h1 = new CollectContent('h1', { name: 'h1' });
                // var image = scraper.createOperation('download', 'img', { name: 'image' });    
                var image = new DownloadContent('img', { name: 'image', filePath: './sky_news' });

                category.addOperation(article);
                root.addOperation(category);
                article.addOperation(image)
                article.addOperation(h1)
                // root.addOperation(image);



                await execute();

                break;


            case 'bbc':

                config = {
                    ...config,
                    baseSiteUrl: `https://www.bbc.com/`,
                    startUrl: `https://www.bbc.com/news`,
                    // headers: {'chuj': 'ci w dupe'}
                }
                // {pagination:{nextButton:'a#pnnext',numPages:10}}
                var scraper = new Scraper(config);
                var root = new Root();
                var category = new OpenLinks(".gs-o-list-ui__item--flush.gel-long-primer.gs-u-display-block.nw-c-nav__wide-menuitem-container a", { name: 'category', slice: [0, 3] });
                var article = new OpenLinks('.title-link', { name: 'article', });
                var h1 = new CollectContent('h1', { name: 'h1' });
                // var image = scraper.createOperation('download', 'img', { name: 'image' });    
                var image = new DownloadContent('img', { name: 'image' });
                category.addOperation(article);
                root.addOperation(category);
                article.addOperation(image)
                article.addOperation(h1)
                // root.addOperation(image);



                await execute();

                break;


            case 'wplogin':

                config = {
                    ...config,
                    baseSiteUrl: `https://wp.ibrod83.com/`,
                    startUrl: `https://wp.ibrod83.com/wp-admin/`,
                    headers: { "cookie": "wordpress_sec_84e4a2b34e96c8150d68d6c513eb121c=admin%7C1538056126%7CQybuTfcABd2myFi7pqbY5nYwVRE3NT7WwfZhsiU23se%7C7d9792f6189aacebeaf4254dbb3a1c82678dae4f567d8997ce953af7affd795e; wordpress_test_cookie=WP+Cookie+check; wordpress_logged_in_84e4a2b34e96c8150d68d6c513eb121c=admin%7C1538056126%7CQybuTfcABd2myFi7pqbY5nYwVRE3NT7WwfZhsiU23se%7Cb2c5a4fb4d5482eec775ca875b629aa36e6f881efeac5b983e24e39cb35821c1" },

                }


                var scraper = new Scraper(config);
                var root = new Root()
                var a = scraper.createOperation({ type: 'collectContent', querySelector: 'a', name: 'a' });
                var image = scraper.createOperation({ type: 'download', querySelector: 'img', name: 'image' });
                root.addOperation(a);
                root.addOperation(image);





                await execute();

                break;

            case 'zap':

                config = {
                    ...config,
                    baseSiteUrl: `https://www.zap.co.il`,
                    startUrl: `https://www.zap.co.il/cat.aspx?cat=electric`,
                    // headers: {'chuj': 'ci w dupe'}
                }

                const processPaginationUrl = async (url) => {
                    console.log('pagination url from callback!', url)
                    return url
                }
                // {pagination:{nextButton:'a#pnnext',numPages:10}}
                var scraper = new Scraper(config);
                var root = new Root()
                var category = new OpenLinks(".LinksList a", { name: 'category', slice: 2, pagination: { queryString: 'pageinfo', begin: 1, end: 10, processPaginationUrl } });
                var product = new OpenLinks('.ProdInfoTitle a, .ProdName a', { name: 'product', });
                var h1 = new CollectContent('.ProdName h1', { name: 'h1' });
                // var image = scraper.createOperation('download', 'img', { name: 'image' });    
                var image = new DownloadContent('.ProductPic img', { name: 'image', filePath: "./overridepath/" });
                category.addOperation(product);
                root.addOperation(category);
                product.addOperation(image)
                product.addOperation(h1)
                // root.addOperation(image);



                await execute();

                break;

            case 'files':

                // config = {
                //     ...config,
                //     baseSiteUrl: `http://localhost:3333/`,
                //     startUrl: `http://localhost:3333/`,
                //     // headers: {'chuj': 'ci w dupe'}
                // }
                config = {
                    ...config,
                    baseSiteUrl: `http://www.internetdownloadmanager.com`,
                    startUrl: `http://www.internetdownloadmanager.com/download.html`,
                    // headers: {'chuj': 'ci w dupe'}
                }
                // {pagination:{nextButton:'a#pnnext',numPages:10}}
                var scraper = new Scraper(config);
                var root = new Root()
                var file = new DownloadContent("a", { name: 'file', contentType: 'file' });


                root.addOperation(file);




                await execute();

                break;



            case 'walla':

                config = {
                    ...config,
                    baseSiteUrl: `https://www.walla.co.il/`,
                    startUrl: `https://www.walla.co.il/`,
                    // headers: {'chuj': 'ci w dupe'}
                }
                // {pagination:{nextButton:'a#pnnext',numPages:10}}
                var scraper = new Scraper(config);
                var root = new Root()
                var category = new OpenLinks("li[role='menuitem'] a", { name: 'category', slice: [0, 2] });
                var article = new OpenLinks('article a', { name: 'article', });
                var p = new CollectContent('p', { name: 'p' });
                // var image = scraper.createOperation('download', 'img', { name: 'image' });    
                var image = new DownloadContent('img', { name: 'image' });
                category.addOperation(article);
                root.addOperation(category);
                article.addOperation(image)
                article.addOperation(p)
                // root.addOperation(image);



                await execute();

                break;

            case 'xhamster':

                config = {
                    ...config,
                    baseSiteUrl: `https://xhamster.com/`,
                    startUrl: `https://xhamster.com/`,
                }

                var scraper = new Scraper(config);
                var root = new Root({pagination: { routingString: '/', begin: 1, end: 100 } });

                var a = new CollectContent('.video-thumb-info a', {name: 'a' });

                var image = new DownloadContent('img', {name: 'image' });

                root.addOperation(a);
                root.addOperation(image);



                await execute();

                break;

            case 'foxnews':

                config = {
                    ...config,
                    baseSiteUrl: `http://www.foxnews.com`,
                    startUrl: `http://www.foxnews.com/`,
                }
                // {pagination:{nextButton:'a#pnnext',numPages:10}}
                var scraper = new Scraper(config);
                var root = new Root()
                var category = scraper.createOperation({ type: 'openLinks', querySelector: 'li a', name: 'category' });
                var article = scraper.createOperation({ type: 'openLinks', querySelector: 'article a', name: 'article' });
                var h1 = scraper.createOperation({ type: 'collectContent', querySelector: 'h1', name: 'h1' });
                var image = scraper.createOperation({ type: 'download', querySelector: 'img', name: 'image' });
                // var articleImage = scraper.createOperation('image', 'img', { name: 'article image' });

                root.addOperation(category);
                category.addOperation(article);
                article.addOperation(h1);
                article.addOperation(image);


                await execute();

                break;

            case 'google':
                const processUrl = async (originalUrl) => {
                    // console.log('ogirinal url', originalUrl)
                    const newUrl = originalUrl.replace('https://www.google.com/url?q=', '')
                    // console.log('originalUrl:', originalUrl, 'new url', newUrl)
                    // return newUrl;
                    return originalUrl;
                }
                config = {
                    ...config,
                    baseSiteUrl: `https://www.google.com/`,
                    startUrl: `https://www.google.com/search?ei=HiSgW8GsLsaXsAfPpI_ABg&q=america&oq=america&gs_l=psy-ab.3..35i39k1j0i67k1l8j0i203k1.92389.93155.0.93233.7.6.0.0.0.0.181.466.0j3.3.0....0...1c.1.64.psy-ab..4.3.466...0i131k1.0.gYwRap2SNDY`,
                }
                // {pagination:{nextButton:'a#pnnext',numPages:10}}
                var scraper = new Scraper(config);
                var root = new Root({pagination: { queryString: 'start', begin: 0, end: 20, offset: 10 } });
                var americaPage = new OpenLinks('h3.r a', {name: 'americaPage', processUrl });
                var h1 = new CollectContent('h1', {name: 'h1' });
                var image = new DownloadContent('img', {name: 'image', processUrl });
                // var articleImage = scraper.createOperation('image', 'img', { name: 'article image' });

                root.addOperation(americaPage);
                americaPage.addOperation(h1);
                americaPage.addOperation(image);


                await execute();

                // allErrors = root.getErrors();
                // fs.writeFile('./allErrors.json', JSON.stringify(allErrors), (err) => {
                //     if (err) {
                //         console.log(err)
                //     } else {
                //         console.log('allErrors has been saved!');
                //     }
                // });
                break;
            case 'cnn':

                config = {
                    ...config,
                    baseSiteUrl: `https://edition.cnn.com/`,
                    startUrl: `https://edition.cnn.com/sport`,
                }
                var scraper = new Scraper(config);
                var root = new Root()
                var article = new OpenLinks('article a',{ name: 'article' });
                var paragraph = new CollectContent('h1', {name: 'paragraphs' });
                var image = new DownloadContent( 'img.media__image.media__image--responsive', {name: 'image', customSrc: 'data-src-medium' });
                var articleImage = new DownloadContent( 'img', {name: 'article image' });

                article.addOperation(articleImage);
                article.addOperation(paragraph);
                article.addOperation(image);
                root.addOperation(article);
                root.addOperation(paragraph);
                root.addOperation(image);
                root.addOperation(paragraph);

                await execute();

                break;

            case 'bookSiteCategory':



                config = {
                    ...config,
                    baseSiteUrl: `https://ibrod83.com`,
                    startUrl: `https://ibrod83.com/books`,
                    // startUrl: `https://ibrod83.com/books/product/2/search?filter=Category`,
                }

                const childData = [];
                const afterScrape = async (dataFromChildren) => {
                    console.log('data from afterScrape', dataFromChildren)
                    childData.push(dataFromChildren);
                }



                var getNodeList = (nodeList) => {
                    console.log('nodelist from callback', nodeList)
                    nodeList.splice(1);
                }
                const condition = (response) => {
                    if (response.data.includes('רמת גן')) {
                        return true;
                    }
                }

                // scraper.createOperation({type: 'openLinks',querySelector: '#content_65 ol a:eq(0)',name: 'category'})
                var scraper = new Scraper(config);
                var root = new Root()
                var categoryPage = new OpenLinks('#content_65 ol a:eq(0)', {name: 'category', pagination: { queryString: 'page', begin: 1, end: 2 } });
                var inquiryOfPage = new Inquiry(condition);

                var productPage = new OpenLinks('.product_name_link', {name: 'product' });
                root.addOperation(categoryPage);
                categoryPage.addOperation(productPage);
                var publisherData = new CollectContent( '.product_publisher',{ name: 'publisher' });
                var productName = new CollectContent( '.product_name',{ name: 'name' });
                var productImage = new DownloadContent('.book img', {name: 'image', imageResponseType: 'arraybuffer', afterScrape });
                productPage.addOperation(publisherData);
                productPage.addOperation(inquiryOfPage);
                productPage.addOperation(productImage);
                productPage.addOperation(productName);

                await execute();
                fs.writeFile('./inquiry.json', JSON.stringify(inquiryOfPage.getData()));

                break;
            case 'books_america':

                config = {
                    ...config,
                    baseSiteUrl: `https://ibrod83.com`,
                    startUrl: `https://ibrod83.com/books/Product/america/search?items_per_page=144&filter=NameOrAuthor&location=all`,
                }

                var scraper = new Scraper(config);

                var root = scraper.createOperation({ type: 'root', pagination: { queryString: 'page', begin: 1, end: 5 } });
                var product = scraper.createOperation({ type: 'openLinks', querySelector: '.product_name_link', name: 'product', });
                root.addOperation(product);
                var publisherData = scraper.createOperation({ type: 'collectContent', querySelector: '.product_publisher', name: 'publisher', });
                var productName = scraper.createOperation({ type: 'collectContent', querySelector: '.product_name', name: 'name', });
                var authorData = scraper.createOperation({ type: 'collectContent', querySelector: '.product_author', name: 'author', contentType: 'html' });
                var productImage = scraper.createOperation({ type: 'download', querySelector: ' img', name: 'image' });

                product.addOperation(publisherData);
                product.addOperation(authorData);
                product.addOperation(productImage);
                product.addOperation(productName);

                await execute();

                break;
            case 'slovakSite':
                const codes = []
                const getResponse = async (response) => {

                    // if (response.data.includes('Anglický jazyk - Pokročilý (C1)')) {
                    //     console.log('includes!', response.config.url)
                    //     goodPages.push(response.config.url)
                    // }
                    codes.push(response.status)
                    console.log('response  from processReponse!', response)
                }


                config = {
                    ...config,
                    baseSiteUrl: `https://www.profesia.sk`,
                    startUrl: `https://www.profesia.sk/praca/`,
                }
                var scraper = new Scraper(config);

                var root = scraper.createOperation({ type: 'root', pagination: { queryString: 'page_num', begin: 1, end: 10 } });
                var productLink = scraper.createOperation({ type: 'openLinks', querySelector: '.list-row a.title', name: 'link', getResponse });
                var span = scraper.createOperation({ type: 'collectContent', querySelector: 'span', name: 'span' });
                root.addOperation(productLink);
                root.addOperation(span);
                var paragraph = scraper.createOperation({ type: 'collectContent', querySelector: 'h4,h2', name: 'h4&h2' });
                root.addOperation(paragraph);

                var productImage = scraper.createOperation({ type: 'download', querySelector: 'img:first', name: 'image' });

                productLink.addOperation(paragraph);
                // productLink.addOperation(productImage);
                await execute();
                console.log('codes!', codes)
                console.log(goodPages.length)
                fs.writeFile('./links.json', JSON.stringify(goodPages), (err) => {
                    if (err) {
                        console.log(err)
                    } else {
                        console.log('The file has been saved!');
                    }

                });


                break;

            case 'nytimes':

                config = {
                    ...config,
                    baseSiteUrl: `https://www.nytimes.com/`,
                    startUrl: `https://www.nytimes.com/`,
                }
                var scraper = new Scraper(config);
                var root = new Root()
                var category = scraper.createOperation({ type: 'openLinks', querySelector: '.css-1wjnrbv', name: 'category' });
                var article = scraper.createOperation({ type: 'openLinks', querySelector: 'article a', name: 'article' });
                var h1 = scraper.createOperation({ type: 'collectContent', querySelector: 'h1', name: 'h1' });
                var image = scraper.createOperation({ type: 'download', querySelector: 'img', name: 'image' });

                root.addOperation(category);
                article.addOperation(image);
                category.addOperation(article);
                article.addOperation(h1);


                await execute();

                break;


            default:
                break;

            // case 'pagination':

            // config = {
            //     ...config,
            //     baseSiteUrl: `https://ibrod83.com/pagination`,
            //     startUrl: `https://ibrod83.com/pagination`,
            //     // headers: {'chuj': 'ci w dupe'}
            // }
            // // {pagination:{nextButton:'a#pnnext',numPages:10}}
            // var scraper = new Scraper(config);
            // var root = scraper.createOperation('root');
            // var main = scraper.createOperation('openLinks', "a", { name: 'main' });
            // var outer = scraper.createOperation('openLinks', 'a', { name: 'outer pagination',pagination: { routingString: '/', begin: 1, end: 2 }});
            // var inner = scraper.createOperation('openLinks', 'a', { name: 'inner pagination',pagination: { routingString: '/', begin: 1, end: 2 }});
            // var p = scraper.createOperation('collectContent', 'p', { name: 'p' });


            // root.addOperation(main);
            // main.addOperation(outer)
            // outer.addOperation(inner)
            // // root.addOperation(image);

            // root.addOperation(p);
            // main.addOperation(p)
            // outer.addOperation(p)



            // await execute();

            // break;
        }

        async function execute(productPage) {
            console.log('root', root);
            try {
                await scraper.scrape(root);
                // const productTree = productPage.getData();
                // if (typeof productTree !== 'undefined') {
                //     await scraper.createLog({fileName:'productTree',object:productTree})
                // }

                // console.log('number of failed objects:', scraper.failedScrapingObjects.length)
                // console.log('average page request in seconds:', overallSeconds / overallPageRequests)
                console.log('no errors, all done')
            } catch (error) {
                console.error('there was an error in the root selector', error);

            }
        }
    }







    //**************************books site category ***********************/

    // const config = {
    //     baseSiteUrl: `https://ibrod83.com`,
    //     startUrl: `https://ibrod83.com/books`,
    //     concurrency: 5,
    //     fileFlag: 'wx'
    // }
    // const scraper = new Scraper(config);

    // const root = scraper.createOperation('root');
    // //pagination: { queryString: 'page', numPages: 3 }
    // // const productPage = scraper.createOperation('page', '.product_name_link');

    // // let productPage;



    // // ,pagination: { queryString: 'page', numPages: 2 }
    // const productPage = scraper.createOperation('page', { querySelector: '.product_name_link', name: 'product', pagination: { queryString: 'page', numPages: 100 } });
    // const categoryPage = scraper.createOperation('page', { querySelector: '#content_65 ol a:eq(0)', name: 'category' });
    // // const categoryPage = scraper.createOperation('page', { querySelector: '.category_selector a', name: 'category' });
    // root.addOperation(categoryPage);
    // categoryPage.addOperation(productPage);
    // const publisherData = scraper.createOperation('content', { querySelector: '.product_publisher', name: 'publisher' });
    // const productName = scraper.createOperation('content', { querySelector: '.product_name', name: 'name' });
    // const authorData = scraper.createOperation('content', { querySelector: '.product_author', name: 'author' });
    // const productImage = scraper.createOperation('image', { querySelector: '.book img', name: 'image' });
    // // root.addOperation(productImage)
    // // root.addOperation(productPage)
    // productPage.addOperation(publisherData);
    // productPage.addOperation(authorData);
    // productPage.addOperation(productImage);
    // productPage.addOperation(productName);
    // // root.addOperation(productImage)




    //stackoverflow site****************************/
    // const config = {
    //     baseSiteUrl: `https://stackoverflow.com/`,
    //     startUrl: `https://stackoverflow.com/`
    // }
    //     const root = new RootSelector(config);
    //     const postPage = new PageSelector({ querySelector: '.question-hyperlink', name: 'page' });
    //     root.addOperation(postPage)
    //     const avatarImage = new ImageSelector({ querySelector: '.gravatar-wrapper-32 img', name: 'avatar' });
    //     const data = new ContentSelector({ querySelector: '.post-text', name: 'posttext' });
    //     postPage.addOperation(avatarImage)
    //     // data.processText= function(text){
    //     //     return text+text
    //     // }
    //     postPage.addOperation(data);


    //     try {
    //       await root.scrape();
    //       var entireTree = root.getCurrentData();
    //       console.log('no errors, all done, number of images:', downloadedImages)
    //   } catch (error) {
    //       console.log('error from outer scope', error)
    //       console.log('there was an error somewhere in the promises, killing the script');
    //       process.exit();

    //   }

    //********************w3schools site */
    // const config = {
    //     baseSiteUrl: `https://www.w3schools.com/`,
    //     startUrl: `https://www.w3schools.com/`
    // }
    // const root = new RootSelector(config);

    // // const productPage = new PageSelector({ querySelector: '.product_name_link', name: 'product' });
    // // const categoryPage = new PageSelector({ querySelector: '#content_65 ol a', name: 'category' });

    // // categoryPage.addOperation(productPage);
    // const paragraphs = new ContentSelector({ querySelector: 'p', name: 'paragraphs' });
    // root.addOperation(paragraphs);
    // // const productName = new ContentSelector({ querySelector: '.product_name', name: 'name' });
    // // const authorData = new ContentSelector({ querySelector: '.product_author', name: 'author' });
    // const productImage = new ImageSelector({ querySelector: 'img', name: 'image' });
    // root.addOperation(productImage);
    // try {
    //     await root.scrape();
    //     var entireTree = root.getCurrentData();
    //     console.log('no errors, all done, number of images:', downloadedImages)
    // } catch (error) {
    //     console.log('error from outer scope', error)
    //     console.log('there was an error somewhere in the promises, killing the script');
    //     process.exit();

    // }
    //************************************ */

    //*******************slovak site ******************************/

    // const config = {
    //     baseSiteUrl: `https://www.profesia.sk`,
    //     startUrl: `https://www.profesia.sk/praca/`
    // }
    // const scraper = new Scraper();
    // const root = scraper.createOperation('root', config);
    // const productLink = scraper.createOperation('page', { querySelector: '.list-row a.title', name: 'link', pagination: { queryString: 'page_num', numPages: 10 } });
    // root.addOperation(productLink);
    // const paragraph = scraper.createOperation('content', { querySelector: 'p', name: 'P' });


    // const productImage = scraper.createOperation('image', { querySelector: 'img:first', name: 'image' });

    // productLink.addOperation(paragraph);
    // productLink.addOperation(productImage);



    //********concurrency site******************* */
    // const config = {
    //     baseSiteUrl: `https://ibrod83.com/concurrency/`,
    //     startUrl: `https://ibrod83.com/concurrency`
    // }

    // const root = new RootSelector(config);
    // const productPage = new PageSelector({ querySelector: 'a', name: 'innerpage' });
    // root.addOperation(productPage);
    // const productImage = new ImageSelector({ querySelector: 'img', name: 'image' });
    // productPage.addOperation(productImage);
    // try {
    //    await root.scrape(); 
    // } catch (error) {
    //     console.log(error);
    //     return;
    // }

    // const entireTree = root.getCurrentData();
    // console.log(entireTree);

    //************************************** */

    //***********************ynet************* */
    // const config = {
    //     baseSiteUrl: `https://www.ynet.co.il/`,
    //     startUrl: `https://www.ynet.co.il/`
    // }
    // const root = new RootSelector(config);
    // const category = new PageSelector({ querySelector: '.hdr_isr.hdr_abr a', name: 'category' });
    // const image = new ImageSelector({ querySelector: 'img', name: 'image' });
    // // const article = new PageSelector({ querySelector: '.top-story-text a', name: 'article' });
    // // category.addOperation(article)
    // category.addOperation(image)
    // root.addOperation(category);


    // // article.addOperation(image);


    //******************book site normal************************/
    // const config = {
    //     baseSiteUrl: `https://ibrod83.com/`,
    //     startUrl: `https://ibrod83.com/books/product/america/search?filter=&items_per_page=12`
    // }
    // const root = new RootSelector(config);
    // // ,pagination:{queryString:'page',numPages:10}
    // const productPage = new PageSelector({ querySelector: '.col-md-2 .product_name_link', name: 'product', pagination: { queryString: 'page', numPages: 10 } });
    // root.addOperation(productPage);
    // const publisherData = new ContentSelector({ querySelector: '.product_publisher', name: 'publisher' });
    // const productName = new ContentSelector({ querySelector: '.product_name', name: 'name' });
    // const authorData = new ContentSelector({ querySelector: '.product_author', name: 'author' });
    // const productImage = new ImageSelector({ querySelector: '.book img', name: 'image' });
    // // root.addOperation(productImage)
    // productPage.addOperation(publisherData);
    // productPage.addOperation(authorData);
    // productPage.addOperation(productImage);
    // productPage.addOperation(productName);
    // try {
    //     await root.scrape();
    //     var entireTree = root.getCurrentData();
    //     console.log(entireTree);
    //     // var productTree = productPage.getAllData();
    //     var productTree = productPage.getCurrentData();
    //     var allErrors = root.getErrors();
    //     // var allImages = productImage.getAllData();
    //     if (allErrors.length == 0) {
    //         console.log('no errors, all done, number of images:', downloadedImages)
    //     } else {
    //         console.log(`all done, with ${allErrors.length} errors. number of images:`, downloadedImages)
    //         console.log('overall errors from global variable:', overallErrors)
    //     }

    // } catch (error) {
    //     console.log('Error from root selector', error)
    //     process.exit();

    // }
    //******************************************************* */

    // const beginTime = Date.now();
    // try {
    //     await root.scrape();
    //     console.log('number of images:', downloadedImages);
    // } catch (error) {
    //     console.log('error from outer scope', error)
    //     console.log('there was an error somewhere in the promises, killing the script');
    //     process.exit();

    // }
    // const endTime = Date.now();
    // console.log('operation took:', (endTime - beginTime) / 1000);

    // // await root.scrape()
    // const entireTree = root.getCurrentData();
    // const productTree = productPage.getCurrentData();
    // // const stockTree = stock.getCurrentData();
    // console.log(util.inspect(entireTree, false, null));
    // console.log(productTree);
    // const errors = root.getErrors();
    // const imageErrors = productImage.getErrors();
    // const categoryErrors = categoryPage.getErrors();
    // const productErrors = productPage.getErrors();
    // console.log('all errors:', errors)
    // console.log('image errors:', imageErrors)
    // return;




    // console.log('root', root);
    // try {
    //     await root.scrape();
    //     var entireTree = root.getData();
    //     console.log('number of failed objects:', scraper.failedScrapingObjects.length)
    //     await scraper.createLog({ fileName: 'log', object: entireTree })
    //     await scraper.createLog({ fileName: 'failedObjects', object: scraper.failedScrapingObjects })

    //     if (scraper.failedScrapingObjects.length > 0) {

    //         // console.log('number of failed objects:', scraper.failedScrapingObjects.length, 'repeating')

    //         await scraper.repeatErrors();
    //         var entireTree = root.getData();
    //         await scraper.createLog({ fileName: 'log', object: entireTree })
    //         await scraper.createLog({ fileName: 'failedObjects', object: scraper.failedScrapingObjects })

    //     }
    //     console.log('no errors, all done, number of images:', downloadedImages)
    // } catch (error) {
    //     // console.log('error from outer scope', error)
    //     console.error('there was an error in the root selector', error);
    //     // process.exit();

    // }
    // fs.writeFile('./failedObjects.json', JSON.stringify(root.context.failedScrapingObjects), (err) => {
    //     if (err) {
    //         console.log(err)
    //     } else {
    //         console.log('The file has been saved!');
    //     }

    // });
    // if (typeof entireTree !== 'undefined') {
    //     fs.writeFile('./log.json', JSON.stringify(entireTree), (err) => {
    //         if (err) {
    //             console.log(err)
    //         } else {
    //             console.log('The file has been saved!');
    //         }

    //     });
    // }

    // if (scraper.failedScrapingObjects.length > 0) {
    //     // console.log('number of failed objects:', scraper.failedScrapingObjects.length, 'repeating')

    //     await scraper.repeatErrors();
    // }

    // console.log('notfounderrors', notFoundErrors)

    // if (allErrors) {
    //     fs.writeFile('./errors.json', JSON.stringify(allErrors), (err) => {
    //         if (err) {
    //             console.log(err)
    //         } else {
    //             console.log('The file has been saved!');
    //         }

    //     });
    // }

    // fs.writeFile('./image_errors.json', JSON.stringify(imageErrors), (err) => {
    //     if (err) {
    //         console.log(err)
    //     } else {
    //         console.log('The file has been saved!');
    //     }

    // });
    // fs.writeFile('./product_errors.json', JSON.stringify(productErrors), (err) => {
    //     if (err) {
    //         console.log(err)
    //     } else {
    //         console.log('The file has been saved!');
    //     }

    // });
    // fs.writeFile('./category_errors.json', JSON.stringify(categoryErrors), (err) => {
    //     if (err) {
    //         console.log(err)
    //     } else {
    //         console.log('The file has been saved!');
    //     }

    // });
    // if(productTree) {

    //     fs.writeFile('./products.json', JSON.stringify(productTree), (err) => {
    //         if (err) {
    //             console.log(err)
    //         } else {
    //             console.log('The file has been saved!');
    //         }

    //     });

    // }
    // if(allImages) {
    //     fs.writeFile('./images.json', JSON.stringify(allImages), (err) => {
    //         if (err) {
    //             console.log(err)
    //         } else {
    //             console.log('The file has been saved!');
    //         }

    //     });

    // }




})()

 // // root
    // //     .addOperation(
    // //         scraper.createOperation('page', { querySelector: '#content_65 ol a:first', name: 'category' })
    // //             .addOperation(
    // //                 productPage = scraper.createOperation('page', { querySelector: '.product_name_link', name: 'product' })
    // //             )
    // //     )
    // //     .addOperation(
    // //         scraper.createOperation('content', { querySelector: '.product_publisher', name: 'publisher' })
    // //     )
    // //     .addOperation(
    // //         scraper.createOperation('content', { querySelector: '.product_author', name: 'author' })
    // //     )
    // //     .addOperation(
    // //         scraper.createOperation('image', { querySelector: '.book img', name: 'image' })
    // //     )
    // //     .addOperation(
    // //         scraper.createOperation('content', { querySelector: '.product_name', name: 'name' })
    // //     );