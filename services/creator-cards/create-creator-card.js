const validator = require('@app-core/validator');
const { throwAppError, ERROR_CODE } = require('@app-core/errors');
const { CreatorCardMessages } = require('@app/messages');
const CreatorCard = require('@app/repository/creator-card');
const CreatorCardErrorCodes = require('./error-codes');
const serializeCard = require('./serialize-card');
const slugify = require('./utils/slugify');
const generateRandomString = require('./utils/generate-random-string');

const SLUG_MAX_LENGTH = 50;
const SLUG_SUFFIX_LENGTH = 6;
const SLUG_CHARSET = /^[A-Za-z0-9_-]+$/;
const ALPHANUMERIC = /^[A-Za-z0-9]+$/;

// Field shape, lengths and enums are enforced here by the validator (HTTP 400 on
// failure). Slug uniqueness, conditional access_code rules and per-element checks
// the DSL cannot express are handled below as business logic.
const spec = `root {
  title string<trim|lengthBetween:3,100>
  description? string<trim|maxLength:500>
  slug? string<trim|lengthBetween:5,50>
  creator_reference string<trim|length:20>
  links[]? {
    title string<trim|lengthBetween:1,100>
    url string<trim|maxLength:200>
  }
  service_rates? {
    currency string(NGN|USD|GBP|GHS)
    rates[] {
      name string<trim|lengthBetween:3,100>
      description? string<trim|maxLength:250>
      amount number<min:1>
    }
  }
  status string(draft|published)
  access_type? string(public|private)
  access_code? string<trim|length:6>
}`;

const parsedSpec = validator.parse(spec);

/**
 * Resolves a unique slug for a card whose client did not supply one.
 * Appends a random alphanumeric suffix when the base is too short or taken.
 *
 * @param {String} title
 * @returns {Promise<String>}
 */
async function generateUniqueSlug(title) {
  let base = slugify(title);

  if (base.length > SLUG_MAX_LENGTH) {
    base = base.slice(0, SLUG_MAX_LENGTH);
  }

  const buildSuffixed = () => {
    const trimmed = base.slice(0, SLUG_MAX_LENGTH - SLUG_SUFFIX_LENGTH - 1);
    return `${trimmed}-${generateRandomString(SLUG_SUFFIX_LENGTH)}`;
  };

  let candidate = base.length < 5 ? buildSuffixed() : base;
  let existing = await CreatorCard.findOne({ query: { slug: candidate } });

  while (existing) {
    candidate = buildSuffixed();
    // eslint-disable-next-line no-await-in-loop
    existing = await CreatorCard.findOne({ query: { slug: candidate } });
  }

  return candidate;
}

/**
 * Creates a Creator Card after validating the payload and applying the
 * business rules around access codes and slug uniqueness.
 *
 * @param {Object} serviceData
 * @param {Object} [options]
 * @returns {Promise<Object>} the serialized created card
 */
async function createCreatorCard(serviceData, options = {}) {
  const data = validator.validate(serviceData, parsedSpec);

  const accessType = data.access_type || 'public';

  // access_code is conditional on access_type
  if (accessType === 'private') {
    if (!data.access_code) {
      throwAppError(
        CreatorCardMessages.ACCESS_CODE_REQUIRED,
        CreatorCardErrorCodes.ACCESS_CODE_REQUIRED
      );
    }

    if (!ALPHANUMERIC.test(data.access_code)) {
      throwAppError(CreatorCardMessages.INVALID_ACCESS_CODE_FORMAT, ERROR_CODE.VALIDATIONERR);
    }
  } else if (data.access_code !== undefined && data.access_code !== null) {
    throwAppError(
      CreatorCardMessages.ACCESS_CODE_ON_PUBLIC,
      CreatorCardErrorCodes.ACCESS_CODE_ON_PUBLIC
    );
  }

  // Per-element link url check (the DSL cannot express the http/https alternation)
  if (Array.isArray(data.links)) {
    data.links.forEach((link) => {
      if (!link.url.startsWith('http://') && !link.url.startsWith('https://')) {
        throwAppError(CreatorCardMessages.INVALID_LINK_URL, ERROR_CODE.VALIDATIONERR);
      }
    });
  }

  // service_rates must be a non-empty array of positive-integer amounts
  if (data.service_rates) {
    const { rates } = data.service_rates;

    if (!Array.isArray(rates) || rates.length === 0) {
      throwAppError(CreatorCardMessages.EMPTY_SERVICE_RATES, ERROR_CODE.VALIDATIONERR);
    }

    rates.forEach((rate) => {
      if (!Number.isInteger(rate.amount)) {
        throwAppError(CreatorCardMessages.INVALID_RATE_AMOUNT, ERROR_CODE.VALIDATIONERR);
      }
    });
  }

  // Slug: honour a client-provided slug (never silently modified), otherwise generate
  let slug;
  if (data.slug) {
    if (!SLUG_CHARSET.test(data.slug)) {
      throwAppError(CreatorCardMessages.INVALID_SLUG_FORMAT, ERROR_CODE.VALIDATIONERR);
    }

    const existing = await CreatorCard.findOne({ query: { slug: data.slug } });
    if (existing) {
      throwAppError(CreatorCardMessages.SLUG_TAKEN, CreatorCardErrorCodes.SLUG_TAKEN);
    }

    slug = data.slug;
  } else {
    slug = await generateUniqueSlug(data.title);
  }

  const cardData = {
    title: data.title,
    description: data.description,
    slug,
    creator_reference: data.creator_reference,
    links: data.links,
    service_rates: data.service_rates,
    status: data.status,
    access_type: accessType,
    access_code: accessType === 'private' ? data.access_code : null,
  };

  const createdCard = await CreatorCard.create(cardData);
  const response = serializeCard(createdCard, { includeAccessCode: true });

  return response;
}

module.exports = createCreatorCard;
