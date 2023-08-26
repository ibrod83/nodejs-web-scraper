declare module 'nodejs-web-scraper' {
    export type GlobalConfig = {
        baseSiteUrl: string = '';
        startUrl: string = '';
        showConsoleLogs?: boolean = true;
        // If an image with the same name exists, a new file with a number appended to it is created. Otherwise. it's overwritten.
        cloneFiles?: boolean = true;
        removeStyleAndScriptTags?: boolean = true;
        // Maximum concurrent requests.
        concurrency?: number = 3;
        // Maximum number of retries of a failed request.
        maxRetries?: number = 5;
        delay?: number = 200;
        timeout?: number = 6000;
        // Needs to be provided only if a DownloadContent operation is created.
        filePath?: string | null;
        auth?: any;
        headers?: Headers;
        proxy?: string;
        agent?: any;
        logPath?: string;
        // callback runs whenever any error occurs during scraping
        onError?: () => unknown;
    }

    export type ScrapingAction = any;

    export declare class Scraper {
        config: GlobalConfig & {
            errorCodesToSkip: [404, 403, 400];
            // usePuppeteer is deprecated since version 5. If you need it, downgrade to version 4.2.2
            usePuppeteer: boolean;
        };
        qyu: Qyu;
        state: {
            failedScrapingIterations: any[];
            downloadedFiles: number = 0;
            currentlyRunning: number = 0;
            registeredOperations: Operation[];
            numRequests: number = 0;
            repetitionCycles: number = 0;
        };
        log: any;
        requestSpacer: Promise<void>;
        referenceToRoot?: Root;
        constructor(globalConfig: GlobalConfig): Scraper;

        registerOperation(Operation: Operation): void;
        // Scraper.destroy() is deprecated. You can now have multiple instances, without calling this method.
        destroy(): void;
        async awaitBrowserReady(): Promise<unknown>;
        validateGlobalConfig(conf: GlobalConfig): void;
        // This function will begin the entire scraping process. Expects a reference to the root operation.
        async scrape(rootObject: Root): Promise<void>;
        areThereRepeatableErrors(): boolean;
        reportFailedScrapingAction(errorString: string): void;
        saveFile(data: any, fileName: string): Promise<void>;
        async createLogs(): Promise<void>;
        async createLog(obj: { fileName: string; data: ScrapingAction | ScrapingAction[] }): Promise<void>;
        log(message: string): void;
    }

    export declare class PageHelper {
        constructor(Operation: Operation): PageHelper;
        // Will process one scraping object, including a pagination object. Used by Root and OpenLinks.
        async processOneIteration(href: string, shouldPaginate: boolean): Promise<{
            data: [];
            address: string;
        }>;
        // Divides a given page to multiple pages.
        async paginate(address: string): Promise<{
            data: [];
            address: string;
        }>;
        async getPage(href: string): Promise<string>;
        async runGetPageObjectHook(address: string, dataFromChildren: any[]): Promise<void>;
        async runAfterResponseHooks(response: any): Promise<void>;
    }

    export type RootConfig = {
        // Look at the pagination API for more details.
        pagination?: any;
        getPageData?: Function;
        // Receives a dictionary of children, and an address argument
        getPageObject?: Function;
        // Receives an axiosResponse object
        getPageResponse?: Function;
        // Receives htmlString and pageAddress
        getPageHtml?: Function;
        // Listens to every exception. Receives the Error object.
        getException?: (error: Error) => Promise<any>;
    } & HttpOperationConfig;

    // Fetches the initial page, and starts the scraping process.
    export declare class Root extends HttpOperation {
        operations: Operation[];
        pageHelper?: PageHelper;
        constructor(config: RootConfig): Root;
        addOperation(Operation: Operation): void;
        initPageHelper(): void;
        async scrape(): Promise<void>;
        // Will get the errors from all registered operations.
        getErrors(): string[];
        validateOperationArguments(): void;

        // Mixins
        injectScraper: (ScraperInstance: Scraper) => void;
        // Scrapes the child operations of this OpenLinks object.
        scrapeChildren: (childOperations: any, { url: any, html: any }) => Promise<any[]>;
    }

    export type ElementList = any;

    export type OpenLinksConfig = {
        name?: string = 'Default OpenLinks name';
        // Look at the pagination API for more details.
        pagination?: any;
        slice?: number[];
        // Receives a Cheerio node.  Use this hook to decide if this node should be included in the scraping. Return true or false
        condition?: (nodeFromCheerio) => boolean;
        // Receives an elementList array
        getElementList?: (elementList: ElementList[]) => unknown;
        getPageData?: () => unknown;
        // Receives a dictionary of children, and an address argument
        getPageObject?: (children, address) => unknown;
        // Receives an axiosResponse object
        getPageResponse?: (axiosResponse: any) => unknown;
        // Receives htmlString and pageAddress
        getPageHtml?: (html: string, pageAddress: any) => unknown;
        getException?: (error: Error) => unknown;
        // Callback that receives the href before it is opened.
        transformHref?: (href: string) => string;
    }

    export declare class OpenLinks extends HttpOperation {
        pageHelper?: PageHelper;
        operations: Operation[];
        querySelector: keyof HTMLElementTagNameMap;
        transformHref?: (href: string) => string;
        /**
         * @param {keyof HTMLElementTagNameMap} querySelector - cheerio-advanced-selectors selector
         * @param {OpenLinksConfig} config - OpenLinksConfig
         */
        constructor(querySelector: keyof HTMLElementTagNameMap, config: OpenLinksConfig): OpenLinks
        addOperation(Operation: Operation): void;
        initPageHelper(): void;
        validateOperationArguments(): void;
        async scrape(scrapeParams: { url: string, html: string }): Promise<{
            type: string;
            name: string;
            data: any[];
        }>
        async createLinkList(html: string, url: string): Promise<any[]>;

        // Mixins
        injectScraper: (ScraperInstance: Scraper) => void;
        // Scrapes the child operations of this OpenLinks object.
        scrapeChildren: (childOperations: any, { url: any, html: any }) => Promise<any[]>;
    }

    /**
     * @see {@link https://github.com/shtaif/Qyu | Qyu on github}
     */
    export declare class Qyu {
        constructor(opts = {}, jobFn = null, jobOpts = {}): Qyu;
        set(newOpts: any): void;
        async runJobChannel(): Promise<void>;
        async runJobChannels(): Promise<void>;
        enqueue(fn: any, opts={}): Promise<any>;
        dequeue(promise: Promise): any;
        add(): Promise<any>;
        map(iterator: any, fn: any, opts: any): Promise<any[]>;
        pause(): Promise<any[]> | undefined;
        resume(): void;
        empty(): Promise<any[]>;
        whenEmpty(): Promise<any>;
        whenFree(): Promise<any>;
        writeStream(chunkObjTransformer=v=>v): import('node:stream').Writable;
        transformStream(chunkObjTransformer=v=>v): import('node:stream').Transform;
    }

    export type PromiseFactory = () => Promise<any>;

    export type HttpOperationConfig = {
        condition: () => unknown;
        getException: (error: Error) => Promise<any>;
    } & OperationConfig;

    export declare class HttpOperation extends Operation {
        condition?: () => unknown;
        counter?: number;
        constructor(config: HttpOperationConfig): HttpOperation;
        async emitError(error: Error): Promise<unknown>;
        async repeatPromiseUntilResolved(promiseFactory: PromiseFactory, href: string): Promise<any>;
        // This function pushes promise-returning functions into the qyu.
        qyuFactory(promiseFunction: Function): Qyu;
        // Runs at the beginning of the promise-returning function, that is sent to repeatPromiseUntilResolved().
        async beforePromiseFactory(message: string): Promise<void>;
        // Runs at the end of the promise-returning function, that is sent to repeatPromiseUntilResolved().
        afterPromiseFactory(): void;
        async createDelay(): Promise<void>;
    }

    export type OperationConfig = {
        name?: string;
    }

    export declare class Operation {
        config: OperationConfig;
        // Scraper instance is passed later on.
        scraper?: Scraper;
        // Holds all data collected by this operation, in the form of possibly multiple "ScrapingWrappers".
        data: any[];
        // Holds the overall communication errors, encountered by the operation.
        errors: any[];
        constructor(objectConfig: OperationConfig): Operation;
        injectScraper(ScraperInstance: Scraper): void;
        handleNewOperationCreation(Operation: Operation): void;
        handleFailedScrapingIteration(errorString: String): void;
        referenceToOperationObject(): this;
        getData(): any[];
        getErrors(): any[];
        // Implemented by all Operation objects
        validateOperationArguments(): unknown;
    }
}