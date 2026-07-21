import { defineConfig, configDefaults } from "vitest/config";
import { normalizePath } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = normalizePath(id);
          if (normalizedId.includes("node_modules/tone")) {
            return "audio-tone";
          }
          if (normalizedId.includes("node_modules/meyda")) {
            return "analysis-meyda";
          }
          if (
            normalizedId.includes("src/components/SongDecomposePanel") ||
            normalizedId.includes("src/lib/songDecompose") ||
            normalizedId.includes("src/lib/audioFileDecode") ||
            normalizedId.includes("src/lib/tempoEstimation") ||
            normalizedId.includes("src/lib/oneBarWindow") ||
            normalizedId.includes("src/lib/waveformToLevelFrames") ||
            normalizedId.includes("src/lib/meydaBeatboxAnalysis")
          ) {
            return "songlab";
          }
        },
      },
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    // `*.ext.test.ts` are opt-in workshop EXTENSION acceptances (e.g. the 4-lane
    // add-on). They are intentionally red on the skeleton, so they are excluded
    // from the graded gate to keep the baseline "red on ONLY amapiano". Run them
    // with `npm run test:ext`.
    exclude: [...configDefaults.exclude, "**/*.ext.test.{ts,tsx}"],
  },
});
