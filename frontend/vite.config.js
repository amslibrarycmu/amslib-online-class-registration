import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  base: "/library/amslibclass/",
  plugins: [tailwindcss()],
});
