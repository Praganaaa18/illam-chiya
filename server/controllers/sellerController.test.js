const assert = require('node:assert/strict');
const test = require('node:test');
const db = require('../config/db');
const sellerController = require('./sellerController');

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

test('returns the seller phone number for the authenticated seller profile', async () => {
  const originalExecute = db.execute;
  let query = '';
  db.execute = async (sql) => {
    query = sql;
    return [[{
      id: 17,
      full_name: 'Tea Seller',
      email: 'seller@example.com',
      phone: '9801234567',
      business_name: 'Ilam Tea',
      status: 'approved',
    }]];
  };
  const response = createResponse();

  try {
    await sellerController.getSellerInfo({
      params: { sellerId: '17' },
      user: { id: 17, role: 'seller' },
    }, response);
  } finally {
    db.execute = originalExecute;
  }

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.phone, '9801234567');
  assert.match(query, /phone/);
});

test('lists default and seller-specific drivers for the authenticated seller', async () => {
  const originalExecute = db.execute;
  let queryValues;
  db.execute = async (query, values) => {
    assert.match(query, /FROM seller_drivers/);
    queryValues = values;
    return [[{ id: 12, driver_name: 'Custom Driver' }]];
  };
  const response = createResponse();

  try {
    await sellerController.getSellerDrivers({ user: { id: 5, role: 'seller' } }, response);
  } finally {
    db.execute = originalExecute;
  }

  assert.deepEqual(queryValues, [5]);
  assert.deepEqual(response.body.drivers, [
    'Ram Shah',
    'Ram Shahi',
    'Raja Bahadur',
    'Custom Driver',
  ]);
});

test('saves a seller-specific driver name', async () => {
  const originalExecute = db.execute;
  let queryValues;
  db.execute = async (query, values) => {
    assert.match(query, /INSERT INTO seller_drivers/);
    queryValues = values;
    return [{ insertId: 18 }];
  };
  const response = createResponse();

  try {
    await sellerController.addSellerDriver({
      user: { id: 5, role: 'seller' },
      body: { name: '  Custom Driver  ' },
    }, response);
  } finally {
    db.execute = originalExecute;
  }

  assert.equal(response.statusCode, 201);
  assert.deepEqual(queryValues, [5, 'Custom Driver']);
  assert.deepEqual(response.body.driver, { id: 18, name: 'Custom Driver' });
});

test('rejects invalid driver names before writing to the database', async () => {
  const originalExecute = db.execute;
  db.execute = async () => {
    throw new Error('Database should not be queried for an invalid driver name.');
  };
  const response = createResponse();

  try {
    await sellerController.addSellerDriver({
      user: { id: 5, role: 'seller' },
      body: { name: 'Driver #1' },
    }, response);
  } finally {
    db.execute = originalExecute;
  }

  assert.equal(response.statusCode, 400);
  assert.equal(
    response.body.error,
    'Driver name may contain letters, spaces, periods, apostrophes, or hyphens only.'
  );
});