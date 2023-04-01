import { defineConfig } from "@playwright/test";

export default defineConfig({
  projects: [
    {
      name: "chromium",
      use: {
        trace: "on",
        browserName: "chromium",
        // https://github.com/microsoft/playwright/issues/1086#issuecomment-592227413
        viewport: null, // adopt to browser window size specified below
        launchOptions: {
          args: ["--window-size=600,800"],
        },
      },
    },
  ],
});
