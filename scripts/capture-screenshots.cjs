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
  await page.locator(".theme-card").first().waitFor({ state: "visible" });
  await page.waitForFunction(() => {
    return document.querySelectorAll(".theme-card").length >= 4;
  });
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
    await page.locator(".theme-card").nth(2).click();
    await page.locator(".hero-form .primary-button").click();

    await page.locator(".map-panel").waitFor({ state: "visible" });
    await page.locator(".question-panel").waitFor({ state: "visible" });
    await wait(3000);

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
      await page.locator(".feedback-metrics").waitFor({ state: "visible" });
      await wait(700);

      const finishedBlock = page.locator(".finished-block");

      if (await finishedBlock.isVisible().catch(() => false)) {
        break;
      }

      const nextButton = page.locator(".feedback-panel > .primary-button");

      if (await nextButton.isVisible().catch(() => false)) {
        await nextButton.click();
        await wait(800);
        continue;
      }

      break;
    }

    await page.locator(".finished-block").waitFor({ state: "visible" });
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
