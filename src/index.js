export async function fetchText(url, parameter) {
    return fetch(url, parameter)
        .then(response => response.text())
}

export async function fetchJSON(url, parameter) {
    return fetch(url, parameter)
        .then(response => response.json())
}

export async function fetchBlob(url, parameter) {
    return fetch(url, parameter)
        .then(response => response.blob())
}

export async function fetchDocument(url, parameter) {
    return fetch(url, parameter)
        .then(response => response.text())
        .then(strHtml => new DOMParser().parseFromString(strHtml, 'text/html'))
}

export async function fetchGZip(url, parameter) {
    return fetch(url, parameter)
        .then(response => response.blob())
        .then(data => new Response(data.stream().pipeThrough( new DecompressionStream('gzip') )))
}


export async function fetchOnlyResponseOk(url, parameter) {
    return fetch(url, parameter)
        .then(response => {
            if (!response.ok) throw new Error(`[HTTP ${response.status}] trigger error for the bad response...`)
            return response
        })
}

export async function fetchInTime(url, parameter, time = 5000) {
    return new Promise((resolve, reject) => {
        setTimeout(() => reject(new Error('fetch overtime')), time)
        fetch(url, parameter)
            .then(resolve)
            .catch(reject)
    })
}

export async function fetchAutoRetry(url, parameter, times = 5, delay = 5000) {
    const sleep = (time) => new Promise(resolve => setTimeout(resolve, time))
    return fetch(url, parameter)
        .catch(async (error) => {
            if (times <= 0) throw error

            await sleep(delay)
            return fetchAutoRetry(url, parameter, --times, delay)
        })
}


export function combineSignals(signals) {
    const controller = new AbortController()
  
    for (const signal of signals) {
        if (signal.aborted) return signal
    
        signal.addEventListener(
            'abort',
            () => controller.abort(signal.reason), 
            { signal: controller.signal }
        )
    }
  
    return controller.signal
}




export default async function joFetch(url, parameter = {}) {
    const initialize = (parameter) => {
        parameter.loadingTime = parameter.loadingTime ?? 10000
        parameter.retryTimes = parameter.retryTimes ?? 5
        parameter.retryDelay = parameter.retryDelay ?? 5000

        parameter.typeFrom = parameter.typeFrom ?? ''
        parameter.typeTo = parameter.typeTo ?? ''
        
        parameter.isBadResponseError = parameter.isBadResponseError ?? false
        parameter.useError = parameter.useError ?? ((error) => { throw error })
        parameter.controller = parameter.controller ?? new AbortController()
    }

    const combineSignals = (signals) => {
        const controller = new AbortController()
      
        for (const signal of signals) {
            if (signal.aborted) return signal
        
            signal.addEventListener(
                "abort",
                () => controller.abort(signal.reason), 
                { signal: controller.signal }
            )
        }
      
        return controller.signal
    }
    const fetchInTime = async (url, parameter, time) => {
        return new Promise((resolve, reject) => {
            setTimeout(() => reject(new Error('fetch overtime')), time)
            parameter.signal = parameter.signal? combineSignals([parameter.controller.signal, parameter.signal]) : parameter.controller.signal;
            fetch(url, parameter)
                .then(resolve)
                .catch(reject)
        })
    }

    const processResponse = (response) => {
        if (parameter.isBadResponseError && !response.ok) throw new Error(`[HTTP ${response.status}] trigger error for the bad response...`)
        return response
    }

    const sleep = (time) => new Promise(resolve => setTimeout(resolve, time))
    const retryOnFailure = async (error) => {
        parameter.controller.abort()
        if (parameter.retryTimes-- <= 0) return parameter.useError(error)

        await sleep(parameter.retryDelay)
        return joFetch(url, parameter, parameter)
    }

    const processDataType = (promise) => {
        switch (parameter.typeFrom) {
            case 'gzip':
                promise = promise
                    .then(response => response.blob())
                    .then(data => new Response(data.stream().pipeThrough( new DecompressionStream('gzip') )))
                break
    
            case '':
            default:
                break
        }
        switch (parameter.typeTo) {
            case 'text':
                promise = promise
                    .then(response => response.text())
                break
    
            case 'json':
                promise = promise
                    .then(response => response.json())
                break
    
            case 'blob':
                promise = promise
                    .then(response => response.blob())
                break
    
            case 'html':
                promise = promise
                    .then(response => response.text())
                    .then(strHtml => new DOMParser().parseFromString(strHtml, 'text/html'))
                break
                
            case '':
            default:
                break
        }
        return promise
    }


    initialize(parameter)
    return processDataType(
        fetchInTime(url, parameter, parameter.loadingTime)
            .then(processResponse)
            .catch(retryOnFailure)
    )
}