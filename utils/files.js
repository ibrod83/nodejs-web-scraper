const fs = require('fs');
const {promisify} = require('util');
const access = promisify(fs.access);
const mkdir = promisify(fs.mkdir);

function verifyDirectoryExists(path) {//Will make sure the target directory exists.   
    if (!fs.existsSync(path)) {
        console.log('creating dir:', path)
        fs.mkdirSync(path,{recursive:true});
    }
}

// async function verifyDirectoryExists(path){

        
//         try {
//             await access(path);     
//         } catch (error) {
//             console.log('error from verify',error)
//             try {
//                 await mkdir(path);    
//             } catch (error) {
//                 if(error.code !== 'EEXIST'){
//                     throw error;
//                 }
//                 // debugger
//             }
            
//         }   
       
   
// }

//  function verifyDirectoryExists(path){

//        return new Promise((resolve,reject)=>{
//            fs.access(path,(err)=>{
//             //    debugger;
//                if(err){
//                    fs.mkdir(path,{recursive:true},(err)=>{
//                     //    debugger;
//                        resolve();
//                    })
//                }else{
//                    resolve();
//                }
//            })
//        }) 
     
   

// }

module.exports = {
    verifyDirectoryExists
}