```javascript

    var config = {
        baseSiteUrl: `https://www.some-site.com/`,
        startUrl: `https://www.some-site.com/products`,
        filePath: './images/',
        concurrency: 10,
        maxRetries: 3 
     }

    var products = [];

    var getPageObject = (pageObject) => {
        products.push(pageObject)
    }

    var scraper = new Scraper(config);   

    var root = new Root();
    var product = new OpenLinks('.product-link', { getPageObject });
    var image = new DownloadContent('.product-image'); 
    var title = new CollectContent('.product-title');
    var price = new CollectContent('.product-price');   

    root.addOperation(product);
      product.addOperation(title);
      product.addOperation(image);
      product.addOperation(price);     

    await scraper.scrape(root);

    fs.writeFile('./products.json', JSON.stringify(products), () => { })

```

```javascript

    var config = {
        baseSiteUrl: `https://www.some-site.com/`,
        startUrl: `https://www.some-site.com/articles`,       
        concurrency: 10,
        maxRetries: 3 
     }

    var htmls = [];

    var getHtml = (html) => {
        htmls.push(html)
    }

    var scraper = new Scraper(config);   

    var root = new Root();
    var article = new OpenLinks('.article', { getHtml });  

    root.addOperation(article);

    await scraper.scrape(root);










```