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

test('rejects invalid delivery preferences before creating an order', async () => {
  const originalGetConnection = db.getConnection;
  db.getConnection = async () => {
    throw new Error('Database should not be queried for an invalid delivery preference.');
  };
  const response = createResponse();

  try {
    await orderController.createOrder({
      user: { id: 8, role: 'buyer' },
      body: {
        items: [{ product_id: 3, quantity: 1 }],
        recipient_name: 'Buyer Name',
        phone: '9812345678',
        shipping_address: 'Kathmandu',
        delivery_preference: 'leave-at-gate',
      },
    }, response);
  } finally {
    db.getConnection = originalGetConnection;
  }

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.message, 'Choose a valid delivery preference.');
});

test('records cash received only after delivery and marks payment as paid', async () => {
  const originalGetConnection = db.getConnection;
  const executedQueries = [];
  const connection = {
    beginTransaction: async () => {},
    execute: async (query) => {
      executedQueries.push(query);
      if (query.includes('SELECT o.buyer_id, o.order_status')) {
        return [[{
          buyer_id: 8,
          order_status: 'delivered',
          carrier_name: 'Ilam Express',
          tracking_number: '9812345678',
        }]];
      }
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
      body: { status: 'cash_received' },
    }, response);
  } finally {
    db.getConnection = originalGetConnection;
  }

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.status, 'cash_received');
  assert.equal(executedQueries.some((query) =>
    query.includes("payment_status = 'paid'")
  ), true);
  assert.equal(executedQueries.some((query) =>
    query.includes('INSERT INTO order_tracking_events')
  ), true);
});

test('cancels a buyer order and returns a one-week suspension deadline', async () => {
  const originalGetConnection = db.getConnection;
  const executedQueries = [];
  const connection = {
    beginTransaction: async () => {},
    execute: async (query) => {
      executedQueries.push(query);
      if (query.includes('SELECT order_status')) {
        return [[{ order_status: 'processing' }]];
      }
      if (query.includes('DATE_ADD(created_at, INTERVAL 7 DAY)')) {
        return [[{ suspended_until: '2026-11-30 12:00:00' }]];
      }
      return [{ affectedRows: 1 }];
    },
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
  };
  db.getConnection = async () => connection;
  const response = createResponse();

  try {
    await orderController.cancelBuyerOrder({
      params: { id: '22' },
      user: { id: 8, role: 'buyer' },
    }, response);
  } finally {
    db.getConnection = originalGetConnection;
  }

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.status, 'cancelled');
  assert.equal(response.body.suspended_until, '2026-11-30 12:00:00');
  assert.match(response.body.message, /one week/);
  assert.equal(executedQueries.some((query) => query.includes("SET order_status = 'cancelled'")), true);
});

test('blocks new buyer orders for one week after a cancellation', async () => {
  const originalGetConnection = db.getConnection;
  let productQueryCalled = false;
  const connection = {
    beginTransaction: async () => {},
    execute: async (query) => {
      if (query.includes('suspension_active')) {
        return [[{ suspension_active: 1, suspended_until: '2026-11-30 12:00:00' }]];
      }
      if (query.includes('FROM products')) productQueryCalled = true;
      return [[{ id: 8 }]];
    },
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
  };
  db.getConnection = async () => connection;
  const response = createResponse();

  try {
    await orderController.createOrder({
      user: { id: 8, role: 'buyer' },
      body: {
        items: [{ product_id: 3, quantity: 1 }],
        recipient_name: 'Buyer Name',
        phone: '9812345678',
        shipping_address: 'Kathmandu',
      },
    }, response);
  } finally {
    db.getConnection = originalGetConnection;
  }

  assert.equal(response.statusCode, 403);
  assert.equal(response.body.suspended_until, '2026-11-30 12:00:00');
  assert.match(response.body.message, /one week/);
  assert.equal(productQueryCalled, false);
});

test('allows buyers to update delivery preferences until an order is cancelled', async () => {
  const originalExecute = db.execute;
  let updateQuery = '';
  db.execute = async (query) => {
    updateQuery = query;
    return [{ affectedRows: 1 }];
  };
  const response = createResponse();

  try {
    await orderController.updateBuyerDeliveryPreference({
      params: { id: '22' },
      user: { id: 8, role: 'buyer' },
      body: { delivery_preference: 'hand-to-me' },
    }, response);
  } finally {
    db.execute = originalExecute;
  }

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.delivery_preference, 'hand-to-me');
  assert.match(updateQuery, /delivery_preference = \?/);
  assert.match(updateQuery, /order_status <> 'cancelled'/);
});

test('rejects delivery preference changes when the order is cancelled', async () => {
  const originalExecute = db.execute;
  db.execute = async () => [{ affectedRows: 0 }];
  const response = createResponse();

  try {
    await orderController.updateBuyerDeliveryPreference({
      params: { id: '22' },
      user: { id: 8, role: 'buyer' },
      body: { delivery_preference: 'hand-to-me' },
    }, response);
  } finally {
    db.execute = originalExecute;
  }

  assert.equal(response.statusCode, 409);
  assert.equal(response.body.message, 'Delivery preference cannot be changed for this order.');
});
