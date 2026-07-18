import { defineConfig, devices } from "@playwright/test";

/**
 * E2E smoke tests. Runs the built app and drives the real UI with all
 * `/api/*` calls stubbed at the browser boundary, so no external network
 * is needed — deterministic in CI. Audio-preview behavior is covered by
 * unit tests (src/core/preview.ts); these focus on the render/interaction
 * flows that unit tests can't reach.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  use: { baseURL: "http://127.0.0.1:3111" },
  webServer: {
    command: "npm run build && npm run start -- -p 3111",
    url: "http://127.0.0.1:3111",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Local sandboxes pin a pre-installed Chromium at a fixed path;
        // CI installs the version-matched browser, so leave it unset there.
        launchOptions: process.env.PW_EXECUTABLE_PATH
          ? { executablePath: process.env.PW_EXECUTABLE_PATH }
          : {},
      },
    },
  ],
});

