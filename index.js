const CollectContent = require('./operations/CollectContent'),
    OpenLinks = require('./operations/OpenLinks'),
    DownloadContent = require('./operations/DownloadContent'),
    Root = require('./operations/Root'),
    // ScrollToBottom = require('./limitedSpa/ScrollToBottom'),
    // ClickButton = require('./limitedSpa/ClickButton'),
    Scraper = require('./Scraper.js');

module.exports = {
    Scraper,
    Root,
    DownloadContent,
    OpenLinks,
    CollectContent,
    // ScrollToBottom,
    // ClickButton
};








