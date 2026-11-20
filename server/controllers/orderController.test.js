const assert = require('node:assert/strict');
const test = require('node:test');
const db = require('../config/db');
const orderController = require('./orderController');

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

test('rejects shipment tracking values that are not valid Nepal phone numbers', async () => {
  const originalGetConnection = db.getConnection;
  db.getConnection = async () => {
    throw new Error('Database should not be queried for invalid tracking input.');
  };
  const response = createResponse();

  try {
    await orderController.updateOrderStatus({
      params: { id: '22' },
      user: { id: 5, role: 'seller' },
      body: {
        status: 'processing',
        carrier_name: 'Ilam Express',
        tracking_number: '1Z-ABC-123',
      },
    }, response);
  } finally {
    db.getConnection = originalGetConnection;
  }

  assert.equal(response.statusCode, 400);
  assert.equal(
    response.body.message,
    'Enter a valid Nepal mobile number for the tracking number (10 digits).'
  );
});
