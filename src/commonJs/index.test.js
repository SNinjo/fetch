/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
import joFetch, { fetchDocument, fetchInTime } from '../../build/commonJs.js';


test('fetch and DOMParser exist', () => {
	expect(typeof fetch).toBe('function')
	expect(typeof DOMParser).toBe('function')
})

test('import functions from jo-fetch', () => {
	expect(typeof joFetch).toBe('function')
	expect(typeof fetchDocument).toBe('function')
	expect(typeof fetchInTime).toBe('function')
})

test('require functions from jo-fetch', () => {
	const joFetch = require('jo-fetch')
	const { fetchDocument, fetchInTime } = require('jo-fetch')
	expect(typeof joFetch).toBe('function')
	expect(typeof fetchDocument).toBe('function')
	expect(typeof fetchInTime).toBe('function')
})