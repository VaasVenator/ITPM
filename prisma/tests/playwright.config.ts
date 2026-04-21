import { defineConfig } from "@playwright/test";
import path from "path";

export default defineConfig({
  testDir: ".",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:3000",
    headless: true,
  },
  webServer: {
    command: "next dev",
    cwd: path.join(__dirname, "../.."),
    url: "http://127.0.0.1:3000",
    reuseExistingServer: false,
    timeout: 120_000,
  },
  workers: 1,
});