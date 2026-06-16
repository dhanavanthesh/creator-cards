const validator = require('@app-core/validator');
const { throwAppError } = require('@app-core/errors');
const { CreatorCardMessages } = require('@app/messages');
const CreatorCard = require('@app/repository/creator-card');
const CreatorCardErrorCodes = require('./error-codes');
const serializeCard = require('./serialize-card');

const spec = `root {
  slug string<trim|minLength:1>
  access_code? string<trim>
}`;

const parsedSpec = validator.parse(spec);

/**
 * Publicly retrieves a Creator Card by slug, applying the access rules in order:
 * not-found (NF01) -> draft (NF02) -> private needs code (AC03) -> wrong code (AC04).
 * Soft-deleted cards are invisible to findOne, so they surface as NF01.
 *
 * @param {Object} serviceData
 * @param {Object} [options]
 * @returns {Promise<Object>} the serialized card (without access_code)
 */
async function getCreatorCard(serviceData, options = {}) {
  const data = validator.validate(serviceData, parsedSpec);

  const card = await CreatorCard.findOne({ query: { slug: data.slug } });

  if (!card) {
    throwAppError(CreatorCardMessages.CARD_NOT_FOUND, CreatorCardErrorCodes.NOT_FOUND);
  }

  if (card.status === 'draft') {
    throwAppError(CreatorCardMessages.CARD_NOT_FOUND, CreatorCardErrorCodes.DRAFT_NOT_FOUND);
  }

  if (card.access_type === 'private') {
    if (!data.access_code) {
      throwAppError(
        CreatorCardMessages.PRIVATE_ACCESS_REQUIRED,
        CreatorCardErrorCodes.PRIVATE_ACCESS_REQUIRED
      );
    }

    if (data.access_code !== card.access_code) {
      throwAppError(
        CreatorCardMessages.INVALID_ACCESS_CODE,
        CreatorCardErrorCodes.INVALID_ACCESS_CODE
      );
    }
  }

  const response = serializeCard(card, { includeAccessCode: false });

  return response;
}

module.exports = getCreatorCard;
