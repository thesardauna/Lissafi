import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // IMPORTANT: Change "lissafi" to your GitHub repository name if different.
  base: "/lissafi/"
});
