import joFetch, { fetchText, fetchJSON, fetchBlob, fetchDocument, fetchGZip, fetchInTime, fetchAutoRetry } from "./"
import { Response } from "whatwg-fetch"


const strText = 'text'
const strBlob = 'blob'
const strJson = '{"num": 1}'
const strHTML = '<body><h1>text</h1></body>'
async function mockFetch(url, parameter = {}){
    switch (parameter.status){
        case 'keep loading':
            return new Promise(() => {})
        case 'loading':
            return new Promise(
                resolve => setTimeout(  () => resolve(200), parameter.loadingTime  )
            )
        case 'block':
            if (parameter.blockTimes === 0) return mockFetch(url, {status: '200'})
            else {
                parameter.blockTimes--
                return mockFetch(url, {status: 'error'})
            }
        case 'error':
            return new Promise((resolve, reject) => reject(new Error()))

        case 'text':
            return new Promise(resolve => resolve({
                data: strText,
                text: () => strText,
            }))
        case 'json':
            return new Promise(resolve => resolve({
                data: strJson,
                json: () => JSON.parse(strJson),
            }))
        case 'blob':
            const blob = await new Response(strBlob).blob()
            return new Promise(resolve => resolve({
                data: blob,
                blob: () => blob,
            }))
        case 'html':
            return new Promise(resolve => resolve({
                data: strHTML,
                text: () => strHTML,
            }))
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
            return new Promise(resolve => resolve(404))
        case '200':
        default:
            return new Promise(resolve => resolve(200))
    }
}
beforeEach(() => {
    jest.useFakeTimers()
    window.fetch = jest.fn().mockImplementation(mockFetch)
})
afterEach(() => {
    window.fetch.mockClear()
    delete window.fetch
})


describe('test function fetch (window.fetch and mockFetch)', () => {
    test("keep loading (no response)", async () => {
        expect.assertions(2)

        let status = ''
        let result = fetch('', {status: 'keep loading'})
        result
            .then(() => status='then')
            .catch(() => status='catch')
        expect(status).toBe('')
        
        jest.advanceTimersByTime(10000)
        expect(status).toBe('')
    })

    describe("block fetching", () => {
        test('zero times', async () => {
            expect.assertions(1)
    
            let result = fetch('', {status: 'block', blockTimes: 0})
            jest.advanceTimersByTime(0)
            await expect(result).resolves.toBe(200)
        })

        test('once', async () => {
            expect.assertions(2)
            let result
            let parameter = {status: 'block', blockTimes: 1}
    
            result = fetch('', parameter)
            jest.advanceTimersByTime(0)
            await expect(result).rejects.toThrow(new Error())
            
            result = fetch('', parameter)
            jest.advanceTimersByTime(0)
            await expect(result).resolves.toBe(200)
        })

        test('five times', async () => {
            expect.assertions(6)
            let result
            let parameter = {status: 'block', blockTimes: 5}
    
            for (let times = 5; times >= 1; times--){
                result = fetch('', parameter)
                jest.advanceTimersByTime(0)
                await expect(result).rejects.toThrow(new Error())
            }
            
            result = fetch('', parameter)
            jest.advanceTimersByTime(0)
            await expect(result).resolves.toBe(200)
        })
    })

    test('return error', async () => {
        expect.assertions(1)
        await expect(fetch('', {status: 'error'})).rejects.toThrow(new Error())
    })


    test('return text', async () => {
        let response = await fetch('', {status: 'text'})
        expect(response.data).toBe(strText)
        expect(response.text()).toBe(strText)
    })

    test('return json', async () => {
        let response = await fetch('', {status: 'json'})
        expect(response.data).toBe(strJson)
        expect(response.json()).toEqual(JSON.parse(strJson))
    })

    test('return blob', async () => {
        let response = await fetch('', {status: 'blob'})
        let blob = await new Response(strBlob).blob()
        expect(response.data).toEqual(blob)
        expect(response.blob()).toEqual(blob)
    })

    test('return html', async () => {
        let response = await fetch('', {status: 'html'})
        expect(response.data).toBe(strHTML)
        expect(response.text()).toBe(strHTML)
    })

    test('return 404', async () => {
        expect.assertions(1)
        await expect(fetch('', {status: '404'})).resolves.toBe(404)
    })

    describe('return 200', () => {
        test('none', async () => {
            expect.assertions(1)
            await expect(fetch('', {status: '200'})).resolves.toBe(200)
        })

        test('loadingTime = 0(ms)', async () => {
            expect.assertions(3)
    
            let status = ''
            let result = fetch('', {status: 'loading', loadingTime: 0})
            result
                .then(() => status='then')
                .catch(() => status='catch')
            expect(status).toBe('')
            
            jest.advanceTimersByTime(0)
            await expect(result).resolves.toBe(200)
            expect(status).toBe('then')
        })

        test('loadingTime = 1000(ms)', async () => {
            expect.assertions(3)
    
            let status = ''
            let result = fetch('', {status: 'loading', loadingTime: 1000})
            result
                .then(() => status='then')
                .catch(() => status='catch')
            expect(status).toBe('')
            
            jest.advanceTimersByTime(1000)
            await expect(result).resolves.toBe(200)
            expect(status).toBe('then')
        })
        
        test('loadingTime = 5000(ms)', async () => {
            expect.assertions(3)
    
            let status = ''
            let result = fetch('', {status: 'loading', loadingTime: 5000})
            result
                .then(() => status='then')
                .catch(() => status='catch')
            expect(status).toBe('')
            
            jest.advanceTimersByTime(5000)
            await expect(result).resolves.toBe(200)
            expect(status).toBe('then')
        })
    })
})




describe('test function fetchText', () => {
    test('return text', async () => {
        expect.assertions(1)
        await expect(fetchText('', {status: 'text'})).resolves.toEqual(strText)
    })
    
    test('return error', async () => {
        expect.assertions(1)
        await expect(fetchText('', {status: 'error'})).rejects.toThrow(new Error())
    })
})

describe('test function fetchJSON', () => {
    test('return json', async () => {
        expect.assertions(1)
        await expect(fetchJSON('', {status: 'json'})).resolves.toEqual(JSON.parse(strJson))
    })
    
    test('return error', async () => {
        expect.assertions(1)
        await expect(fetchJSON('', {status: 'error'})).rejects.toThrow(new Error())
    })
})

describe('test function fetchBlob', () => {
    test('return blob', async () => {
        expect.assertions(1)
        await expect(fetchBlob('', {status: 'blob'})).resolves.toEqual(await new Response(strBlob).blob())
    })
    
    test('return error', async () => {
        expect.assertions(1)
        await expect(fetchBlob('', {status: 'error'})).rejects.toThrow(new Error())
    })
})

describe('test function fetchDocument', () => {
    test('return html', async () => {
        expect.assertions(1)
        await expect(fetchDocument('', {status: 'html'})).resolves.toEqual(new DOMParser().parseFromString(strHTML, "text/html"))
    })
    
    test('return error', async () => {
        expect.assertions(1)
        await expect(fetchDocument('', {status: 'error'})).rejects.toThrow(new Error())
    })
})

describe('test function fetchGZip', () => {
    // Manual test passed
    // test('ReferenceError: CompressionStream is not defined', () => {
    //     console.log(CompressionStream)
    // })
    // test('ReferenceError: DecompressionStream is not defined', () => {
    //     console.log(DecompressionStream)
    // })
})




describe('test function fetchInTime', () => {
    test('return 200', async () => {
        expect.assertions(3)

        let status = ''
        let result = fetchInTime('', {status: '200'})
        result
            .then(() => status='then')
            .catch(() => status='catch')
        expect(status).toBe('')
        
        jest.advanceTimersByTime(0)
        await expect(result).resolves.toBe(200)
        expect(status).toBe('then')
    })

    test('return 404', async () => {
        expect.assertions(1)
        await expect(fetchInTime('', {status: '404'})).resolves.toBe(404)
    })

    test('return error', async () => {
        expect.assertions(1)
        await expect(fetchInTime('', {status: 'error'})).rejects.toThrow(new Error())
    })


    describe('fetch in time', () => {
        beforeEach(() => {
            expect.assertions(3)
        })

        // The loading time of mockFetch cannot be the same as the waiting time of fetchInTime, and it may be caused by implementation method of setTimeout in Jest.
        test('waitingTime = 1(ms)', async () => {
            let status = ''
            let result = fetchInTime('', {status: '200', loadingTime: 0}, 1)
            result
                .then(() => status='then')
                .catch(() => status='catch')
            expect(status).toBe('')

            jest.advanceTimersByTime(0)
            await expect(result).resolves.toBe(200)
            expect(status).toBe('then')
        })
        test('waitingTime = 1000(ms)', async () => {
            let status = ''
            let result = fetchInTime('', {status: '200', loadingTime: 999}, 1000)
            result
                .then(() => status='then')
                .catch(() => status='catch')
            expect(status).toBe('')

            jest.advanceTimersByTime(999)
            await expect(result).resolves.toBe(200)
            expect(status).toBe('then')
        })
        test('waitingTime = 5000(ms)', async () => {
            let status = ''
            let result = fetchInTime('', {status: '200', loadingTime: 4999}, 5000)
            result
                .then(() => status='then')
                .catch(() => status='catch')
            expect(status).toBe('')

            jest.advanceTimersByTime(4999)
            await expect(result).resolves.toBe(200)
            expect(status).toBe('then')
        })
    })

    describe('fetch overtime', () => {
        beforeEach(() => {
            expect.assertions(3)
        })

        test('waitingTime = 0(ms)', async () => {
            let status = ''
            let result = fetchInTime('', {status: 'keep loading'}, 0)
            result
                .then(() => status='then')
                .catch(() => status='catch')
            expect(status).toBe('')

            jest.advanceTimersByTime(0)
            await expect(result).rejects.toThrow(new Error('fetch overtime'))
            expect(status).toBe('catch')
        })
        test('waitingTime = 1000(ms)', async () => {
            let status = ''
            let result = fetchInTime('', {status: 'keep loading'}, 1000)
            result
                .then(() => status='then')
                .catch(() => status='catch')
            expect(status).toBe('')

            jest.advanceTimersByTime(1000)
            await expect(result).rejects.toThrow(new Error('fetch overtime'))
            expect(status).toBe('catch')
        })
        test('waitingTime = 5000(ms)', async () => {
            let status = ''
            let result = fetchInTime('', {status: 'keep loading'}, 5000)
            result
                .then(() => status='then')
                .catch(() => status='catch')
            expect(status).toBe('')

            jest.advanceTimersByTime(5000)
            await expect(result).rejects.toThrow(new Error('fetch overtime'))
            expect(status).toBe('catch')
        })
    })
})


describe('test function fetchAutoRetry', () => {
    test('return 200', async () => {
        expect.assertions(3)

        let status = ''
        let result = fetchAutoRetry('', {status: '200'})
        result
            .then(() => status='then')
            .catch(() => status='catch')
        expect(status).toBe('')
        
        jest.advanceTimersByTime(0)
        await expect(result).resolves.toBe(200)
        expect(status).toBe('then')
    })

    test('return 404', async () => {
        expect.assertions(1)
        await expect(fetchAutoRetry('', {status: '404'}, 0)).resolves.toBe(404)
    })

    test('return error', async () => {
        expect.assertions(1)
        await expect(fetchAutoRetry('', {status: 'error'}, 0)).rejects.toThrow(new Error())
    })


    describe('retry to fetch', () => {
        beforeEach(() => {
            // function sleep can't use fake timers (jest.advanceTimersByTime has no effect on sleep), so it hasn't tested delay function
            jest.useRealTimers()
            expect.assertions(1)
        })


        describe('zero times', () => {
            test('blockTimes = 0', async () => {
                await expect(fetchAutoRetry('', {status: 'block', blockTimes: 0}, 0, 0)).resolves.toBe(200)
            })
            test('blockTimes = 1', async () => {
                await expect(fetchAutoRetry('', {status: 'block', blockTimes: 1}, 0, 0)).rejects.toThrow(new Error())
            })
        })
        
        describe('once', () => {
            test('blockTimes = 1', async () => {
                await expect(fetchAutoRetry('', {status: 'block', blockTimes: 1}, 1, 0)).resolves.toBe(200)
            })
            test('blockTimes = 2', async () => {
                await expect(fetchAutoRetry('', {status: 'block', blockTimes: 2}, 1, 0)).rejects.toThrow(new Error())
            })
        })
        
        describe('five times', () => {
            test('blockTimes = 5', async () => {
                await expect(fetchAutoRetry('', {status: 'block', blockTimes: 5}, 5, 0)).resolves.toBe(200)
            })
            test('blockTimes = 6', async () => {
                await expect(fetchAutoRetry('', {status: 'block', blockTimes: 6}, 5, 0)).rejects.toThrow(new Error())
            })
        })
    })
})




describe('test function joFetch', () => {
    test('return 200', async () => {
        expect.assertions(1)
        await expect(joFetch('', {status: '200'})).resolves.toBe(200)
    })

    test('return 404', async () => {
        expect.assertions(1)
        await expect(joFetch('', {status: '404'}, {retryTimes: 0})).resolves.toBe(404)
    })

    test('return error', async () => {
        expect.assertions(1)
        await expect(joFetch('', {status: 'error'}, {retryTimes: 0})).rejects.toThrow(new Error())
    })

    test('to text', async () => {
        expect.assertions(1)
        await expect(joFetch('', {status: 'text'}, {typeTo: 'text'})).resolves.toEqual(strText)
    })

    test('to json', async () => {
        expect.assertions(1)
        await expect(joFetch('', {status: 'json'}, {typeTo: 'json'})).resolves.toEqual(JSON.parse(strJson))
    })

    test('to blob', async () => {
        expect.assertions(1)
        await expect(joFetch('', {status: 'blob'}, {typeTo: 'blob'})).resolves.toEqual(await new Response(strBlob).blob())
    })

    test('to html', async () => {
        expect.assertions(1)
        await expect(joFetch('', {status: 'html'}, {typeTo: 'html'})).resolves.toEqual(new DOMParser().parseFromString(strHTML, "text/html"))
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


    describe('fetch in time', () => {
        beforeEach(() => {
            expect.assertions(3)
        })
        
        test('waitingTime = 1(ms)', async () => {
            let status = ''
            let result = joFetch('', {status: '200', loadingTime: 0}, {loadingTime: 1})
            result
                .then(() => status='then')
                .catch(() => status='catch')
            expect(status).toBe('')

            jest.advanceTimersByTime(0)
            await expect(result).resolves.toBe(200)
            expect(status).toBe('then')
        })
        test('waitingTime = 1000(ms)', async () => {
            let status = ''
            let result = joFetch('', {status: '200', loadingTime: 999}, {loadingTime: 1000})
            result
                .then(() => status='then')
                .catch(() => status='catch')
            expect(status).toBe('')

            jest.advanceTimersByTime(999)
            await expect(result).resolves.toBe(200)
            expect(status).toBe('then')
        })
        test('waitingTime = 5000(ms)', async () => {
            let status = ''
            let result = joFetch('', {status: '200', loadingTime: 4999}, {loadingTime: 5000})
            result
                .then(() => status='then')
                .catch(() => status='catch')
            expect(status).toBe('')

            jest.advanceTimersByTime(4999)
            await expect(result).resolves.toBe(200)
            expect(status).toBe('then')
        })
    })

    describe('fetch overtime', () => {
        beforeEach(() => {
            expect.assertions(3)
        })

        test('waitingTime = 0(ms)', async () => {
            let status = ''
            let result = joFetch('', {status: 'keep loading'}, {loadingTime: 0, retryTimes: 0})
            result
                .then(() => status='then')
                .catch(() => status='catch')
            expect(status).toBe('')

            jest.advanceTimersByTime(0)
            await expect(result).rejects.toThrow(new Error('fetch overtime'))
            expect(status).toBe('catch')
        })
        test('waitingTime = 1000(ms)', async () => {
            let status = ''
            let result = joFetch('', {status: 'keep loading'}, {loadingTime: 1000, retryTimes: 0})
            result
                .then(() => status='then')
                .catch(() => status='catch')
            expect(status).toBe('')

            jest.advanceTimersByTime(1000)
            await expect(result).rejects.toThrow(new Error('fetch overtime'))
            expect(status).toBe('catch')
        })
        test('waitingTime = 5000(ms)', async () => {
            let status = ''
            let result = joFetch('', {status: 'keep loading'}, {loadingTime: 5000, retryTimes: 0})
            result
                .then(() => status='then')
                .catch(() => status='catch')
            expect(status).toBe('')

            jest.advanceTimersByTime(5000)
            await expect(result).rejects.toThrow(new Error('fetch overtime'))
            expect(status).toBe('catch')
        })
    })
    

    describe('retry to fetch', () => {
        beforeEach(() => {
            jest.useRealTimers()
            expect.assertions(1)
        })


        test('when fetch overtime', async () => {
            await expect(joFetch('', {status: 'keep loading'}, {loadingTime: 0, retryTimes: 5, retryDelay: 0})).rejects.toThrow(new Error('fetch overtime'))
        })

        describe('zero times', () => {
            test('blockTimes = 0', async () => {
                await expect(joFetch('', {status: 'block', blockTimes: 0}, {retryTimes: 0, retryDelay: 0})).resolves.toBe(200)
            })
            test('blockTimes = 1', async () => {
                await expect(joFetch('', {status: 'block', blockTimes: 1}, {retryTimes: 0, retryDelay: 0})).rejects.toThrow(new Error())
            })
        })
        
        describe('once', () => {
            test('blockTimes = 1', async () => {
                await expect(joFetch('', {status: 'block', blockTimes: 1}, {retryTimes: 1, retryDelay: 0})).resolves.toBe(200)
            })
            test('blockTimes = 2', async () => {
                await expect(joFetch('', {status: 'block', blockTimes: 2}, {retryTimes: 1, retryDelay: 0})).rejects.toThrow(new Error())
            })
        })
        
        describe('five times', () => {
            test('blockTimes = 5', async () => {
                await expect(joFetch('', {status: 'block', blockTimes: 5}, {retryTimes: 5, retryDelay: 0})).resolves.toBe(200)
            })
            test('blockTimes = 6', async () => {
                await expect(joFetch('', {status: 'block', blockTimes: 6}, {retryTimes: 5, retryDelay: 0})).rejects.toThrow(new Error())
            })
        })
    })


    describe('deal with error', () => {
        beforeEach(() => {
            expect.assertions(1)
        })

        test('throw error', async () => {
            await expect(joFetch('', {status: 'error'}, {retryTimes: 0})).rejects.toThrow(new Error())
        })
        test('catch error and return -1', async () => {
            await expect(joFetch('', {status: 'error'}, {retryTimes: 0, useError: (() => -1)})).resolves.toBe(-1)
        })
        test('catch error and return empty array', async () => {
            await expect(joFetch('', {status: 'error'}, {retryTimes: 0, useError: (() => [])})).resolves.toEqual([])
        })
    })
})