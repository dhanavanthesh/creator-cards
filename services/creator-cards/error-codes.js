/**
 * Custom business-rule error codes for the Creator Card domain.
 * These are surfaced as the top-level `code` field in error responses and
 * mapped to their HTTP statuses in core/errors/constants.js.
 * @readonly
 * @enum {String}
 */
const CreatorCardErrorCodes = {
  SLUG_TAKEN: 'SL02', // 400
  ACCESS_CODE_REQUIRED: 'AC01', // 400
  ACCESS_CODE_ON_PUBLIC: 'AC05', // 400
  NOT_FOUND: 'NF01', // 404
  DRAFT_NOT_FOUND: 'NF02', // 404
  PRIVATE_ACCESS_REQUIRED: 'AC03', // 403
  INVALID_ACCESS_CODE: 'AC04', // 403
};

module.exports = CreatorCardErrorCodes;
