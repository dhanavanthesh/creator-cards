/**
 * Builds a base slug from a title following the assessment rules:
 * 1. lowercase the title
 * 2. replace whitespace runs with a single hyphen
 * 3. strip any character that is not a letter, number, hyphen or underscore
 *
 * @param {String} title
 * @returns {String} the normalised base slug
 */
function slugify(title) {
  return String(title)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '');
}

module.exports = slugify;
