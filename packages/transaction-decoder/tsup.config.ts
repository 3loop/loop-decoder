import path from "path";
import {
  defineConfig
} from "tsup";

export default defineConfig({
  dts: true,
  bundle: false,
  treeshake: true,
  target: "node16",
  format: [
    "esm",
    "cjs"
  ],
  entry: [
    "src/**/*.ts"
  ],
  tsconfig: path.resolve(__dirname, "./tsconfig.build.json"),
  outDir: "dist",
  clean: true
});