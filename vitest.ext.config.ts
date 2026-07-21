import { defineConfig } from "vitest/config";

// Extension acceptances (`*.ext.test.ts`) — opt-in workshop stretch targets that
// live OUTSIDE the graded gate (see vite.config.ts). On the skeleton these are
// red by design; students turn them green by completing the add-on.
//   npm run test:ext
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.ext.test.{ts,tsx}"],
  },
});
