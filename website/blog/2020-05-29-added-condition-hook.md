---
title: Added "condition" hook
author: ibrod83
author_title: Creator
author_url: https://github.com/ibrod83
author_image_url: https://avatars3.githubusercontent.com/u/26907377?s=460&u=73e13f8f9afaad5f421d61ed4d416ff2f7471c07&v=4
tags: []
---
In some cases, Cheerio selectors(and even cheerio-advanced-selectors) aren't enough to filter the content you need.

<!--truncate-->

For that purpose, i've added a special condition hook, that is called whenever DownloadContent or OpenLinks creates a node list, before actually scraping it. This provides an opportunity to filter out unwanted "DOM" nodes, that couldn't have been omitted using the Cheerio selector only.

The hook receives a function, that will be called with one argument, a Cheerio node. If the original querySelector returned more than one node, this hook will be activated for each one of them(thus allowing you to filter out the ones you don't need). Simply return true if your conditions are met.

```javascript  

    
    const config = {        
        baseSiteUrl: `https://www.nice-site`,
        startUrl: `https://www.nice-site/some-section`,       
       }

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