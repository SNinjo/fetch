function sleep(time){
    return new Promise((resolve) => setTimeout(resolve, time))
}


export function fetchJSON(url, parameter = {}){
    return fetch(url, parameter)
        .then(response => response.json())
}

export function fetchDocument(url, parameter = {}){
    return fetch(url, parameter)
        .then(response => response.text())
        .then(strHtml => new DOMParser().parseFromString(strHtml, "text/html"))
}


export function fetchInTime(url, parameter = {}, time = 5000){
    return new Promise((resolve, reject) => {
        setTimeout(() => reject(new Error('fetch overtime')), time)
        fetch(url, parameter)
            .then(resolve)
            .catch(reject)
    })
}

export function fetchAutoRetry(url, parameter, times = 5, delay = 5000){
    return fetch(url, parameter)
        .catch(async (error) => {
            if (times <= 0) throw error

            await sleep(delay)
            return fetchAutoRetry(url, parameter, --times, delay)
        })
}


export default function joFetch(url, parameter = {}, config = {}){
    // initialize
    config.loadingTime = config.loadingTime ?? 10000
    config.retryTimes = config.retryTimes ?? 5
    config.retryDelay = config.retryDelay ?? 5000
    config.returnType = config.returnType ?? ''

    // fetch in time
    let promise = new Promise((resolve, reject) => {
        setTimeout(() => reject(new Error('fetch overtime')), config.loadingTime)
        fetch(url, parameter)
            .then(resolve)
            .catch(reject)
    })
        // retry on failure
        .catch(async (error) => {
            if (config.retryTimes-- <= 0) throw error

            await sleep(config.retryDelay)
            return joFetch(url, parameter, config)
        })
    
    // process data type
    switch (config.returnType){
        case 'html':
            promise
                .then(response => response.text())
                .then(strHtml => new DOMParser().parseFromString(strHtml, "text/html"))
            break
        case 'json':
            promise
                .then(response => response.json())
            break
        case '':
        default:
            break
    }
    
    return promise
}