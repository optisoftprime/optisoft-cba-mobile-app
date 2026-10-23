/**
 * Guards the swap file: every token must exist in BOTH palettes and be a hex
 * value, otherwise a Tailwind class silently resolves to nothing in one theme.
 * Run by `npm run check:theme`.
 */
const { light, dark, shadows, hexToRgbChannels } = require('../config/brand');

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const problems = [];

const lightKeys = Object.keys(light);
const darkKeys = Object.keys(dark);

for (const key of lightKeys) {
  if (!darkKeys.includes(key)) problems.push(`"${key}" is in light but missing from dark`);
}
for (const key of darkKeys) {
  if (!lightKeys.includes(key)) problems.push(`"${key}" is in dark but missing from light`);
}

for (const [name, palette] of [
  ['light', light],
  ['dark', dark],
]) {
  for (const [key, value] of Object.entries(palette)) {
    if (!HEX.test(value)) {
      problems.push(`${name}.${key} = "${value}" is not a hex colour`);
      continue;
    }
    hexToRgbChannels(value); // throws on anything the runtime can't convert
  }
}

// Shadow levels must exist in both themes too, or style={shadows.md} is
// undefined in one of them.
const lightLevels = Object.keys(shadows.light);
const darkLevels = Object.keys(shadows.dark);
for (const level of lightLevels) {
  if (!darkLevels.includes(level)) problems.push(`shadow level "${level}" is missing from dark`);
}
for (const level of darkLevels) {
  if (!lightLevels.includes(level)) problems.push(`shadow level "${level}" is missing from light`);
}

if (problems.length) {
  console.error('Theme check failed:\n' + problems.map((p) => `  • ${p}`).join('\n'));
  process.exit(1);
}

console.log(
  `Theme OK — ${lightKeys.length} tokens + ${lightLevels.length} shadow levels, light + dark in sync.`
);
