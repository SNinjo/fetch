import path from "path"
import pluginDelete from "rollup-plugin-delete"
import pluginTypescript from "@rollup/plugin-typescript"
import pluginCommonjs from "@rollup/plugin-commonjs"
import pluginNodeResolve from "@rollup/plugin-node-resolve"
import { terser } from "rollup-plugin-terser"
import { babel } from "@rollup/plugin-babel"

import pkg from "./package.json"


const moduleName = pkg.name.replace(/^@.*\//, "")
const banner = `
/**
 * @license
 * author: ${pkg.author.name} <${pkg.author.email}> (${pkg.author.web})
 * ${moduleName} v${pkg.version}
 * Released under the ${pkg.license} license.
 */
`

export default [
	{
		input: "src/fakeInput.ts",
		plugins: [
			pluginDelete({
				targets: [
					"build/*",
				]
			}),
		]
	},


	{
		input: "src/commonJs/index.ts",
		output: [
			{
				file: pkg.main,
				format: "cjs",
				sourcemap: true,
				banner,
				exports: "named"
			},
		],
		external: [
			...Object.keys(pkg.dependencies || {}),
			...Object.keys(pkg.devDependencies || {}),
		],
		plugins: [
			pluginTypescript(),
			pluginCommonjs({
				extensions: [".js", ".ts"],
				include: ["./src/test.ts"]
			}),
			babel({
				babelHelpers: "bundled",
				configFile: path.resolve(__dirname, "babel.config.json"),
			}),
			pluginNodeResolve({
				browser: false,
			}),
			(process.env.NODE_ENV === "production")? terser() : null
		],
	},

	{
		input: "src/ECMAScript/index.ts",
		output: [
			{
				file: pkg.module,
				format: "es",
				sourcemap: true,
				banner,
				exports: "named",
			},
		],
		external: [
			...Object.keys(pkg.dependencies || {}),
			...Object.keys(pkg.devDependencies || {}),
		],
		plugins: [
			pluginTypescript(),
			pluginCommonjs({
				extensions: [".js", ".ts"],
			}),
			babel({
				babelHelpers: "bundled",
				configFile: path.resolve(__dirname, "babel.config.json"),
			}),
			pluginNodeResolve({
				browser: false,
			}),
			(process.env.NODE_ENV === "production")? terser() : null,
		],
	},
	
	{
		input: "src/browser/index.ts",
		output: [
			{
				name: moduleName,
				file: pkg.browser,
				format: "iife",
				sourcemap: true,
				banner,
				exports: "named"
			},
		],
		external: [
			...Object.keys(pkg.dependencies || {}),
			...Object.keys(pkg.devDependencies || {}),
		],
		plugins: [
			pluginTypescript(),
			pluginCommonjs({
				extensions: [".js", ".ts"],
			}),
			babel({
				babelHelpers: "bundled",
				configFile: path.resolve(__dirname, "babel.config.json"),
			}),
			pluginNodeResolve({
				browser: true,
			}),
			(process.env.NODE_ENV === "production")? terser() : null,
		],
	},

	// {
	// 	input: inputFileName,
	// 	output: {
	// 		name: moduleName,
	// 		file: pkg.main,
	// 		format: "umd",
	// 		banner
	// 	},
	// 	plugins: [
	// 		pluginDelete({ targets: "build/*" }),
	// 		pluginTypescript(),
	// 		pluginCommonjs(),
	// 		pluginNodeResolve(),
	// 		terser(),
	// 	],
	// }


	{
		input: "src/fakeInput.ts",
		plugins: [
			pluginDelete({
				targets: [
					"build/commonJs",
					"build/ECMAScript",
					"build/browser",
				]
			}),
		]
	},
];