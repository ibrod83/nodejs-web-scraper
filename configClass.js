let instance = null
let getInstanceWasCalled = false;


class ConfigClass {
    constructor(){
        if(!getInstanceWasCalled || instance){
            // throw new Error();
            console.log('ConfigClass cannot be instantiated directly!');
            process.exit();
           
            
        }
    }
    static getInstance() {
       
        if (!instance) {
            getInstanceWasCalled = true;
            instance = new ConfigClass()
            
        }
        return instance;
    }

    setConfigurationData(configObj) {
        for (let prop in configObj) {
            this[prop] = configObj[prop];
        }
    }
}

module.exports = ConfigClass;