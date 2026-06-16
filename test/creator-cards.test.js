/* eslint-disable no-unused-expressions */
const { expect } = require('chai');

const createCreatorCard = require('@app/services/creator-cards/create-creator-card');
const getCreatorCard = require('@app/services/creator-cards/get-creator-card');
const deleteCreatorCard = require('@app/services/creator-cards/delete-creator-card');
const serializeCard = require('@app/services/creator-cards/serialize-card');
const slugify = require('@app/services/creator-cards/utils/slugify');
const generateRandomString = require('@app/services/creator-cards/utils/generate-random-string');
const { MockModelStubs } = require('@app/mock-models');

const Stubs = MockModelStubs.CreatorCard;
const REF = 'crt_8f2k1m9x4p7w3q5z'; // exactly 20 characters

// Reverts are collected per test so the shared stub defaults are restored cleanly.
let reverts = [];
function configure(config) {
  const { revert } = Stubs.configureStubs(config);
  reverts.push(revert);
}
afterEach(() => {
  reverts.forEach((revert) => revert());
  reverts = [];
});

async function expectAppError(fn, code) {
  let thrown;
  try {
    await fn();
  } catch (error) {
    thrown = error;
  }
  expect(thrown, 'expected an error to be thrown').to.exist;
  expect(thrown.isApplicationError, 'expected an application error').to.equal(true);
  expect(thrown.errorCode).to.equal(code);
}

// Field-level validation may be raised by either the framework validator or a
// service-level guard; both must surface as an application error (HTTP 400).
async function expectValidation(fn) {
  let thrown;
  try {
    await fn();
  } catch (error) {
    thrown = error;
  }
  expect(thrown, 'expected a validation error to be thrown').to.exist;
  expect(thrown.isApplicationError, 'expected an application error').to.equal(true);
}

describe('slugify', () => {
  it('lowercases and hyphenates whitespace', () => {
    expect(slugify('George Cooks')).to.equal('george-cooks');
  });

  it('collapses multiple spaces into a single hyphen', () => {
    expect(slugify('  Ada   Designs  Things ')).to.equal('ada-designs-things');
  });

  it('strips characters outside [a-z0-9_-]', () => {
    expect(slugify('Hi!')).to.equal('hi');
    expect(slugify('Café München')).to.match(/^[a-z0-9_-]*$/);
  });
});

describe('generateRandomString', () => {
  it('returns a lowercase alphanumeric string of the requested length', () => {
    const value = generateRandomString(6);
    expect(value).to.have.lengthOf(6);
    expect(value).to.match(/^[a-z0-9]{6}$/);
  });
});

describe('serializeCard', () => {
  const card = {
    _id: '01JG8XYZA2B3C4D5E6F7G8H9J0',
    title: 'George Cooks',
    slug: 'george-cooks',
    creator_reference: REF,
    status: 'published',
    access_type: 'public',
    access_code: 'A1B2C3',
    created: 1,
    updated: 2,
    deleted: 0,
  };

  it('exposes _id as id and never leaks _id', () => {
    const result = serializeCard(card, { includeAccessCode: true });
    expect(result.id).to.equal(card._id);
    expect(result).to.not.have.property('_id');
  });

  it('omits access_code unless explicitly requested', () => {
    expect(serializeCard(card, { includeAccessCode: false })).to.not.have.property('access_code');
    expect(serializeCard(card, { includeAccessCode: true }).access_code).to.equal('A1B2C3');
  });

  it('normalises the deleted marker (0 -> null, timestamp preserved)', () => {
    expect(serializeCard(card).deleted).to.equal(null);
    expect(serializeCard({ ...card, deleted: 1767139200000 }).deleted).to.equal(1767139200000);
  });

  it('defaults optional fields (description -> null, links -> [], rates -> null)', () => {
    const result = serializeCard(card);
    expect(result.description).to.equal(null);
    expect(result.links).to.deep.equal([]);
    expect(result.service_rates).to.equal(null);
  });
});

describe('createCreatorCard', () => {
  it('creates a public card and returns id, null access_code and null deleted', async () => {
    configure({ method: 'findOne', mockNull: true }); // slug is available
    const result = await createCreatorCard({
      title: 'George Cooks',
      slug: 'george-cooks',
      creator_reference: REF,
      status: 'published',
    });
    expect(result.id).to.be.a('string');
    expect(result).to.not.have.property('_id');
    expect(result.slug).to.equal('george-cooks');
    expect(result.access_type).to.equal('public');
    expect(result.access_code).to.equal(null);
    expect(result.deleted).to.equal(null);
  });

  it('auto-generates a slug from the title when none is provided', async () => {
    configure({ method: 'findOne', mockNull: true });
    const result = await createCreatorCard({
      title: 'George Cooks',
      creator_reference: REF,
      status: 'published',
    });
    expect(result.slug).to.equal('george-cooks');
  });

  it('rejects a duplicate slug with SL02', async () => {
    // default findOne returns a record => slug already taken
    await expectAppError(
      () =>
        createCreatorCard({
          title: 'Another George',
          slug: 'george-cooks',
          creator_reference: REF,
          status: 'published',
        }),
      'SL02'
    );
  });

  it('requires an access_code on private cards (AC01)', async () => {
    await expectAppError(
      () =>
        createCreatorCard({
          title: 'Secret Card',
          creator_reference: REF,
          status: 'published',
          access_type: 'private',
        }),
      'AC01'
    );
  });

  it('rejects an access_code on public cards (AC05)', async () => {
    await expectAppError(
      () =>
        createCreatorCard({
          title: 'Public Card',
          creator_reference: REF,
          status: 'published',
          access_type: 'public',
          access_code: 'A1B2C3',
        }),
      'AC05'
    );
  });

  it('rejects a non-integer rate amount with HTTP 400 validation', async () => {
    configure({ method: 'findOne', mockNull: true });
    await expectAppError(
      () =>
        createCreatorCard({
          title: 'Decimal Rate',
          creator_reference: REF,
          status: 'published',
          service_rates: { currency: 'USD', rates: [{ name: 'Service A', amount: 100.5 }] },
        }),
      'VALIDATION_ERROR'
    );
  });
});

describe('getCreatorCard', () => {
  it('returns NF01 when the card does not exist', async () => {
    configure({ method: 'findOne', mockNull: true });
    await expectAppError(() => getCreatorCard({ slug: 'missing' }), 'NF01');
  });

  it('returns NF02 when the card is a draft', async () => {
    configure({ method: 'findOne', docConfig: { status: 'draft' } });
    await expectAppError(() => getCreatorCard({ slug: 'draft-card' }), 'NF02');
  });

  it('returns AC03 when a private card is accessed without a code', async () => {
    configure({
      method: 'findOne',
      docConfig: { status: 'published', access_type: 'private', access_code: 'A1B2C3' },
    });
    await expectAppError(() => getCreatorCard({ slug: 'vip' }), 'AC03');
  });

  it('returns AC04 when the supplied code is wrong', async () => {
    configure({
      method: 'findOne',
      docConfig: { status: 'published', access_type: 'private', access_code: 'A1B2C3' },
    });
    await expectAppError(() => getCreatorCard({ slug: 'vip', access_code: 'WRONG1' }), 'AC04');
  });

  it('returns a published public card without leaking access_code', async () => {
    configure({ method: 'findOne', docConfig: { status: 'published', access_type: 'public' } });
    const result = await getCreatorCard({ slug: 'george-cooks' });
    expect(result.id).to.be.a('string');
    expect(result.slug).to.equal('george-cooks');
    expect(result).to.not.have.property('access_code');
  });
});

describe('deleteCreatorCard', () => {
  it('returns NF01 when the card does not exist', async () => {
    configure({ method: 'findOne', mockNull: true });
    await expectAppError(
      () => deleteCreatorCard({ slug: 'missing', creator_reference: REF }),
      'NF01'
    );
  });

  it('returns the deleted card in creation format with a deleted timestamp', async () => {
    // default findOne returns the record to delete
    const result = await deleteCreatorCard({ slug: 'george-cooks', creator_reference: REF });
    expect(result.id).to.be.a('string');
    expect(result).to.have.property('access_code'); // creation format includes it
    expect(result.deleted).to.be.a('number').and.to.be.greaterThan(0);
  });

  it('rejects a creator_reference that is not exactly 20 characters', async () => {
    await expectValidation(() =>
      deleteCreatorCard({ slug: 'george-cooks', creator_reference: 'too-short' })
    );
  });
});

describe('createCreatorCard (additional coverage)', () => {
  it('persists links and service_rates and echoes them back', async () => {
    configure({ method: 'findOne', mockNull: true });
    const result = await createCreatorCard({
      title: 'George Cooks',
      slug: 'george-cooks',
      creator_reference: REF,
      status: 'published',
      links: [{ title: 'YouTube', url: 'https://youtube.com/@georgecooks' }],
      service_rates: {
        currency: 'NGN',
        rates: [{ name: 'IG Story Post', description: 'One mention', amount: 5000000 }],
      },
    });
    expect(result.links).to.deep.equal([
      { title: 'YouTube', url: 'https://youtube.com/@georgecooks' },
    ]);
    expect(result.service_rates.currency).to.equal('NGN');
    expect(result.service_rates.rates[0].amount).to.equal(5000000);
  });

  it('returns the access_code for a private card', async () => {
    configure({ method: 'findOne', mockNull: true });
    const result = await createCreatorCard({
      title: 'VIP Rate Card',
      slug: 'vip-rate-card',
      creator_reference: REF,
      status: 'published',
      access_type: 'private',
      access_code: 'A1B2C3',
    });
    expect(result.access_type).to.equal('private');
    expect(result.access_code).to.equal('A1B2C3');
  });

  it('appends a random suffix when the title slug would be too short', async () => {
    configure({ method: 'findOne', mockNull: true });
    const result = await createCreatorCard({
      title: 'Hi!',
      creator_reference: REF,
      status: 'published',
    });
    expect(result.slug).to.match(/^hi-[a-z0-9]{6}$/);
  });

  it('rejects an invalid slug format', async () => {
    await expectValidation(() =>
      createCreatorCard({
        title: 'Bad Slug',
        slug: 'bad slug',
        creator_reference: REF,
        status: 'published',
      })
    );
  });

  it('rejects a link url that is not http(s)', async () => {
    await expectValidation(() =>
      createCreatorCard({
        title: 'Bad Link',
        creator_reference: REF,
        status: 'published',
        links: [{ title: 'x', url: 'ftp://example.com' }],
      })
    );
  });

  it('rejects an empty service_rates.rates array', async () => {
    await expectValidation(() =>
      createCreatorCard({
        title: 'No Rates',
        creator_reference: REF,
        status: 'published',
        service_rates: { currency: 'USD', rates: [] },
      })
    );
  });

  it('rejects an unsupported currency', async () => {
    await expectValidation(() =>
      createCreatorCard({
        title: 'Bad Currency',
        creator_reference: REF,
        status: 'published',
        service_rates: { currency: 'EUR', rates: [{ name: 'Service A', amount: 100 }] },
      })
    );
  });

  it('rejects an access_code that is not 6 alphanumeric characters', async () => {
    await expectValidation(() =>
      createCreatorCard({
        title: 'Bad Code',
        creator_reference: REF,
        status: 'published',
        access_type: 'private',
        access_code: 'ABC!23',
      })
    );
  });

  it('rejects a title shorter than 3 characters', async () => {
    await expectValidation(() =>
      createCreatorCard({ title: 'Hi', creator_reference: REF, status: 'published' })
    );
  });

  it('rejects a missing creator_reference', async () => {
    await expectValidation(() => createCreatorCard({ title: 'No Reference', status: 'published' }));
  });

  it('rejects an invalid status enum value', async () => {
    await expectValidation(() =>
      createCreatorCard({ title: 'Bad Status', creator_reference: REF, status: 'archived' })
    );
  });
});

describe('getCreatorCard (additional coverage)', () => {
  it('returns a private card when the correct code is supplied, without leaking it', async () => {
    configure({
      method: 'findOne',
      docConfig: { status: 'published', access_type: 'private', access_code: 'A1B2C3' },
    });
    const result = await getCreatorCard({ slug: 'vip', access_code: 'A1B2C3' });
    expect(result.slug).to.equal('vip');
    expect(result).to.not.have.property('access_code');
  });
});
