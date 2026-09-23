const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    // Moveez targets iOS only: WebKit (the Safari engine) with the iPhone profile.
    ...devices["iPhone 13"],
    // In WebKit, requests of a page controlled by a service worker bypass page.route mocks.
    serviceWorkers: "block"
  },
  webServer: {
    command: "python3 -m http.server 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true
  }
});
