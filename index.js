const CollectContent = require('./operations/CollectContent'),
    OpenLinks = require('./operations/OpenLinks'),
    DownloadContent = require('./operations/DownloadContent'),
    Root = require('./operations/Root'),
    ScrollToBottom = require('./limitedSpa/ScrollToBottom'),
    // Click = require('./limitedSpa/Click'),
    Scraper = require('./Scraper.js');

module.exports = {
    Scraper,
    Root,
    DownloadContent,
    OpenLinks,
    CollectContent,
    ScrollToBottom,
    // Click
    // SubmitForm
};








