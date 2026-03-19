import { describe, expect, it } from "vitest";
import {
  calculateDistanceKm,
  calculateScore,
  getAccuracyLabel
} from "../src/utils/geo.js";

describe("geo utilities", () => {
  it("returns zero distance for the same point", () => {
    // Arrange
    const latitude = 48.85837;
    const longitude = 2.294481;

    // Act
    const distanceKm = calculateDistanceKm(latitude, longitude, latitude, longitude);

    // Assert
    expect(distanceKm).toBe(0);
  });

  it("rewards closer answers with more points", () => {
    // Arrange
    const responseTimeMs = 3000;

    // Act
    const exactScore = calculateScore(0, responseTimeMs);
    const farScore = calculateScore(3000, responseTimeMs);

    // Assert
    expect(exactScore).toBeGreaterThan(farScore);
  });

  it("maps distance thresholds to readable accuracy labels", () => {
    // Arrange
    const thresholds = [
      { distanceKm: 10, label: "Легендарная точность" },
      { distanceKm: 70, label: "Почти идеально" },
      { distanceKm: 200, label: "Очень близко" },
      { distanceKm: 900, label: "Хорошая попытка" },
      { distanceKm: 2000, label: "Есть куда расти" },
      { distanceKm: 5000, label: "Сегодня карта сильнее" }
    ];

    // Act + Assert
    for (const threshold of thresholds) {
      expect(getAccuracyLabel(threshold.distanceKm)).toBe(threshold.label);
    }
  });
});
