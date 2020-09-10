// const ScrapingAction = require('../structures/ScrapingAction')
// function createScrapingActionsForPagination({begin,end,queryString,routingString,offset=1,address,referenceToOperationObject}) {//Divides a given page to multiple pages.
//     // const pagination = config;
//     // delete scrapingAction.successful;
//     const scrapingActions = [];
//     const firstPage = typeof begin !== 'undefined' ? begin : 1;
//     const lastPage = end    

//     for (let i = firstPage; i <= lastPage; i = i + offset) {

//         const mark = address.includes('?') ? '&' : '?';
//         var paginationUrl;
//         var paginationObject;
//         // debugger;
//         if (queryString) {
//             paginationUrl = `${address}${mark}${queryString}=${i}`;
//         } else {

//             paginationUrl = `${address}/${routingString}/${i}`.replace(/([^:]\/)\/+/g, "$1");


//         }
//         // if (pagination.processPaginationUrl) {
//         //     try {
//         //         paginationUrl = await pagination.processPaginationUrl(paginationUrl)
//         //         // console.log('new href', url)
//         //     } catch (error) {

//         //         console.error('Error processing URL, continuing with original one: ', paginationUrl);

//         //     }

//         // }
//         // paginationObject = this.createScrapingAction(paginationUrl);
//         paginationObject = new ScrapingAction(paginationUrl,null,referenceToOperationObject);
//         // this.scraper.state.scrapingActions.push(scrapingAction)
//         scrapingActions.push(paginationObject);

//     }
//     return scrapingActions;
//     // scrapingAction.data = [...scrapingActions];
//     // await this.executeScrapingActions(scrapingActions,(scrapingAction)=>{
//     //     return this.processOneScrapingAction(scrapingAction)
//     // }, 3);//The argument 3 forces lower promise limitation on pagination.
// }

// module.exports = {createScrapingActionsForPagination}