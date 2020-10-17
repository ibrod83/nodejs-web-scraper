// const Operation  = require('../operations/Operation')

// class Click extends Operation{
//     constructor(querySelector,config={numRepetitions:1,delay:0}){
//         super(config)
//         this.querySelector = querySelector;
//     }

//     async scrape({html,url},puppeteerSimplePage){
//         // debugger;
//         // this.puppeteerSimplePage = puppeteerSimplePage;
//         const {numRepetitions,delay} = this.config;
        
//         await puppeteerSimplePage.click(this.querySelector,{numRepetitions,delay});       

//         // this.data.push(...iterations)
//         return { type: this.constructor.name, name: this.config.name, data: [] };
//     }

    

//     validateOperationArguments() {
       
//     }
// }

// module.exports = Click;