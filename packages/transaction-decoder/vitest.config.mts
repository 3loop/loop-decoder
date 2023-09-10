import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "node:path";

// https://vitest.dev/config
export default defineConfig(() => {
  return {
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      target: "esnext",
    },
    plugins: [tsconfigPaths()],
    test: {
      include: ["./test/**/*.test.ts"],
    },
  };
});
