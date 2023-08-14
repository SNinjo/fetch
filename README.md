# JoFetch &middot; [![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/SNinjo/jo-fetch/blob/master/LICENSE) [![NPM](https://img.shields.io/badge/npm-v1.1.0-blue)](https://www.npmjs.com/package/jo-fetch) [![CI](https://img.shields.io/badge/CI-passing-brightgreen)](https://github.com/SNinjo/jo-fetch/actions/workflows/ci.yml)
JoFetch is a JavaScript tool that provides enhanced fetch functionality.

There are a lot of functions in this tool, such as simple or integration version.
Of course, all functions are successfully tested by Jest.
By the way, hope this fetch function return any data jo(just) like how we call it.

## Usage
``` javascript
import joFetch from 'jo-fetch'
let doc = await joFetch(
	'https://www.google.com',
	{
		method: 'GET',
		loadingTime: 10000,
		retryTimes: 5,
		retryDelay: 1000,
		typeTo: 'document',
	}
)
```
``` javascript
import { fetchDocument } from 'jo-fetch'
let doc = await fetchDocument(
	'https://www.google.com',
	{ method: 'GET' }
)
```

## Installation
```
npm install jo-fetch
```

## API
#### Integration function (joFetch)
joFetch(url, param)  
The following are the additional attributes in the parameter "param".
| Attribute          | Type     | Description                                                                  |
| ------------------ | -------- | ---------------------------------------------------------------------------- |
| loadingTime        | number   | Define the loading time for this fetch. If the fetch time exceeds this value, this fetch fails and an error is thrown. |
| retryTimes         | number   | Define the number of times to retry to fetch it again when this fetch fails. |
| retryDelay         | number   | Define the delay before each retry.                                          |
| typeFrom           | string   | Specify the type of data to be retrieved.                                    |
| typeTo             | string   | Specify the type of returned data.                                           |
| isBadResponseError | boolean  | Define whether to throw an error when the result isn't ok status.            |
| onError            | function | Define the hook to trigger it when an error is caught.                       |

#### Simple function
The parameters, url and param, are same as window.fetch.
| Function                                                 | Return Type | Description                                       |
| -------------------------------------------------------- | ----------- | ------------------------------------------------- |
| fetchText(url, param)                                    | Promise     | Return the result as text after fetching.         |
| fetchJSON(url, param)                                    | Promise     | Return the result in json form after fetching.    |
| fetchBlob(url, param)                                    | Promise     | Return the result as a blob after fetching.       |
| fetchDocument(url, param)                                | Promise     | Return the result as a document after fetching.   |
| fetchGZip(url, param)                                    | Promise     | Return the decompressed result after fetching. It only works on browser. |
| fetchOnlyResponseOk(url, param)                          | Promise     | Return the result with ok status. If not, this fetch fails and an error is thrown. |
| fetchInTime(url, param, time: number)                    | Promise     | Return the result within a limit time. If not, this fetch fails and an error is thrown. |
| fetchAutoRetry(url, param, times: number, delay: number) | Promise     | Return the successful result. If not, it retries to fetch within a limited number of times. |
| combineSignals(signals: Array\<AbortSignal>)             | AbortSignal | Return the combined signal for each signal input. |


## License
JoFetch is [MIT licensed](./LICENSE).