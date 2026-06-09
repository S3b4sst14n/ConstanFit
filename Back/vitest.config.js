import { defineConfig } from "vitest/config";

// Config propia del backend para que vitest NO herede el vite.config.js del
// frontend (que carga el plugin de React). Tests Node puros.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.js"],
  },
});
