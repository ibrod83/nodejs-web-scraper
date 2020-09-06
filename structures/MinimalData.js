class MinimalData{
    /**
     * 
     * @param {string} type 
     * @param {string} name 
     * @param {Array} data 
     */
    constructor(type,name,data){
        this._identifier= 'MinimalData'

        this.type = type;
        this.name = name;
        this.data = data;
    }
}

module.exports = MinimalData