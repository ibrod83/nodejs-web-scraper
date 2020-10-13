// class Click{
//     constructor(querySelector,config={numRepetitions:1,delay:0}){
//         this.puppeteerSimplePage = null;
//         this.querySelector = querySelector;
//         // this.puppeteerSimplePage = puppeteerSimplePage;
//         this.config={};
//         for(let i in config){
//             this.config[i] = config[i];
//         }
//     }

//     async scrape(puppeteerSimplePage){
//         // debugger;
//         this.puppeteerSimplePage = puppeteerSimplePage;
//         const {numRepetitions,delay} = this.config;
//         await puppeteerSimplePage.click(this.querySelector,{numRepetitions,delay});
//     }

//     validateOperationArguments() {
       
//     }
// }

// module.exports = Click;