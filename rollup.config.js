// rollup.config.js
import typescript from "@rollup/plugin-typescript";

export default [
  {
    input: "src/index.ts",
    output: [
      {
        file: "dist/index.mjs",
        format: "es",
        sourcemap: false,
        exports: "named",
      },
      {
        file: "dist/index.umd.js",
        name: "salutejs",
        format: "umd",
        sourcemap: false,
        exports: "named",
      },
    ],
    plugins: [
      typescript({
        tsconfig: "tsconfig.esm.json",
        sourceMap: false,
      }),
    ],
  },
];
