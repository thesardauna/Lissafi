import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Repo name is "Lissafi" (case-sensitive), so base must match:
  base: "/Lissafi/"
});
