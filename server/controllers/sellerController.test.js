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
