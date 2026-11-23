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

test('rejects carrier values that are not available drivers', async () => {
  const originalGetConnection = db.getConnection;
  const connection = {
    beginTransaction: async () => {},
    execute: async (query) => {
      if (query.includes('SELECT o.id, o.buyer_id')) {
        return [[{
        id: 22,
        buyer_id: 8,
        order_status: 'processing',
        carrier_name: null,
        tracking_number: null,
        }]];
      }
      if (query.includes('FROM seller_drivers')) return [[]];
      return [{}];
    },
    rollback: async () => {},
    release: () => {},
  };
  db.getConnection = async () => connection;
  const response = createResponse();

  try {
    await orderController.updateOrderStatus({
      params: { id: '22' },
      user: { id: 5, role: 'seller' },
      body: {
        status: 'processing',
        carrier_name: 'Ilam Express',
      },
    }, response);
  } finally {
    db.getConnection = originalGetConnection;
  }

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.message, 'Select an available driver.');
});

test('generates and persists a tracking number with the selected driver', async () => {
  const originalGetConnection = db.getConnection;
  const updateCalls = [];
  const connection = {
    beginTransaction: async () => {},
    execute: async (query, values) => {
      if (query.includes('SELECT o.id, o.buyer_id')) {
        return [[{
          id: 22,
          buyer_id: 8,
          order_status: 'processing',
          carrier_name: null,
          tracking_number: null,
        }]];
      }
      if (query.includes('FROM seller_drivers')) return [[{ id: 18 }]];
      if (query.includes('UPDATE orders SET')) updateCalls.push({ query, values });
      return [{}];
    },
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
  };
  db.getConnection = async () => connection;
  const response = createResponse();

  try {
    await orderController.updateOrderStatus({
      params: { id: '22' },
      user: { id: 5, role: 'seller' },
      body: { status: 'processing', carrier_name: 'Custom Driver' },
    }, response);
  } finally {
    db.getConnection = originalGetConnection;
  }

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.carrier_name, 'Custom Driver');
  assert.equal(response.body.tracking_number, 'IC-ORD-000022');
  assert.deepEqual(updateCalls[0].values, ['Custom Driver', 'IC-ORD-000022', '22']);
});
