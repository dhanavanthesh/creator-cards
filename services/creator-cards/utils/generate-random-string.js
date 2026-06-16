const crypto = require('crypto');

const ALPHANUMERIC = 'abcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Generates a cryptographically random lowercase alphanumeric string,
 * used as the suffix for auto-generated slugs (e.g. "cook-a8x2k1").
 *
 * @param {Number} [length=6]
 * @returns {String}
 */
function generateRandomString(length = 6) {
  const bytes = crypto.randomBytes(length);
  let result = '';

  for (let i = 0; i < length; i++) {
    result += ALPHANUMERIC[bytes[i] % ALPHANUMERIC.length];
  }

  return result;
}

module.exports = generateRandomString;
