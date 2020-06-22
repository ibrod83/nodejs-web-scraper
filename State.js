class State {//Global state for the scraping instance.
    constructor() {

        this.existingUserFileDirectories = []
        this.failedScrapingObjects = []
        this.downloadedImages = 0
        this.currentlyRunning = 0
        this.registeredOperations = []//Holds a reference to each created operation.
        this.numRequests = 0
        this.repetitionCycles = 0
        this.scrapingObjects = []//for debugging

    }
}

module.exports = State