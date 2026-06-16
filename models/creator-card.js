const { ModelSchema, SchemaTypes, DatabaseModel } = require('@app-core/mongoose');

const modelName = 'creatorCards';

/**
 * @typedef {Object} ModelSchema
 * @property {String} _id
 * @property {String} title
 * @property {String} description
 * @property {String} slug
 * @property {String} creator_reference
 * @property {Object[]} links
 * @property {Object} service_rates
 * @property {String} status
 * @property {String} access_type
 * @property {String} access_code
 * @property {Number} created
 * @property {Number} updated
 * @property {Number} deleted
 */

// Only database-level concerns live here. Field shape, lengths, enums and
// required-ness are enforced by the VSL validator inside the services.
const schemaConfig = {
  _id: { type: SchemaTypes.ULID, required: true },
  title: { type: SchemaTypes.String },
  description: { type: SchemaTypes.String },
  slug: { type: SchemaTypes.String, unique: true, index: true },
  creator_reference: { type: SchemaTypes.String, index: true },
  links: { type: SchemaTypes.Mixed },
  service_rates: { type: SchemaTypes.Mixed },
  status: { type: SchemaTypes.String, index: true },
  access_type: { type: SchemaTypes.String },
  access_code: { type: SchemaTypes.String },
  created: { type: SchemaTypes.Number },
  updated: { type: SchemaTypes.Number },
};

const modelSchema = new ModelSchema(schemaConfig, { collection: modelName });

// paranoid enables soft-deletion: a `deleted` timestamp is added, findOne/updateOne
// transparently skip soft-deleted records, and the unique slug is freed on delete.
/** @type {ModelSchema} */
module.exports = DatabaseModel.model(modelName, modelSchema, { paranoid: true });
