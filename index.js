const CollectContent = require('./operations/CollectContent'),
    Inquiry = require('./operations/Inquiry'),
    OpenLinks = require('./operations/OpenLinks'),
    DownloadContent = require('./operations/DownloadContent'),
    // SubmitForm = require('./operations/SubmitForm'),
    Root = require('./operations/Root'),
    ScrollToBottom = require('./spa/ScrollToBottom'),
    Scraper = require('./Scraper.js');

module.exports = {
    Scraper,
    Root,
    DownloadContent,
    Inquiry,
    OpenLinks,
    CollectContent,
    ScrollToBottom
    // SubmitForm
};








