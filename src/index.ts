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

			...config,
			controller: new AbortController(),
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
	const fetchInTime = async (url: string, parameter: RequestParameter): Promise<Response> => {
		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => reject(new Error('fetch overtime')), parameter.loadingTime)
			fetch(url, parameter)
				.then(resolve)
				.catch(reject)
				.finally(() => clearTimeout(timeout))
		})
	}

	const processResponse = (response: Response): Response => {
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

	const processDataType = async (response: Response) => {
		let dataFrom: Response;
		switch (parameter.typeFrom) {
		// case 'gzip':
		// 	dataFrom = new Response((await response.blob()).stream().pipeThrough( new DecompressionStream('gzip') ))
		// 	break
    
		case '':
		default:
			dataFrom = response
		}


		let dataTo: any;
		switch (parameter.typeTo) {
		case 'text':
			dataTo = await dataFrom.text();
			break
    
		case 'json':
			dataTo = await dataFrom.json();
			break
    
		case 'blob':
			dataTo = await dataFrom.blob();
			break
    
		case 'document':
			dataTo = new DOMParser().parseFromString(await dataFrom.text(), 'text/html')
			break
                
		case '':
		default:
			dataTo = dataFrom
		}
		return dataTo
	}


	const parameter = initialize(config)
	return (
		fetchInTime(url, {
			...parameter,
			signal: parameter.signal? combineSignals([parameter.controller.signal, parameter.signal]) : parameter.controller.signal,
		})
			.then(processResponse)
			.then(processDataType)
			.catch(retryOnFailure)
	)
}
export default joFetch