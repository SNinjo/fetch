export declare function fetchText(url: string, parameter?: RequestInit): Promise<string>;
export declare function fetchJSON(url: string, parameter?: RequestInit): Promise<JSON>;
export declare function fetchBlob(url: string, parameter?: RequestInit): Promise<Blob>;
export declare function fetchDocument(url: string, parameter?: RequestInit): Promise<Document>;
export declare function fetchOnlyResponseOk(url: string, parameter?: RequestInit): Promise<Response>;
export declare function fetchInTime(url: string, parameter?: RequestInit, time?: number): Promise<Response>;
export declare function fetchAutoRetry(url: string, parameter?: RequestInit, times?: number, delay?: number): Promise<Response>;
export declare function combineSignals(signals: Array<AbortSignal>): AbortSignal;
export interface RequestConfig extends RequestInit {
    loadingTime?: number;
    retryTimes?: number;
    retryDelay?: number;
    typeFrom?: '';
    typeTo?: '' | 'text' | 'json' | 'blob' | 'document';
    isBadResponseError?: boolean;
    onError?: (error: any) => void;
    controller?: AbortController;
}
declare function joFetch(url: string, config?: RequestConfig): Promise<Response | string | JSON | Blob | Document>;
export default joFetch;
