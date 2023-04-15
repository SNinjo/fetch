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
        .then(strHtml => new DOMParser().parseFromString(strHtml, "text/html"))
}

export async function fetchGZip(url, parameter) {
    return fetch(url, parameter)
        .then(response => response.blob())
        .then(data => new Response(data.stream().pipeThrough( new DecompressionStream('gzip') )))
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


export default async function joFetch(url, parameter, config = {}) {
    const initialize = (config) => {
        config.useError = config.useError ?? ((error) => { throw error })
        config.loadingTime = config.loadingTime ?? 10000
        config.retryTimes = config.retryTimes ?? 5
        config.retryDelay = config.retryDelay ?? 5000
        config.typeFrom = config.typeFrom ?? ''
        config.typeTo = config.typeTo ?? ''
    }

    const fetchInTime = async (url, parameter, time) => {
        return new Promise((resolve, reject) => {
            setTimeout(() => reject(new Error('fetch overtime')), time)
            fetch(url, parameter)
                .then(resolve)
                .catch(reject)
        })
    }

    const sleep = (time) => new Promise(resolve => setTimeout(resolve, time))
    const retryOnFailure = async (error) => {
        if (config.retryTimes-- <= 0) return config.useError(error)

        await sleep(config.retryDelay)
        return joFetch(url, parameter, config)
    }

    const processDataType = (promise) => {
        switch (config.typeFrom) {
            case 'gzip':
                promise = promise
                    .then(response => response.blob())
                    .then(data => new Response(data.stream().pipeThrough( new DecompressionStream('gzip') )))
                break
    
            case '':
            default:
                break
        }
        switch (config.typeTo) {
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
                    .then(strHtml => new DOMParser().parseFromString(strHtml, "text/html"))
                break
                
            case '':
            default:
                break
        }
        return promise
    }


    initialize(config)
    return processDataType(
        fetchInTime(url, parameter, config.loadingTime)
            .catch(retryOnFailure)
    )
}