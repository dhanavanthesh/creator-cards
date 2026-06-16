/**
 * Maps a stored Creator Card document to its public API representation.
 *
 * Responsibilities:
 * - exposes the MongoDB `_id` as `id` (a response containing `_id` is incorrect)
 * - normalises the soft-delete marker: 0 (active) is serialized as `null`
 * - includes `access_code` only when explicitly requested (creation/deletion),
 *   never on public retrieval
 *
 * @param {Object} card - The raw card document.
 * @param {{includeAccessCode?: Boolean}} [options]
 * @returns {Object} the serialized card
 */
function serializeCard(card, options = {}) {
  const includeAccessCode = options.includeAccessCode || false;

  const serialized = {
    id: card._id,
    title: card.title,
    description: card.description ?? null,
    slug: card.slug,
    creator_reference: card.creator_reference,
    links: card.links ?? [],
    service_rates: card.service_rates ?? null,
    status: card.status,
    access_type: card.access_type,
  };

  if (includeAccessCode) {
    serialized.access_code = card.access_code ?? null;
  }

  serialized.created = card.created;
  serialized.updated = card.updated;
  serialized.deleted = card.deleted ? card.deleted : null;

  return serialized;
}

module.exports = serializeCard;
