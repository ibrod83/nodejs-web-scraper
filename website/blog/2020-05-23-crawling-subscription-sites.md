---
title: Crawling subscription sites
author: ibrod83
author_title: Creator
author_url: https://github.com/ibrod83
author_image_url: https://avatars3.githubusercontent.com/u/26907377?s=460&u=73e13f8f9afaad5f421d61ed4d416ff2f7471c07&v=4
tags: []
---
I'd like to explain how to crawl a website, that requires some form of authentication.

<!--truncate-->

First of all, you'll need to identify the method the site uses. If it's an old-school HTTP Basic authentication,
It can't get easier than that. Just pass the username and password to the Scraper config object:




```javascript
const config = {
        baseSiteUrl: `https://basic-auth-site.com`,
        startUrl: `https://basic-auth-site.com/members`,
        auth:{
            username:'someusername',
            password:'somepassword'
        }       
    }
```

However, most sites these days do not use Basic auth. The most common method for server-side rendered sites is cookie based authentication.

Though Nodejs Web Scraper doesn't have any "out of the box" functionality that covers this, you can pass the "credentials" manually via http headers. In order to do that, follow these steps:

1)Login to your website from the browser, while keeping the developer tools open.

2)Go to application/cookies(in Chrome), or to the network tab, and try to identify the relevant cookies, that the site sets after a successful login. This of course varies from site to site, but it would usually look something like "start_session=dfsf3rf3ffafqdd3r". Note It's possible that the site requires more than cookie.

3)Add the cookie(s) to the headers:

```javascript
const config = {
        baseSiteUrl: `https://cookie-site.com`,
        startUrl: `https://cookie-site.com/members`,
        headers:{
            Cookie:"start_session=dfsf3rf3ffafqdd3r; some_other_cookie_perhaps=dsdewqeqdqwq423rff"
        }      
    }
```
And that's it. If you provide all the cookies(which are nothing more than strings sent via headers) the site requires for the protected area- the web scraper will work :-)