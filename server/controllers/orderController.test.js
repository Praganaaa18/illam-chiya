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

test('requires a nearby landmark when creating an order', async () => {
  const originalGetConnection = db.getConnection;
  db.getConnection = async () => {
    throw new Error('Database should not be queried when the landmark is missing.');
  };
  const response = createResponse();

  try {
    await orderController.createOrder({
      user: { id: 8, role: 'buyer' },
      body: {
        items: [{ product_id: 1, quantity: 1 }],
        recipient_name: 'Buyer Name',
        phone: '9800000000',
        shipping_address: 'Ilam, Kathmandu',
      },
    }, response);
  } finally {
    db.getConnection = originalGetConnection;
  }

  assert.equal(response.statusCode, 400);
  assert.equal(
    response.body.message,
    'Recipient name, a valid 10-digit phone number, shipping address, and nearby landmark are required.'
  );
});

test('rejects special characters in the delivery address', async () => {
  const originalGetConnection = db.getConnection;
  db.getConnection = async () => {
    throw new Error('Database should not be queried for an invalid delivery address.');
  };
  const response = createResponse();

  try {
    await orderController.createOrder({
      user: { id: 8, role: 'buyer' },
      body: {
        items: [{ product_id: 1, quantity: 1 }],
        recipient_name: 'Buyer Name',
        phone: '9800000000',
        shipping_address: 'Ilam @ 3, Kathmandu',
        landmark: 'Near the community temple',
      },
    }, response);
  } finally {
    db.getConnection = originalGetConnection;
  }

  assert.equal(response.statusCode, 400);
  assert.equal(
    response.body.message,
    'Special characters (like @, #, $, %) are not allowed in Delivery Address.'
  );
});

test('includes seller brand names in buyer order results', async () => {
  const originalQuery = db.query;
  let executedQuery = '';
  db.query = async (query, values) => {
    executedQuery = query;
    assert.deepEqual(values, [8]);
    return [[{ id: 22, seller_brand_names: 'Ilam Tea Estate' }]];
  };
  const response = createResponse();

  try {
    await orderController.getBuyerOrders({
      user: { id: 8, role: 'buyer' },
    }, response);
  } finally {
    db.query = originalQuery;
  }

  assert.equal(response.statusCode, 200);
  assert.equal(response.body[0].seller_brand_names, 'Ilam Tea Estate');
  assert.match(
    executedQuery,
    /COALESCE\(NULLIF\(TRIM\(seller\.business_name\), ''\), seller\.full_name\)/
  );
});

test('returns the initial order_placed shipment milestone', async () => {
  const originalExecute = db.execute;
  const queries = [];
  db.execute = async (query) => {
    queries.push(query);
    if (query.includes('FROM orders o')) {
      return [[{
        id: 22,
        buyer_id: 8,
        total_amount: 500,
        shipping_address: 'Ilam, Kathmandu',
        order_status: 'order_placed',
        carrier_name: null,
        tracking_number: null,
        delivery_preference: 'doorstep',
        created_at: '2026-02-01T10:00:00.000Z',
      }]];
    }
    if (query.includes('FROM order_tracking_events')) {
      return [[{
        status: 'order_placed',
        description: 'Order Placed',
        created_at: '2026-02-01T10:00:00.000Z',
      }]];
    }
    return [[]];
  };
  const response = createResponse();

  try {
    await orderController.getOrderTracking({
      params: { id: '22' },
      user: { id: 8, role: 'buyer' },
    }, response);
  } finally {
    db.execute = originalExecute;
  }

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.events[0].description, 'Order Placed');
  assert.match(queries.find((query) => query.includes('FROM order_tracking_events')), /CASE WHEN status = 'pending' THEN 'Order Confirmed'/);
});

test('creates orders with the order_placed initial status', async () => {
  const originalGetConnection = db.getConnection;
  const executedQueries = [];
  const connection = {
    beginTransaction: async () => {},
    execute: async (query) => {
      executedQueries.push(query);
      if (query.includes('suspension_active')) return [[{ suspension_active: 0 }]];
      if (query.includes('FROM products')) {
        return [[{
          id: 3,
          name: 'Ilam Tea',
          seller_id: 5,
          price: 250,
          pack_size: '100 g',
          stock_quantity: 10,
          is_active: 1,
        }]];
      }
      if (query.includes('reserved_quantity')) return [[{ reserved_quantity: 0 }]];
      if (query.includes('INSERT INTO orders')) return [{ insertId: 22 }];
      return [{}];
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
        landmark: 'Near the main temple',
      },
    }, response);
  } finally {
    db.getConnection = originalGetConnection;
  }

  assert.equal(response.statusCode, 201);
  assert.match(
    executedQueries.find((query) => query.includes('INSERT INTO orders')),
    /'pending', 'order_placed'/
  );
  assert.match(
    executedQueries.find((query) => query.includes('INSERT INTO order_tracking_events')),
    /'order_placed', 'Order Placed'/
  );
});

test('allows seller to confirm a newly placed order', async () => {
  const originalGetConnection = db.getConnection;
  const executedQueries = [];
  const connection = {
    beginTransaction: async () => {},
    execute: async (query, values) => {
      executedQueries.push({ query, values });
      if (query.includes('SELECT o.id, o.buyer_id, o.order_status')) {
        return [[{
          id: 22,
          buyer_id: 8,
          order_status: 'order_placed',
          carrier_name: null,
          tracking_number: null,
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
      body: { status: 'pending' },
    }, response);
  } finally {
    db.getConnection = originalGetConnection;
  }

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.status, 'pending');
  const statusEvent = executedQueries.find(({ query }) =>
    query.includes('INSERT INTO order_tracking_events')
  );
  assert.deepEqual(statusEvent.values, ['22', 'pending', 'Order Confirmed']);
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
        landmark: 'Near the main temple',
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
      if (query.includes('SELECT o.id, o.buyer_id, o.order_status')) {
        return [[{
          id: 22,
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
        landmark: 'Near the main temple',
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

test('does not suspend buyers for seller-cancelled orders', async () => {
  const originalGetConnection = db.getConnection;
  let suspensionQuery = '';
  const connection = {
    beginTransaction: async () => {},
    execute: async (query) => {
      if (query.includes('suspension_active')) {
        suspensionQuery = query;
        return [[{ suspension_active: 0, suspended_until: null }]];
      }
      if (query.includes('FROM products')) return [[]];
      return [[{ id: 8 }]];
    },
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
        landmark: 'Near the main temple',
      },
    }, response);
  } finally {
    db.getConnection = originalGetConnection;
  }

  assert.equal(response.statusCode, 400);
  assert.match(
    suspensionQuery,
    /event\.description = 'Cancelled by buyer; one-week ordering suspension'/
  );
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