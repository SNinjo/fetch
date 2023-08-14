/* eslint-disable @typescript-eslint/no-explicit-any */


export async function fetchText(url: string, parameter?: RequestInit): Promise<string> {
	return fetch(url, parameter)
		.then(response => response.text())
}

export async function fetchJSON(url: string, parameter?: RequestInit): Promise<JSON> {
	return fetch(url, parameter)
		.then(response => response.json())
}

export async function fetchBlob(url: string, parameter?: RequestInit): Promise<Blob> {
	return fetch(url, parameter)
		.then(response => response.blob())
}

export async function fetchDocument(url: string, parameter?: RequestInit): Promise<Document> {
	return fetch(url, parameter)
		.then(response => response.text())
		.then(strHtml => new DOMParser().parseFromString(strHtml, 'text/html'))
}

// export async function fetchGZip(url: string, parameter?: RequestInit) {
// 	return fetch(url, parameter)
// 		.then(response => response.blob())
// 		.then(data => new Response(data.stream().pipeThrough( new DecompressionStream('gzip') )))
// }


export async function fetchOnlyResponseOk(url: string, parameter?: RequestInit): Promise<Response> {
	return fetch(url, parameter)
		.then(response => {
			if (!response.ok) throw new Error(`[HTTP ${response.status}] The response isn't ok.`)
			return response
		})
}

export async function fetchInTime(url: string, parameter?: RequestInit, time = 5000): Promise<Response> {
	return new Promise((resolve, reject) => {
		setTimeout(() => reject(new Error('fetch overtime')), time)
		fetch(url, parameter)
			.then(resolve)
			.catch(reject)
	})
}

export async function fetchAutoRetry(url: string, parameter?: RequestInit, times = 5, delay = 5000): Promise<Response> {
	const sleep = (time: number) => new Promise(resolve => setTimeout(resolve, time))
	return fetch(url, parameter)
		.catch(async (error) => {
			if (times <= 0) throw error

			await sleep(delay)
			return fetchAutoRetry(url, parameter, --times, delay)
		})
}


export function combineSignals(signals: Array<AbortSignal>): AbortSignal {
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




export interface RequestConfig extends RequestInit {
	loadingTime?: number,
	retryTimes?: number,
	retryDelay?: number,

	typeFrom?: '',
	typeTo?: '' | 'text' | 'json' | 'blob' | 'document',

	isBadResponseError?: boolean,
	onError?: (error: any) => void,
	controller?: AbortController,
}
async function joFetch(url: string, config: RequestConfig = {}): Promise<Response | string | JSON | Blob | Document> {
	interface RequestParameter extends RequestInit {
		loadingTime: number,
		retryTimes: number,
		retryDelay: number,
	
		typeFrom: '',
		typeTo: '' | 'text' | 'json' | 'blob' | 'document',
	
		isBadResponseError: boolean,
		onError: (error: any) => void,
		controller: AbortController,
	}
	const initialize = (config: RequestConfig): RequestParameter => {
		return {
			loadingTime: 10000,
			retryTimes: 5,
			retryDelay: 5000,

			typeFrom: '',
			typeTo: '',

			isBadResponseError: false,
			onError: ((error: any) => { throw error }),
			controller: new AbortController(),

			...config
		}
	}

	const combineSignals = (signals: Array<AbortSignal>): AbortSignal => {
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
	const fetchInTime = async (url: string, parameter: RequestParameter, time: number): Promise<Response> => {
		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => reject(new Error('fetch overtime')), time)
			parameter.signal = parameter.signal? combineSignals([parameter.controller.signal, parameter.signal]) : parameter.controller.signal;
			fetch(url, parameter)
				.then(resolve)
				.catch(reject)
				.finally(() => clearTimeout(timeout))
		})
	}

	const processResponse = (response: Response) => {
		if (parameter.isBadResponseError && !response.ok) throw new Error(`[HTTP ${response.status}] The response isn't ok.`)
		return response
	}

	const sleep = (time: number) => new Promise(resolve => setTimeout(resolve, time))
	const retryOnFailure = async (error: any) => {
		parameter.controller.abort()
		if (parameter.retryTimes-- <= 0) return parameter.onError(error)

		await sleep(parameter.retryDelay)
		return joFetch(url, parameter)
	}

	const processDataType = (promise: Promise<any>) => {
		switch (parameter.typeFrom) {
		// case 'gzip':
		// 	promise = promise
		// 		.then(response => response.blob())
		// 		.then(data => new Response(data.stream().pipeThrough( new DecompressionStream('gzip') )))
		// 	break
    
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
    
		case 'document':
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


	const parameter = initialize(config)
	return processDataType(
		fetchInTime(url, parameter, parameter.loadingTime)
			.then(processResponse)
			.catch(retryOnFailure)
	)
}
export default joFetch