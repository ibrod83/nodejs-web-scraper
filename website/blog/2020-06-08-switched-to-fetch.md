---
title: Switched to node-fetch
author: ibrod83
author_title: Creator
author_url: https://github.com/ibrod83
author_image_url: https://avatars3.githubusercontent.com/u/26907377?s=460&u=73e13f8f9afaad5f421d61ed4d416ff2f7471c07&v=4
tags: []
---
I've replaced Axios for node-fetch, for better proxy support(fully tested, with https://luminati.io/). The interface exposed for the user is virtually the same("proxy" config fields now requires a string, not an object).

<!--truncate-->

Also added a "getException" hook to Root, OpenLinks and DownloadContent classes.