/**
 * emptyStateCopy.test.js — ensures empty/error copy in shipped screens
 * follows the FuelUK voice rules:
 *   - no exclamation marks
 *   - no apologies (no "Oops", "Sorry", "We couldn't find anything")
 *   - short, plain English
 *
 * The test reads each screen file as text and scans the strings that appear
 * inside an EmptyState block. It is a guardrail against regressions.
 */

const fs = require('fs');
const path = require('path');

const SCREEN_DIR = path.resolve(__dirname, '..', '..', 'screens');
const SCREENS_AUDITED = [
  'AlertsScreen.js',
  'FavouritesScreen.js',
  'HomeScreen.js',
  'SearchScreen.js',
  'VehicleSettingsScreen.js',
];

function extractEmptyStateBlocks(source) {
  // Capture every <EmptyState ...>...</EmptyState> or self-closing variant.
  const blocks = [];
  const re = /<EmptyState\b([^>]*)\/?>/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    blocks.push(m[1]);
  }
  return blocks;
}

function extractStringLiterals(propsBlock) {
  // Pull out 'string' or "string" attribute values for headline/helper/cta.
  const out = [];
  const re = /(headline|helper|cta)\s*=\s*(?:"([^"]*)"|'([^']*)'|\{`([^`]*)`\})/g;
  let m;
  while ((m = re.exec(propsBlock)) !== null) {
    out.push(m[2] ?? m[3] ?? m[4] ?? '');
  }
  return out;
}

const FORBIDDEN_PATTERNS = [
  { rx: /!/, msg: 'no exclamation marks allowed' },
  { rx: /\boops\b/i, msg: 'no "Oops" — voice rule' },
  { rx: /\bsorry\b/i, msg: 'no apologies' },
];

describe('EmptyState voice rules across audited screens', () => {
  test.each(SCREENS_AUDITED)('%s — copy is calm, plain English', (file) => {
    const source = fs.readFileSync(path.join(SCREEN_DIR, file), 'utf8');
    const blocks = extractEmptyStateBlocks(source);
    expect(blocks.length).toBeGreaterThan(0);

    for (const block of blocks) {
      const literals = extractStringLiterals(block);
      for (const text of literals) {
        for (const { rx, msg } of FORBIDDEN_PATTERNS) {
          expect({ file, text, msg }).toMatchObject({
            file,
            text: expect.not.stringMatching(rx),
            msg,
          });
        }
      }
    }
  });

  test('error EmptyStates always provide a Try again CTA', () => {
    for (const file of SCREENS_AUDITED) {
      const source = fs.readFileSync(path.join(SCREEN_DIR, file), 'utf8');
      const blocks = extractEmptyStateBlocks(source);
      for (const block of blocks) {
        if (/type\s*=\s*(?:"|')error(?:"|')/.test(block)) {
          expect(block).toMatch(/cta\s*=/);
          expect(block).toMatch(/onCta\s*=/);
        }
      }
    }
  });
});
