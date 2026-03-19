const { mkdirSync } = require("node:fs");
const { resolve } = require("node:path");
const { chromium } = require("playwright");

const APP_URL = process.env.APP_URL ?? "http://frontend";
const OUTPUT_DIR = resolve("docs", "images");

mkdirSync(OUTPUT_DIR, { recursive: true });

function outputPath(fileName) {
  return resolve(OUTPUT_DIR, fileName);
}

function wait(milliseconds) {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, milliseconds);
  });
}

async function waitForThemes(page) {
  await page.locator("#player-name").waitFor({ state: "visible" });
  await page.locator(".selected-theme-card").waitFor({ state: "visible" });
}

async function clickMap(page) {
  const map = page.locator(".leaflet-container").first();
  await map.waitFor({ state: "visible" });

  const box = await map.boundingBox();

  if (!box) {
    throw new Error("Could not find the map bounds for screenshot capture.");
  }

  await page.mouse.click(box.x + box.width * 0.52, box.y + box.height * 0.48);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
    colorScheme: "dark"
  });
  const page = await context.newPage();

  page.setDefaultTimeout(30000);

  try {
    await page.goto(APP_URL, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});
    await waitForThemes(page);
    await wait(1500);

    await page.screenshot({
      path: outputPath("home.png"),
      fullPage: true
    });

    await page.fill("#player-name", "Explorer");
    await page.locator(".hero-form .primary-button").click();

    await page.locator(".map-panel").waitFor({ state: "visible" });
    await page.locator(".question-panel").waitFor({ state: "visible" });
    await page.locator(".map-tip-card").waitFor({ state: "visible" });
    await wait(1800);

    await page.screenshot({
      path: outputPath("game.png"),
      fullPage: true
    });

    const hintToggle = page.locator(".hint-toggle");

    if (await hintToggle.isVisible().catch(() => false)) {
      await hintToggle.click();
      await wait(500);
    }

    for (let index = 0; index < 10; index += 1) {
      await clickMap(page);
      await page
        .locator(".feedback-metrics, .result-modal")
        .first()
        .waitFor({ state: "visible" });
      await wait(700);

      const resultModal = page.locator(".result-modal");

      if (await resultModal.isVisible().catch(() => false)) {
        break;
      }

      const nextButton = page.locator(".map-feedback-tray .primary-button");

      if (await nextButton.isVisible().catch(() => false)) {
        await nextButton.click();
        await wait(800);
        continue;
      }

      break;
    }

    await page.locator(".result-modal").waitFor({ state: "visible" });
    await page.locator(".passport-card").waitFor({ state: "visible" });
    await wait(1200);

    await page.screenshot({
      path: outputPath("result.png"),
      fullPage: true
    });
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
