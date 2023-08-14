
/**
 * @license
 * author: SNinjo <contact@SNinjo.com> (https://SNinjo.com)
 * jo-fetch v1.1.0
 * Released under the MIT license.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
async function fetchText(url, parameter) {
    return fetch(url, parameter)
        .then(response => response.text());
}
async function fetchJSON(url, parameter) {
    return fetch(url, parameter)
        .then(response => response.json());
}
async function fetchBlob(url, parameter) {
    return fetch(url, parameter)
        .then(response => response.blob());
}
async function fetchDocument(url, parameter) {
    return fetch(url, parameter)
        .then(response => response.text())
        .then(strHtml => new DOMParser().parseFromString(strHtml, 'text/html'));
}
// export async function fetchGZip(url: string, parameter?: RequestInit) {
// 	return fetch(url, parameter)
// 		.then(response => response.blob())
// 		.then(data => new Response(data.stream().pipeThrough( new DecompressionStream('gzip') )))
// }
async function fetchOnlyResponseOk(url, parameter) {
    return fetch(url, parameter)
        .then(response => {
        if (!response.ok)
            throw new Error(`[HTTP ${response.status}] The response isn't ok.`);
        return response;
    });
}
async function fetchInTime(url, parameter, time = 5000) {
    return new Promise((resolve, reject) => {
        setTimeout(() => reject(new Error('fetch overtime')), time);
        fetch(url, parameter)
            .then(resolve)
            .catch(reject);
    });
}
async function fetchAutoRetry(url, parameter, times = 5, delay = 5000) {
    const sleep = (time) => new Promise(resolve => setTimeout(resolve, time));
    return fetch(url, parameter)
        .catch(async (error) => {
        if (times <= 0)
            throw error;
        await sleep(delay);
        return fetchAutoRetry(url, parameter, --times, delay);
    });
}
function combineSignals(signals) {
    const controller = new AbortController();
    for (const signal of signals) {
        if (signal.aborted)
            return signal;
        signal.addEventListener('abort', () => controller.abort(signal.reason), { signal: controller.signal });
    }
    return controller.signal;
}
async function joFetch(url, config = {}) {
    const initialize = (config) => {
        return {
            loadingTime: 10000,
            retryTimes: 5,
            retryDelay: 5000,
            typeFrom: '',
            typeTo: '',
            isBadResponseError: false,
            onError: ((error) => { throw error; }),
            controller: new AbortController(),
            ...config
        };
    };
    const combineSignals = (signals) => {
        const controller = new AbortController();
        for (const signal of signals) {
            if (signal.aborted)
                return signal;
            signal.addEventListener("abort", () => controller.abort(signal.reason), { signal: controller.signal });
        }
        return controller.signal;
    };
    const fetchInTime = async (url, parameter, time) => {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('fetch overtime')), time);
            parameter.signal = parameter.signal ? combineSignals([parameter.controller.signal, parameter.signal]) : parameter.controller.signal;
            fetch(url, parameter)
                .then(resolve)
                .catch(reject)
                .finally(() => clearTimeout(timeout));
        });
    };
    const processResponse = (response) => {
        if (parameter.isBadResponseError && !response.ok)
            throw new Error(`[HTTP ${response.status}] The response isn't ok.`);
        return response;
    };
    const sleep = (time) => new Promise(resolve => setTimeout(resolve, time));
    const retryOnFailure = async (error) => {
        parameter.controller.abort();
        if (parameter.retryTimes-- <= 0)
            return parameter.onError(error);
        await sleep(parameter.retryDelay);
        return joFetch(url, parameter);
    };
    const processDataType = (promise) => {
        switch (parameter.typeFrom) {
            // case 'gzip':
            // 	promise = promise
            // 		.then(response => response.blob())
            // 		.then(data => new Response(data.stream().pipeThrough( new DecompressionStream('gzip') )))
            // 	break
                    }
        switch (parameter.typeTo) {
            case 'text':
                promise = promise
                    .then(response => response.text());
                break;
            case 'json':
                promise = promise
                    .then(response => response.json());
                break;
            case 'blob':
                promise = promise
                    .then(response => response.blob());
                break;
            case 'document':
                promise = promise
                    .then(response => response.text())
                    .then(strHtml => new DOMParser().parseFromString(strHtml, 'text/html'));
                break;
        }
        return promise;
    };
    const parameter = initialize(config);
    return processDataType(fetchInTime(url, parameter, parameter.loadingTime)
        .then(processResponse)
        .catch(retryOnFailure));
}

export { combineSignals, joFetch as default, fetchAutoRetry, fetchBlob, fetchDocument, fetchInTime, fetchJSON, fetchOnlyResponseOk, fetchText };
//# sourceMappingURL=ECMAScript.js.map
