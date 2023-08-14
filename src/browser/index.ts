export * from "../";
// Make the default export can be imported directly.
import joFetch from '../';
export default joFetch;
exports = module.exports = joFetch;


export async function fetchGZip(url: string, parameter?: RequestInit): Promise<Response> {
	return fetch(url, parameter)
		.then(response => response.blob())
		.then(data => new Response(data.stream().pipeThrough( new DecompressionStream('gzip') )))
}