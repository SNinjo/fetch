# JoFetch &middot; [![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/SNinjo/jo-fetch/blob/main/LICENSE) [![NPM](https://img.shields.io/badge/npm-v1.0.0-blue)](https://www.npmjs.com/package/jo-fetch) [![CI](https://img.shields.io/badge/CI-passing-brightgreen)](https://github.com/SNinjo/jo-fetch/actions/workflows/ci.yml)
JoFetch is a JavaScript tool that provides enhanced fetch functionality.

There are a lot of functions in this tool, such as simple or integration version.
Of course, all functions are successfully tested by Jest.
By the way, hope this fetch function return any data jo(just) like how we call it.

## Usage
``` javascript
import joFetch from 'jo-fetch'
let doc = await joFetch(
        'https://www.google.com',
        { method: 'GET' },
        {
            loadingTime: 10000,
            retryTimes: 5,
            retryDelay: 1000,
            returnType: 'html',
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
joFetch(url, parem, config)
The attributes in parameter config
| Attribute   | Type   | Description                                                                  |
| ----------- | ------ | ---------------------------------------------------------------------------- |
| loadingTime | number | Define the loading time for this fetch. If the fetch time exceeds this value, this fetch fails and an error is thrown. |
| retryTimes  | number | Define the number of times to retry to fetch it again when this fetch fails. |
| retryDelay  | number | Define the delay before each retry.                                          |
| returnType  | string | Specify the type of returned data.                                           |

#### Simple function
The parameters, url and param, are same as window.fetch.
| Function                                 | Return Type | Description                                                |
| ---------------------------------------- | ----------- | ---------------------------------------------------------- |
| fetchJSON(url, param)                    | Promise     | Return the result in json form after fetching.             |
| fetchDocument(url, param)                | Promise     | Return the result as a document after fetching.            |
| fetchInTime(url, param, time)            | Promise     | Return the result within a limit time. if not, this fetch fails and an error is thrown. |
| fetchAutoRetry(url, param, times, delay) | Promise     | Return the result, and if the fetch fails, automatically retry to fetch within a limited number of times. |

## License
JoFetch is [MIT licensed](./LICENSE).