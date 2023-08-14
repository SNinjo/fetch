/* eslint-disable @typescript-eslint/ban-ts-comment */
import fetch from 'node-fetch';
if (typeof global.fetch === 'undefined') {
	//@ts-ignore
	global.fetch = fetch;
}

import { JSDOM } from 'jsdom';
if (typeof global.DOMParser === 'undefined') {
	global.DOMParser = new JSDOM().window.DOMParser;
}


export * from "../";
// Make the default export can be imported directly.
import joFetch from '../';
export default joFetch;
exports = module.exports = joFetch;