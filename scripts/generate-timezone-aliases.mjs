import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { cityMapping } = require("city-timezones");
const manualOverrides = require("../src/data/timezone-overrides.json");

const outputPath = path.resolve("src/data/generated-timezone-aliases.ts");

function normalizeAlias(value) {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function addAlias(set, value) {
  const normalized = normalizeAlias(value);
  if (normalized) set.add(normalized);
}

function buildAliasMap() {
  const grouped = new Map();

  for (const entry of cityMapping) {
    if (!entry.timezone) continue;

    if (!grouped.has(entry.timezone)) {
      grouped.set(entry.timezone, {
        cities: [],
        countries: new Set(),
        provinces: new Set(),
      });
    }

    const bucket = grouped.get(entry.timezone);
    bucket.cities.push(entry);
    addAlias(bucket.countries, entry.country);
    addAlias(bucket.provinces, entry.province);
  }

  const result = {};

  for (const [timezone, aliases] of Object.entries(manualOverrides)) {
    result[timezone] = (result[timezone] ?? []).concat(aliases.map(normalizeAlias));
  }

  for (const [timezone, bucket] of grouped.entries()) {
    const aliases = new Set();

    const sortedCities = bucket.cities
      .slice()
      .sort((a, b) => (b.pop ?? 0) - (a.pop ?? 0) || a.city.localeCompare(b.city));

    for (const city of sortedCities.slice(0, 30)) {
      addAlias(aliases, city.city);
      addAlias(aliases, city.city_ascii);
    }

    for (const country of bucket.countries) aliases.add(country);
    for (const province of bucket.provinces) aliases.add(province);

    result[timezone] = Array.from(new Set([...(result[timezone] ?? []), ...aliases]))
      .sort((a, b) => a.localeCompare(b));
  }

  return result;
}

const aliasMap = buildAliasMap();
const content = `export const GENERATED_TIMEZONE_ALIASES: Record<string, string[]> = ${JSON.stringify(aliasMap, null, 2)} as const;\n`;

fs.writeFileSync(outputPath, content);
console.log(`Wrote ${outputPath}`);
