const EARTH_RADIUS_KM = 6371;

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export function calculateScore(
  distanceKm: number,
  responseTimeMs: number | null
): number {
  // The scoring curve rewards precision first and then adds a small
  // speed bonus, so the game still feels educational instead of twitchy.
  const distanceScore = Math.round(900 * Math.exp(-distanceKm / 2200));
  const speedBonus =
    responseTimeMs === null
      ? 0
      : Math.max(0, 120 - Math.floor(responseTimeMs / 1000) * 4);
  const precisionBonus =
    distanceKm <= 15 ? 120 : distanceKm <= 80 ? 80 : distanceKm <= 250 ? 40 : 0;

  return Math.max(0, Math.min(1000, distanceScore + speedBonus + precisionBonus));
}

export function getAccuracyLabel(distanceKm: number): string {
  if (distanceKm <= 15) {
    return "Легендарная точность";
  }

  if (distanceKm <= 80) {
    return "Почти идеально";
  }

  if (distanceKm <= 250) {
    return "Очень близко";
  }

  if (distanceKm <= 1000) {
    return "Хорошая попытка";
  }

  if (distanceKm <= 2500) {
    return "Есть куда расти";
  }

  return "Сегодня карта сильнее";
}
