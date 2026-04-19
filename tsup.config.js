export default {
	entry: ["src/**/*.ts", "!**/*.{d.ts,spec.ts,test.ts}"],
	outDir: "build",
	format: ["esm"],
	target: "esnext",
	clean: true,
	splitting: false,
	bundle: false,
};
