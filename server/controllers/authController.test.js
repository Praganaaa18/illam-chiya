const assert = require('node:assert/strict');
const test = require('node:test');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const authController = require('./authController');

const createResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

const withQueryStub = async (queryStub, run) => {
  const originalQuery = db.query;
  db.query = queryStub;
  try {
    await run();
  } finally {
    db.query = originalQuery;
  }
};

test('rejects invalid registration email before querying the database', async () => {
  const originalQuery = db.query;
  db.query = async () => {
    throw new Error('Database should not be queried for invalid input.');
  };
  const response = createResponse();

  try {
    await authController.register({
      body: {
        full_name: 'Tea Seller',
        email: 'not-an-email',
        phone: '9801234567',
        password: 'validpass',
        role: 'buyer',
      },
    }, response);
  } finally {
    db.query = originalQuery;
  }

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.message, 'Enter a valid email address.');
});

test('rejects seller registrations with an invalid PAN before querying the database', async () => {
  const originalQuery = db.query;
  db.query = async () => {
    throw new Error('Database should not be queried for invalid input.');
  };
  const response = createResponse();

  try {
    await authController.register({
      body: {
        full_name: 'Tea Seller',
        email: 'seller@example.com',
        phone: '9801234567',
        pan_vat: '12345',
        password: 'validpass',
        role: 'seller',
      },
    }, response);
  } finally {
    db.query = originalQuery;
  }

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.message, 'Enter a valid 9-digit PAN / VAT number.');
});

test('rejects malformed login emails before querying the database', async () => {
  const originalQuery = db.query;
  db.query = async () => {
    throw new Error('Database should not be queried for invalid input.');
  };
  const response = createResponse();

  try {
    await authController.login({ body: { email: 'bad', password: 'validpass' } }, response);
  } finally {
    db.query = originalQuery;
  }

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.message, 'Enter a valid email address.');
});

test('rejects login when no buyer or seller portal is selected', async () => {
  const originalQuery = db.query;
  db.query = async () => {
    throw new Error('Database should not be queried without a valid portal.');
  };
  const response = createResponse();

  try {
    await authController.login({
      body: { email: 'buyer@example.com', password: 'validpass' },
    }, response);
  } finally {
    db.query = originalQuery;
  }

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.message, 'Choose a valid buyer or seller portal.');
});

test('stores a bcrypt hash instead of the submitted registration password', async () => {
  let insertedValues;
  const response = createResponse();

  await withQueryStub(async (query, values) => {
    if (query.startsWith('SELECT')) return [[], []];
    if (query.startsWith('INSERT')) insertedValues = values;
    return [{ affectedRows: 1 }, []];
  }, async () => {
    await authController.register({
      body: {
        full_name: 'Tea Buyer',
        email: 'buyer@example.com',
        phone: '9801234567',
        password: 'validpass',
        role: 'buyer',
      },
    }, response);
  });

  assert.equal(response.statusCode, 201);
  assert.ok(insertedValues);
  assert.notEqual(insertedValues[7], 'validpass');
  assert.equal(await bcrypt.compare('validpass', insertedValues[7]), true);
});

test('authenticates users with bcrypt password hashes', async () => {
  const passwordHash = await bcrypt.hash('validpass', 4);
  let queryCount = 0;
  const response = createResponse();

  await withQueryStub(async () => {
    queryCount += 1;
    return [[{
      id: 8,
      full_name: 'Tea Buyer',
      email: 'buyer@example.com',
      password: passwordHash,
      role: 'buyer',
    }], []];
  }, async () => {
    await authController.login({
      body: { email: 'buyer@example.com', password: 'validpass', role: 'buyer' },
    }, response);
  });

  assert.equal(response.statusCode, 200);
  assert.ok(response.body.token);
  assert.equal(response.body.user.id, 8);
  assert.equal(queryCount, 1);
});

for (const { accountRole, requestedRole } of [
  { accountRole: 'seller', requestedRole: 'buyer' },
  { accountRole: 'buyer', requestedRole: 'seller' },
]) {
  test(`rejects ${accountRole} credentials in the ${requestedRole} portal`, async () => {
    const response = createResponse();

    await withQueryStub(async () => [[{
      id: 12,
      full_name: 'Tea Account',
      email: 'account@example.com',
      password: 'validpass',
      role: accountRole,
    }], []], async () => {
      await authController.login({
        body: { email: 'account@example.com', password: 'validpass', role: requestedRole },
      }, response);
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.body.message, 'This account cannot access the selected portal.');
    assert.equal(response.body.token, undefined);
  });
}

test('upgrades a valid legacy plaintext password after login', async () => {
  let upgradedValues;
  const response = createResponse();

  await withQueryStub(async (query, values) => {
    if (query.startsWith('SELECT')) {
      return [[{
        id: 9,
        full_name: 'Legacy Buyer',
        email: 'legacy@example.com',
        password: 'validpass',
        role: 'buyer',
      }], []];
    }
    if (query.startsWith('UPDATE')) upgradedValues = values;
    return [{ affectedRows: 1 }, []];
  }, async () => {
    await authController.login({
      body: { email: 'legacy@example.com', password: 'validpass', role: 'buyer' },
    }, response);
  });

  assert.equal(response.statusCode, 200);
  assert.ok(upgradedValues);
  assert.equal(upgradedValues[1], 9);
  assert.equal(await bcrypt.compare('validpass', upgradedValues[0]), true);
});
