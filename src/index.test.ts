/* eslint-disable comma-spacing */
import joFetch, {
	fetchText,
	fetchJSON,
	fetchBlob,
	fetchDocument,
	fetchOnlyResponseOk,
	fetchInTime,
	fetchAutoRetry,
	combineSignals
} from './';
import { Response } from 'node-fetch';
import { JSDOM } from 'jsdom';
global.DOMParser = new JSDOM().window.DOMParser;




let status: string
let loadedTime: number
let blockTimes: number

function setRequestParameter(parameter: {
	status?: string
	loadedTime?: number
	blockTimes?: number
}) {
	status = parameter.status? parameter.status : '200'
	loadedTime = parameter.loadedTime? parameter.loadedTime : 0
	blockTimes = parameter.blockTimes? parameter.blockTimes : 0
}


const strText = 'text'
const strBlob = 'blob'
const strJson = '{"num": 1}'
const strHTML = '<body><h1>text</h1></body>'

async function mockFetch(url: RequestInfo | URL, parameter?: RequestInit): Promise<Response> {
	if (blockTimes !== 0) {
		blockTimes--
		return new Promise((resolve, reject) => reject(new Error('mock blocking')))
	}


	switch (status) {
	case 'keep loading':
		return new Promise(() => {})
	case 'loading':
		setRequestParameter({
			status: '200',
		})
		return new Promise(
			resolve => setTimeout(  () => resolve(mockFetch(url, parameter)), loadedTime  )
		)
	case 'canceling':
		return new Promise(resolve => {
			if (parameter && parameter.signal) {
				if (parameter.signal.aborted) {
					resolve(new Response('canceled'))
				} else {
					parameter.signal.addEventListener('abort', () => resolve(new Response('canceled')))
				}
			}
		})
	// case 'block':
	// 	if (blockTimes === 0) {
	// 		setRequestParameter({
	// 			status: '200',
	// 		})
	// 		return mockFetch(url, parameter)
	// 	}
	// 	else {
	// 		blockTimes--
	// 		return new Promise((resolve, reject) => reject(new Error('mock blocking')))
	// 	}
	case 'error':
		return new Promise((resolve, reject) => reject(new Error('mock error')))

	case 'text':
		return new Promise(resolve => resolve(new Response(strText)))
	case 'json':
		return new Promise(resolve => resolve(new Response(strJson)))
	case 'blob':
		return new Promise(resolve => resolve(new Response(strBlob)))
	case 'html':
		return new Promise(resolve => resolve(new Response(strHTML)))
		// case 'gzip':
		//     const compressToGZip = (string) => {
		//         let compressionStream = new CompressionStream('gzip')
		//         let writer = compressionStream.writable.getWriter();
		//         writer.write(new TextEncoder().encode(string))
		//         writer.close()
		//         return new Response(compressionStream.readable)
		//     }
		//     let gzip = compressToGZip(strText)
		//     return new Promise(resolve => resolve({
		//         data: gzip,
		//         blob: () => gzip,
		//     }))

	case '404':
		return new Promise(resolve => resolve(new Response('', { status: 404 })))
	case '200':
	default:
		return new Promise(resolve => resolve(new Response()))
	}
}
beforeEach(() => {
	jest.useFakeTimers()
	global.fetch = jest.fn().mockImplementation(mockFetch)
})


describe('test function fetch (window.fetch and mockFetch)', () => {
	test("keep loading (no response)", async () => {
		expect.assertions(2)

		let executionPath = ''
		setRequestParameter({
			status: 'keep loading',
		})
		fetch('')
			.then(() => executionPath='then')
			.catch(() => executionPath='catch')
		expect(executionPath).toBe('')
        
		jest.advanceTimersByTime(10000)
		expect(executionPath).toBe('')
	})

	test("cancel fetching", async () => {
		expect.assertions(2)
		let promise, controller

		controller = new AbortController()
		setRequestParameter({
			status: 'canceling',
		})
		promise = fetch('', {signal: controller.signal})
		controller.abort()
		await expect(promise).resolves.toStrictEqual(new Response('canceled'))
        
		controller = new AbortController()
		controller.abort()
		setRequestParameter({
			status: 'canceling',
		})
		promise = fetch('', {signal: controller.signal})
		await expect(promise).resolves.toStrictEqual(new Response('canceled'))
	})

	describe("block fetching", () => {
		test('zero times', async () => {
			expect.assertions(1)
    
			setRequestParameter({
				status: '200',
				blockTimes: 0,
			})
			let response = fetch('')
			jest.advanceTimersByTime(0)
			await expect(response).resolves.toStrictEqual(new Response())
		})

		test('once', async () => {
			expect.assertions(2)
			let promise
    
			setRequestParameter({
				status: '200',
				blockTimes: 1,
			})
			promise = fetch('')
			jest.advanceTimersByTime(0)
			await expect(promise).rejects.toThrow(new Error('mock blocking'))
            
			promise = fetch('')
			jest.advanceTimersByTime(0)
			await expect(promise).resolves.toStrictEqual(new Response())
		})

		test('five times', async () => {
			expect.assertions(6)
			let promise
    
			setRequestParameter({
				status: '200',
				blockTimes: 5,
			})
			for (let times = 5; times >= 1; times--) {
				promise = fetch('')
				jest.advanceTimersByTime(0)
				await expect(promise).rejects.toThrow(new Error('mock blocking'))
			}
            
			promise = fetch('')
			jest.advanceTimersByTime(0)
			await expect(promise).resolves.toStrictEqual(new Response())
		})

		test('once and return text', async () => {
			expect.assertions(3)
			let promise
    
			setRequestParameter({
				status: 'text',
				blockTimes: 1,
			})
			promise = fetch('')
			jest.advanceTimersByTime(0)
			await expect(promise).rejects.toThrow(new Error('mock blocking'))
            
			promise = fetch('')
			await expect(promise).resolves.toStrictEqual(new Response(strText))
			await expect((await promise).text()).resolves.toBe(strText)
		})
	})

	test('return error', async () => {
		expect.assertions(1)
		setRequestParameter({
			status: 'error',
		})
		await expect(fetch('')).rejects.toThrow(new Error('mock error'))
	})


	test('return text', async () => {
		setRequestParameter({
			status: 'text',
		})
		let promise = fetch('')
		await expect(promise).resolves.toStrictEqual(new Response(strText))
		await expect((await promise).text()).resolves.toBe(strText)
	})

	test('return json', async () => {
		setRequestParameter({
			status: 'json',
		})
		let promise = fetch('')
		await expect(promise).resolves.toStrictEqual(new Response(strJson))
		await expect((await promise).text()).resolves.toBe(strJson)
	})

	test('return blob', async () => {
		let promise

		setRequestParameter({
			status: 'blob',
		})
		promise = fetch('')
		await expect(promise).resolves.toStrictEqual(new Response(strBlob))
		await expect((await promise).text()).resolves.toBe(strBlob)
	})

	test('return html', async () => {
		setRequestParameter({
			status: 'html',
		})
		let promise = fetch('')
		await expect(promise).resolves.toStrictEqual(new Response(strHTML))
		await expect((await promise).text()).resolves.toBe(strHTML)
	})

	test('return 404', async () => {
		expect.assertions(1)
		setRequestParameter({
			status: '404',
		})
		await expect(fetch('')).resolves.toStrictEqual(new Response('', { status: 404 }))
	})

	describe('return 200', () => {
		test('none', async () => {
			expect.assertions(1)
			setRequestParameter({
				status: '200',
			})
			await expect(fetch('')).resolves.toStrictEqual(new Response())
		})

		test('loadedTime = 0(ms)', async () => {
			expect.assertions(3)
    
			let executionPath = ''
			setRequestParameter({
				status: 'loading',
				loadedTime: 0,
			})
			let response = fetch('')
			response
				.then(() => executionPath='then')
				.catch(() => executionPath='catch')
			expect(executionPath).toBe('')
            
			jest.advanceTimersByTime(0)
			await expect(response).resolves.toStrictEqual(new Response())
			expect(executionPath).toBe('then')
		})

		test('loadedTime = 1000(ms)', async () => {
			expect.assertions(3)
    
			let executionPath = ''
			setRequestParameter({
				status: 'loading',
				loadedTime: 1000,
			})
			let response = fetch('')
			response
				.then(() => executionPath='then')
				.catch(() => executionPath='catch')
			expect(executionPath).toBe('')
            
			jest.advanceTimersByTime(1000)
			await expect(response).resolves.toStrictEqual(new Response())
			expect(executionPath).toBe('then')
		})
        
		test('loadedTime = 5000(ms)', async () => {
			expect.assertions(3)
    
			let executionPath = ''
			setRequestParameter({
				status: 'loading',
				loadedTime: 5000,
			})
			let response = fetch('')
			response
				.then(() => executionPath='then')
				.catch(() => executionPath='catch')
			expect(executionPath).toBe('')
            
			jest.advanceTimersByTime(5000)
			await expect(response).resolves.toStrictEqual(new Response())
			expect(executionPath).toBe('then')
		})
	})
})




describe('test function fetchText', () => {
	test('return text', async () => {
		expect.assertions(1)
		setRequestParameter({
			status: 'text',
		})
		await expect(fetchText('')).resolves.toStrictEqual(strText)
	})
    
	test('return error', async () => {
		expect.assertions(1)
		setRequestParameter({
			status: 'error',
		})
		await expect(fetchText('')).rejects.toThrow(new Error('mock error'))
	})
})

describe('test function fetchJSON', () => {
	test('return json', async () => {
		expect.assertions(1)
		setRequestParameter({
			status: 'json',
		})
		await expect(fetchJSON('')).resolves.toStrictEqual(JSON.parse(strJson))
	})
    
	test('return error', async () => {
		expect.assertions(1)
		setRequestParameter({
			status: 'error',
		})
		await expect(fetchJSON('')).rejects.toThrow(new Error('mock error'))
	})
})

describe('test function fetchBlob', () => {
	test('return blob', async () => {
		expect.assertions(1)
		setRequestParameter({
			status: 'blob',
		})
		await expect(fetchBlob('')).resolves.toStrictEqual(await new Response(strBlob).blob())
		// Response in node-fetch isn't built-in Response
		// await expect(fetchBlob('')).resolves.toStrictEqual(new Blob([strBlob], { type : 'text/plain;charset=utf-8' }))
	})
    
	test('return error', async () => {
		expect.assertions(1)
		setRequestParameter({
			status: 'error',
		})
		await expect(fetchBlob('')).rejects.toThrow(new Error('mock error'))
	})
})

describe('test function fetchDocument', () => {
	test('return html', async () => {
		expect.assertions(1)
		setRequestParameter({
			status: 'html',
		})
		await expect(fetchDocument('')).resolves.toStrictEqual(new DOMParser().parseFromString(strHTML, "text/html"))
	})
    
	test('return error', async () => {
		expect.assertions(1)
		setRequestParameter({
			status: 'error',
		})
		await expect(fetchDocument('')).rejects.toThrow(new Error('mock error'))
	})
})

// describe('test function fetchGZip', () => {
// 	// Manual test passed
// 	// test('ReferenceError: CompressionStream is not defined', () => {
// 	//     console.log(CompressionStream)
// 	// })
// 	// test('ReferenceError: DecompressionStream is not defined', () => {
// 	//     console.log(DecompressionStream)
// 	// })
// })




describe('test function fetchOnlyResponseOk', () => {
	beforeEach(() => {
		expect.assertions(1)
	})


	test('return 200', async () => {
		setRequestParameter({
			status: '200',
		})
		await expect(fetchOnlyResponseOk('')).resolves.toStrictEqual(new Response())
	})
    
	test('return 404', async () => {
		setRequestParameter({
			status: '404',
		})
		await expect(fetchOnlyResponseOk('')).rejects.toThrow(new Error(`[HTTP 404] The response isn't ok.`))
	})
    
	test('return error', async () => {
		setRequestParameter({
			status: 'error',
		})
		await expect(fetchOnlyResponseOk('')).rejects.toThrow(new Error('mock error'))
	})
})


describe('test function fetchInTime', () => {
	test('return 200', async () => {
		expect.assertions(3)

		let executionPath = ''
		setRequestParameter({
			status: '200',
		})
		let promise = fetchInTime('')
		promise
			.then(() => executionPath='then')
			.catch(() => executionPath='catch')
		expect(executionPath).toBe('')
        
		jest.advanceTimersByTime(0)
		await expect(promise).resolves.toStrictEqual(new Response())
		expect(executionPath).toBe('then')
	})

	test('return 404', async () => {
		expect.assertions(1)
		setRequestParameter({
			status: '404',
		})
		await expect(fetchInTime('')).resolves.toStrictEqual(new Response('', { status: 404 }))
	})

	test('return error', async () => {
		expect.assertions(1)
		setRequestParameter({
			status: 'error',
		})
		await expect(fetchInTime('')).rejects.toThrow(new Error('mock error'))
	})


	describe('fetch in time', () => {
		beforeEach(() => {
			expect.assertions(3)
		})


		// The loading time of mockFetch cannot be the same as the waiting time of fetchInTime, and it may be caused by implementation method of setTimeout in Jest.
		test('waitingTime = 1(ms)', async () => {
			let executionPath = ''
			setRequestParameter({
				status: '200',
				loadedTime: 0,
			})
			let promise = fetchInTime('', {}, 1)
			promise
				.then(() => executionPath='then')
				.catch(() => executionPath='catch')
			expect(executionPath).toBe('')

			jest.advanceTimersByTime(0)
			await expect(promise).resolves.toStrictEqual(new Response())
			expect(executionPath).toBe('then')
		})
		test('waitingTime = 1000(ms)', async () => {
			let executionPath = ''
			setRequestParameter({
				status: '200',
				loadedTime: 999,
			})
			let promise = fetchInTime('', {}, 1000)
			promise
				.then(() => executionPath='then')
				.catch(() => executionPath='catch')
			expect(executionPath).toBe('')

			jest.advanceTimersByTime(999)
			await expect(promise).resolves.toStrictEqual(new Response())
			expect(executionPath).toBe('then')
		})
		test('waitingTime = 5000(ms)', async () => {
			let executionPath = ''
			setRequestParameter({
				status: '200',
				loadedTime: 4999,
			})
			let promise = fetchInTime('', {}, 5000)
			promise
				.then(() => executionPath='then')
				.catch(() => executionPath='catch')
			expect(executionPath).toBe('')

			jest.advanceTimersByTime(4999)
			await expect(promise).resolves.toStrictEqual(new Response())
			expect(executionPath).toBe('then')
		})
	})

	describe('fetch overtime', () => {
		beforeEach(() => {
			expect.assertions(3)
		})

		test('waitingTime = 0(ms)', async () => {
			let executionPath = ''
			setRequestParameter({
				status: 'keep loading',
			})
			let promise = fetchInTime('', {}, 0)
			promise
				.then(() => executionPath='then')
				.catch(() => executionPath='catch')
			expect(executionPath).toBe('')

			jest.advanceTimersByTime(0)
			await expect(promise).rejects.toThrow(new Error('fetch overtime'))
			expect(executionPath).toBe('catch')
		})
		test('waitingTime = 1000(ms)', async () => {
			let executionPath = ''
			setRequestParameter({
				status: 'keep loading',
			})
			let promise = fetchInTime('', {}, 1000)
			promise
				.then(() => executionPath='then')
				.catch(() => executionPath='catch')
			expect(executionPath).toBe('')

			jest.advanceTimersByTime(1000)
			await expect(promise).rejects.toThrow(new Error('fetch overtime'))
			expect(executionPath).toBe('catch')
		})
		test('waitingTime = 5000(ms)', async () => {
			let executionPath = ''
			setRequestParameter({
				status: 'keep loading',
			})
			let promise = fetchInTime('', {}, 5000)
			promise
				.then(() => executionPath='then')
				.catch(() => executionPath='catch')
			expect(executionPath).toBe('')

			jest.advanceTimersByTime(5000)
			await expect(promise).rejects.toThrow(new Error('fetch overtime'))
			expect(executionPath).toBe('catch')
		})
	})
})


describe('test function fetchAutoRetry', () => {
	test('return 200', async () => {
		expect.assertions(3)

		let executionPath = ''
		setRequestParameter({
			status: '200',
		})
		let promise = fetchAutoRetry('')
		promise
			.then(() => executionPath='then')
			.catch(() => executionPath='catch')
		expect(executionPath).toBe('')
        
		jest.advanceTimersByTime(0)
		await expect(promise).resolves.toStrictEqual(new Response())
		expect(executionPath).toBe('then')
	})

	test('return 404', async () => {
		expect.assertions(1)
		setRequestParameter({
			status: '404',
		})
		await expect(fetchAutoRetry('', {}, 0)).resolves.toStrictEqual(new Response('', { status: 404 }))
	})

	test('return error', async () => {
		expect.assertions(1)
		setRequestParameter({
			status: 'error',
		})
		await expect(fetchAutoRetry('', {}, 0)).rejects.toThrow(new Error('mock error'))
	})


	describe('retry to fetch', () => {
		beforeEach(() => {
			// function sleep can't use fake timers (jest.advanceTimersByTime has no effect on sleep), so it hasn't tested delay function
			jest.useRealTimers()
			expect.assertions(1)
		})


		describe('zero times', () => {
			test('blockTimes = 0', async () => {
				setRequestParameter({
					status: '200',
					blockTimes: 0,
				})
				await expect(fetchAutoRetry('', {}, 0, 0)).resolves.toStrictEqual(new Response())
			})
			test('blockTimes = 1', async () => {
				setRequestParameter({
					status: '200',
					blockTimes: 1,
				})
				await expect(fetchAutoRetry('', {}, 0, 0)).rejects.toThrow(new Error('mock blocking'))
			})
		})
        
		describe('once', () => {
			test('blockTimes = 1', async () => {
				setRequestParameter({
					status: '200',
					blockTimes: 1,
				})
				await expect(fetchAutoRetry('', {}, 1, 0)).resolves.toStrictEqual(new Response())
			})
			test('blockTimes = 2', async () => {
				setRequestParameter({
					status: '200',
					blockTimes: 2,
				})
				await expect(fetchAutoRetry('', {}, 1, 0)).rejects.toThrow(new Error('mock blocking'))
			})
		})
        
		describe('five times', () => {
			test('blockTimes = 5', async () => {
				setRequestParameter({
					status: '200',
					blockTimes: 5,
				})
				await expect(fetchAutoRetry('', {}, 5, 0)).resolves.toStrictEqual(new Response())
			})
			test('blockTimes = 6', async () => {
				setRequestParameter({
					status: '200',
					blockTimes: 6,
				})
				await expect(fetchAutoRetry('', {}, 5, 0)).rejects.toThrow(new Error('mock blocking'))
			})
		})
	})
})


describe('test function combineSignals', () => {
	const getAbortedSignal = (): AbortSignal => {
		const controller = new AbortController()
		controller.abort()
		return controller.signal
	}


	test('empty', () => {
		expect(combineSignals([]).aborted).toBe(false)
	})

	test('one signal', () => {
		let combinedSignal, combiningSignal
		expect(combineSignals([new AbortController().signal]).aborted).toBe(false)

		combiningSignal = combineSignals([getAbortedSignal()])
		expect(combiningSignal.aborted).toBe(true)
        
		combinedSignal = new AbortController()
		combiningSignal = combineSignals([combinedSignal.signal])
		expect(combiningSignal.aborted).toBe(false)
		combinedSignal.abort()
		expect(combiningSignal.aborted).toBe(true)
	})

	test('multiple signal', () => {
		let combinedSignal01, combinedSignal02, combinedSignal03, combiningSignal;

		expect(    combineSignals([new AbortController().signal	, new AbortController().signal	, new AbortController().signal	]).aborted    ).toBe(false)
		
		expect(    combineSignals([getAbortedSignal()			, new AbortController().signal	, new AbortController().signal	]).aborted    ).toBe(true)
		expect(    combineSignals([new AbortController().signal	, getAbortedSignal()			, new AbortController().signal	]).aborted    ).toBe(true)
		expect(    combineSignals([new AbortController().signal	, new AbortController().signal	, getAbortedSignal()			]).aborted    ).toBe(true)

		expect(    combineSignals([new AbortController().signal	, getAbortedSignal()			, getAbortedSignal()			]).aborted    ).toBe(true)
		expect(    combineSignals([getAbortedSignal()			, new AbortController().signal	, getAbortedSignal()			]).aborted    ).toBe(true)
		expect(    combineSignals([getAbortedSignal()			, getAbortedSignal()			, new AbortController().signal	]).aborted    ).toBe(true)
		
		expect(    combineSignals([getAbortedSignal()			, getAbortedSignal()			, getAbortedSignal()			]).aborted    ).toBe(true)


		combinedSignal01 = new AbortController()
		combiningSignal = combineSignals([combinedSignal01.signal, new AbortController().signal, new AbortController().signal])  
		expect(combiningSignal.aborted).toBe(false)
		combinedSignal01.abort()
		expect(combiningSignal.aborted).toBe(true)

		combinedSignal01 = new AbortController()
		combiningSignal = combineSignals([new AbortController().signal, combinedSignal01.signal, new AbortController().signal])  
		expect(combiningSignal.aborted).toBe(false)
		combinedSignal01.abort()
		expect(combiningSignal.aborted).toBe(true)

		combinedSignal01 = new AbortController()
		combiningSignal = combineSignals([new AbortController().signal, new AbortController().signal, combinedSignal01.signal])  
		expect(combiningSignal.aborted).toBe(false)
		combinedSignal01.abort()
		expect(combiningSignal.aborted).toBe(true)
		
		combinedSignal01 = new AbortController()
		combinedSignal02 = new AbortController()
		combiningSignal = combineSignals([new AbortController().signal, combinedSignal01.signal, combinedSignal02.signal])  
		expect(combiningSignal.aborted).toBe(false)
		combinedSignal01.abort()
		combinedSignal02.abort()
		expect(combiningSignal.aborted).toBe(true)
		
		combinedSignal01 = new AbortController()
		combinedSignal02 = new AbortController()
		combiningSignal = combineSignals([combinedSignal01.signal, new AbortController().signal, combinedSignal02.signal])  
		expect(combiningSignal.aborted).toBe(false)
		combinedSignal01.abort()
		combinedSignal02.abort()
		expect(combiningSignal.aborted).toBe(true)
		
		combinedSignal01 = new AbortController()
		combinedSignal02 = new AbortController()
		combiningSignal = combineSignals([combinedSignal01.signal, combinedSignal02.signal, new AbortController().signal])  
		expect(combiningSignal.aborted).toBe(false)
		combinedSignal01.abort()
		combinedSignal02.abort()
		expect(combiningSignal.aborted).toBe(true)
		
		combinedSignal01 = new AbortController()
		combinedSignal02 = new AbortController()
		combinedSignal03 = new AbortController()
		combiningSignal = combineSignals([combinedSignal01.signal, combinedSignal02.signal, combinedSignal03.signal])  
		expect(combiningSignal.aborted).toBe(false)
		combinedSignal01.abort()
		combinedSignal02.abort()
		combinedSignal03.abort()
		expect(combiningSignal.aborted).toBe(true)
	})
})




describe('test function joFetch', () => {
	test('return 200', async () => {
		expect.assertions(1)
		setRequestParameter({
			status: '200',
		})
		await expect(joFetch('')).resolves.toStrictEqual(new Response())
	})

	test('return 404', async () => {
		expect.assertions(2)
		setRequestParameter({
			status: '404',
		})
		await expect(joFetch('', {retryTimes: 0})).resolves.toStrictEqual(new Response('', { status: 404 }))
		setRequestParameter({
			status: '404',
		})
		await expect(joFetch('', {retryTimes: 0, isBadResponseError: true})).rejects.toThrow(new Error(`[HTTP 404] The response isn't ok.`))
	})

	test('return error', async () => {
		expect.assertions(1)
		setRequestParameter({
			status: 'error',
		})
		await expect(joFetch('', {retryTimes: 0})).rejects.toThrow(new Error('mock error'))
	})

	test('to text', async () => {
		expect.assertions(1)
		setRequestParameter({
			status: 'text',
		})
		await expect(joFetch('', {typeTo: 'text'})).resolves.toStrictEqual(strText)
	})

	test('to json', async () => {
		expect.assertions(1)
		setRequestParameter({
			status: 'json',
		})
		await expect(joFetch('', {typeTo: 'json'})).resolves.toStrictEqual(JSON.parse(strJson))
	})

	test('to blob', async () => {
		expect.assertions(1)
		setRequestParameter({
			status: 'blob',
		})
		await expect(joFetch('', {typeTo: 'blob'})).resolves.toStrictEqual(await new Response(strBlob).blob())
	})

	test('to html', async () => {
		expect.assertions(1)
		setRequestParameter({
			status: 'html',
		})
		await expect(joFetch('', {typeTo: 'document'})).resolves.toStrictEqual(new DOMParser().parseFromString(strHTML, "text/html"))
	})

	describe('from GZip', () => {
		// Manual test passed
		// test('ReferenceError: CompressionStream is not defined', () => {
		//     console.log(CompressionStream)
		// })
		// test('ReferenceError: DecompressionStream is not defined', () => {
		//     console.log(DecompressionStream)
		// })
	})
    

	describe('cancel fetching', () => {
		test('abort signal', async () => {
			expect.assertions(2)
			let promise, controller
            
			controller = new AbortController()
			controller.abort()
			setRequestParameter({
				status: 'canceling',
			})
			promise = joFetch('', {signal: controller.signal})
			await expect(promise).resolves.toStrictEqual(new Response('canceled'))
    
			controller = new AbortController()
			setRequestParameter({
				status: 'canceling',
			})
			promise = joFetch('', {signal: controller.signal})
			controller.abort()
			await expect(promise).resolves.toStrictEqual(new Response('canceled'))
		})
        
		test('catch error', async () => {
			expect.assertions(1)
			setRequestParameter({
				status: 'error',
			})
			await expect(joFetch('', {retryTimes: 0})).rejects.toThrow(new Error('mock error'))
		})
	})

	describe('fetch in time', () => {
		beforeEach(() => {
			expect.assertions(3)
		})

        
		test('waitingTime = 1(ms)', async () => {
			let executionPath = ''
			setRequestParameter({
				status: '200',
				loadedTime: 0,
			})
			let promise = joFetch('', {loadingTime: 1})
			promise
				.then(() => executionPath='then')
				.catch(() => executionPath='catch')
			expect(executionPath).toBe('')

			jest.advanceTimersByTime(0)
			await expect(promise).resolves.toStrictEqual(new Response())
			expect(executionPath).toBe('then')
		})
		test('waitingTime = 1000(ms)', async () => {
			let executionPath = ''
			setRequestParameter({
				status: '200',
				loadedTime: 999,
			})
			let promise = joFetch('', {loadingTime: 1000})
			promise
				.then(() => executionPath='then')
				.catch(() => executionPath='catch')
			expect(executionPath).toBe('')

			jest.advanceTimersByTime(1)
			await expect(promise).resolves.toStrictEqual(new Response())
			expect(executionPath).toBe('then')
		})
		test('waitingTime = 5000(ms)', async () => {
			let executionPath = ''
			setRequestParameter({
				status: '200',
				loadedTime: 4999,
			})
			let promise = joFetch('', {loadingTime: 5000})
			promise
				.then(() => executionPath='then')
				.catch(() => executionPath='catch')
			expect(executionPath).toBe('')

			jest.advanceTimersByTime(4999)
			await expect(promise).resolves.toStrictEqual(new Response())
			expect(executionPath).toBe('then')
		})
	})

	describe('fetch overtime', () => {
		beforeEach(() => {
			expect.assertions(3)
		})


		test('waitingTime = 0(ms)', async () => {
			let executionPath = ''
			setRequestParameter({
				status: 'keep loading',
			})
			let promise = joFetch('', {loadingTime: 0, retryTimes: 0})
			promise
				.then(() => executionPath='then')
				.catch(() => executionPath='catch')
			expect(executionPath).toBe('')

			jest.advanceTimersByTime(0)
			await expect(promise).rejects.toThrow(new Error('fetch overtime'))
			expect(executionPath).toBe('catch')
		})
		test('waitingTime = 1000(ms)', async () => {
			let executionPath = ''
			setRequestParameter({
				status: 'keep loading',
			})
			let promise = joFetch('', {loadingTime: 1000, retryTimes: 0})
			promise
				.then(() => executionPath='then')
				.catch(() => executionPath='catch')
			expect(executionPath).toBe('')

			jest.advanceTimersByTime(1000)
			await expect(promise).rejects.toThrow(new Error('fetch overtime'))
			expect(executionPath).toBe('catch')
		})
		test('waitingTime = 5000(ms)', async () => {
			let executionPath = ''
			setRequestParameter({
				status: 'keep loading',
			})
			let promise = joFetch('', {loadingTime: 5000, retryTimes: 0})
			promise
				.then(() => executionPath='then')
				.catch(() => executionPath='catch')
			expect(executionPath).toBe('')

			jest.advanceTimersByTime(5000)
			await expect(promise).rejects.toThrow(new Error('fetch overtime'))
			expect(executionPath).toBe('catch')
		})
	})
    

	describe('retry to fetch', () => {
		beforeEach(() => {
			jest.useRealTimers()
			expect.assertions(1)
		})


		test('when fetch overtime', async () => {
			setRequestParameter({
				status: 'keep loading',
			})
			await expect(joFetch('', {loadingTime: 0, retryTimes: 5, retryDelay: 0})).rejects.toThrow(new Error('fetch overtime'))
		})

		describe('zero times', () => {
			test('blockTimes = 0', async () => {
				setRequestParameter({
					status: '200',
					blockTimes: 0,
				})
				await expect(joFetch('', {retryTimes: 0, retryDelay: 0})).resolves.toStrictEqual(new Response())
			})
			test('blockTimes = 1', async () => {
				setRequestParameter({
					status: '200',
					blockTimes: 1,
				})
				await expect(joFetch('', {retryTimes: 0, retryDelay: 0})).rejects.toThrow(new Error('mock blocking'))
			})
		})
        
		describe('once', () => {
			test('blockTimes = 1', async () => {
				setRequestParameter({
					status: '200',
					blockTimes: 1,
				})
				await expect(joFetch('', {retryTimes: 1, retryDelay: 0})).resolves.toStrictEqual(new Response())
			})
			test('blockTimes = 2', async () => {
				setRequestParameter({
					status: '200',
					blockTimes: 2,
				})
				await expect(joFetch('', {retryTimes: 1, retryDelay: 0})).rejects.toThrow(new Error('mock blocking'))
			})
		})
        
		describe('five times', () => {
			test('blockTimes = 5', async () => {
				setRequestParameter({
					status: '200',
					blockTimes: 5,
				})
				await expect(joFetch('', {retryTimes: 5, retryDelay: 0})).resolves.toStrictEqual(new Response())
			})
			test('blockTimes = 6', async () => {
				setRequestParameter({
					status: '200',
					blockTimes: 6,
				})
				await expect(joFetch('', {retryTimes: 5, retryDelay: 0})).rejects.toThrow(new Error('mock blocking'))
			})
		})
        
		test('once and return text', async () => {
			setRequestParameter({
				status: 'text',
				blockTimes: 1,
			})
			await expect(joFetch('', {retryTimes: 1, retryDelay: 0, typeTo: 'text'})).resolves.toBe(strText)
		})
	})


	describe('deal with error', () => {
		beforeEach(() => {
			expect.assertions(2)
		})


		test('throw error', async () => {
			setRequestParameter({
				status: 'error',
			})
			await expect(joFetch('', {retryTimes: 0})).rejects.toThrow(new Error('mock error'))
			setRequestParameter({
				status: '404',
			})
			await expect(joFetch('', {retryTimes: 0, isBadResponseError: true}))
				.rejects.toThrow(new Error(`[HTTP 404] The response isn't ok.`))
		})
		test('catch error and return -1', async () => {
			setRequestParameter({
				status: 'error',
			})
			await expect(joFetch('', {retryTimes: 0, onError: (() => -1)})).resolves.toBe(-1)
			setRequestParameter({
				status: '404',
			})
			await expect(joFetch('', {retryTimes: 0, onError: (() => -1), isBadResponseError: true})).resolves.toBe(-1)
		})
		test('catch error and return empty array', async () => {
			setRequestParameter({
				status: 'error',
			})
			await expect(joFetch('', {retryTimes: 0, onError: (() => [])})).resolves.toStrictEqual([])
			setRequestParameter({
				status: '404',
			})
			await expect(joFetch('', {retryTimes: 0, onError: (() => []), isBadResponseError: true})).resolves.toStrictEqual([])
		})
	})
})