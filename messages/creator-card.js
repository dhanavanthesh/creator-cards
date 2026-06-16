module.exports = {
  // Success messages
  CREATE_SUCCESS: 'Creator Card Created Successfully.',
  RETRIEVE_SUCCESS: 'Creator Card Retrieved Successfully.',
  DELETE_SUCCESS: 'Creator Card Deleted Successfully.',

  // Business rule errors (carry custom codes)
  SLUG_TAKEN: 'Slug is already taken',
  ACCESS_CODE_REQUIRED: 'access_code is required when access_type is private',
  ACCESS_CODE_ON_PUBLIC: 'access_code can only be set on private cards',
  CARD_NOT_FOUND: 'Creator card not found',
  PRIVATE_ACCESS_REQUIRED: 'This card is private. An access code is required',
  INVALID_ACCESS_CODE: 'Invalid access code',

  // Field-level errors the validator cannot express (return HTTP 400)
  INVALID_ACCESS_CODE_FORMAT: 'access_code must be exactly 6 alphanumeric characters',
  INVALID_SLUG_FORMAT: 'slug may only contain letters, numbers, hyphens and underscores',
  INVALID_LINK_URL: 'Each link url must start with http:// or https://',
  EMPTY_SERVICE_RATES: 'service_rates.rates must be a non-empty array',
  INVALID_RATE_AMOUNT: 'Each rate amount must be a positive integer',
};
