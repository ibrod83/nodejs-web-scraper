// const { promisify } = require('util');
// const access = promisify(fs.access);
// const mkdir = promisify(fs.mkdir);
const fs = require('fs')
module.exports = class PathQueue {

    pathExistsPromise = null;
    // writeFilePromise=null;

    async writeFile(path,data){
        const prom = new Promise((resolve, reject) => {
            fs.writeFile(path, data, (err) => {
                if (err) {                   

                    reject(err)
                } else {                    
                    resolve()
                };
            })
        })
        if (!this.pathExistsPromise) {
            this.pathExistsPromise = prom;
            return prom;
        }

        let currentPromise = this.pathExistsPromise;
        this.pathExistsPromise = currentPromise.finally(async () => {
            await prom
        })

        await currentPromise;
    }
    async pathExists(path) {
        
        const prom = new Promise((resolve, reject) => {
            fs.access(path, fs.F_OK, (err) => {
                if (err) {
                    debugger;
                    if (err.code === 'ENOENT') {
                        return resolve(false)
                    }

                    reject(err)
                } else {
                    debugger;
                    resolve(true)
                };


            })
        })
        if (!this.IOPromise) {
            this.IOPromise = prom;
            return prom;
        }

        let currentPromise = this.IOPromise;
        this.IOPromise = currentPromise.finally(async () => {
            await prom
        })

        await currentPromise;


    }

    async verifyDirectoryExists(path) {
        const prom = new Promise((resolve, reject) => {
            fs.access(path, (err) => {
                //    debugger;
                if (err) {
                    fs.mkdir(path, { recursive: true }, (err) => {
                        //    debugger;
                        resolve();
                    })
                } else {
                    resolve();
                }
            })
        })
        if (!this.pathExistsPromise) {
            this.pathExistsPromise = prom;
            return prom;
        }

        let currentPromise = this.pathExistsPromise;
        this.pathExistsPromise = currentPromise.finally(async () => {
            await prom
        })

        await currentPromise;



    }
}