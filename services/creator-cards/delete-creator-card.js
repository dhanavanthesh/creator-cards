const validator = require('@app-core/validator');
const { throwAppError } = require('@app-core/errors');
const { CreatorCardMessages } = require('@app/messages');
const CreatorCard = require('@app/repository/creator-card');
const CreatorCardErrorCodes = require('./error-codes');
const serializeCard = require('./serialize-card');

const spec = `root {
  slug string<trim|minLength:1>
  creator_reference string<trim|length:20>
}`;

const parsedSpec = validator.parse(spec);

/**
 * Soft-deletes the card tied to the given slug and returns it in the creation
 * response format with its `deleted` marker set. Subsequent retrievals 404 (NF01).
 *
 * @param {Object} serviceData
 * @param {Object} [options]
 * @returns {Promise<Object>} the serialized deleted card
 */
async function deleteCreatorCard(serviceData, options = {}) {
  const data = validator.validate(serviceData, parsedSpec);

  const card = await CreatorCard.findOne({ query: { slug: data.slug } });

  if (!card) {
    throwAppError(CreatorCardMessages.CARD_NOT_FOUND, CreatorCardErrorCodes.NOT_FOUND);
  }

  await CreatorCard.deleteOne({ query: { _id: card._id } });

  const deletedCard = { ...card, deleted: Date.now() };
  const response = serializeCard(deletedCard, { includeAccessCode: true });

  return response;
}

module.exports = deleteCreatorCard;
