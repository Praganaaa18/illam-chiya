# Illam Chiya

Illam Chiya is a full-stack marketplace concept connecting tea growers and sellers in Ilam, Nepal, with tea buyers. Buyers can discover tea, manage a shopping cart, place cash-on-delivery orders, and follow deliveries. Sellers can manage their product catalog, stock, orders, shipping details, and billing information from a dashboard.

The project is a development stage application. Cash on delivery is the implemented checkout method; an online payment gateway is not integrated.

## Features

### Buyers

- Browse, search, and filter active tea products.
- View product details, including pack size, price, origin-related details, and processing type.
- Register, sign in, and save a cart in browser local storage.
- Place cash-on-delivery orders and view order history and shipment tracking.
- Receive and manage order notifications.

### Sellers

- Register a seller account and provide business and verification information.
- Create, edit, activate/deactivate, and manage tea products and categories.
- Upload product images and manage stock levels.
- Review inventory, active orders, shipment details, and tracking history.
- View the cash ledger, platform-fee calculations, and submit settlement proof.
- Receive and manage order notifications.

## Technology

| Area | Technologies |
| --- | --- |
| Frontend | React 19, React Router, Axios, CSS |
| Backend | Node.js, Express 4 |
| Database | MySQL, `mysql2` |
| Authentication | JSON Web Tokens (JWT), `bcryptjs` |
| Uploads | Multer, local filesystem |
| Tests | React Testing Library, Node.js built-in test runner |

## Project structure

```text
.
├── client/                         # React storefront and seller dashboard
│   ├── public/                     # Static frontend assets
│   ├── src/
│   │   ├── components/             # Pages and UI (catalog, cart, orders, seller tools)
│   │   ├── services/api.js         # Axios client and bearer-token interceptor
│   │   ├── utils/                  # Frontend validation helpers
│   │   ├── App.js                  # Frontend route definitions
│   │   └── index.js                # React entry point
│   └── package.json
├── server/                         # Express API
│   ├── config/                     # MySQL pool and migration runner
│   ├── controllers/                # Authentication, products, orders, inventory, sellers
│   ├── middleware/                 # JWT authentication and image upload handling
│   ├── migrations/                 # Ordered SQL schema migrations
│   ├── routes/                     # Auth, product, order, finance, and other API routes
│   ├── scripts/migrate.js          # Run pending migrations manually
│   ├── uploads/                    # Locally stored uploaded files
│   ├── utils/                      # Backend validation helpers
│   ├── .env.example                # Backend environment variable template
│   ├── server.js                   # Express entry point
│   └── package.json
├── illam_chiya_database.sql        # MySQL database baseline
└── package.json                    # Root-level package manifest
```

## Requirements

- Node.js 18 or newer and npm.
- MySQL 8 or a compatible MySQL server.
- Git.

## Local setup

### 1. Set up MySQL

The supplied `illam_chiya_database.sql` creates the `illam_chiya_db` database and its tables. **It starts with `DROP DATABASE IF EXISTS illam_chiya_db`; importing it deletes and recreates any existing database with that name.** Back up any data you need, or use a disposable development database before importing it.

Import the file with MySQL Workbench, or from the repository root in a shell that supports input redirection:

```bash
mysql -u root -p < illam_chiya_database.sql
```

On Windows PowerShell, run the same command through `cmd`:

```powershell
cmd /c "mysql -u root -p < illam_chiya_database.sql"
```

The SQL file already includes the schema changes from the current migration files. Record those migrations before starting the server so that the migration runner does not try to add already-existing columns:

```sql
USE illam_chiya_db;

CREATE TABLE IF NOT EXISTS schema_migrations (
  name VARCHAR(255) NOT NULL PRIMARY KEY,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO schema_migrations (name) VALUES
  ('001_order_tracking_events.sql'),
  ('002_order_carrier_details.sql'),
  ('003_notifications.sql'),
  ('004_product_pack_size.sql'),
  ('005_order_item_pack_size.sql');
```

Run this SQL once in MySQL Workbench or another MySQL client after importing the baseline. For a database that already has migration history, do not insert these records blindly; let the migration runner apply only migrations that are actually pending.

### 2. Configure and start the backend

```bash
cd server
npm install
```

Copy `server/.env.example` to `server/.env`, then set the values for your local environment:

| Variable | Purpose | Example/default |
| --- | --- | --- |
| `PORT` | API server port | `5000` |
| `DB_HOST` | MySQL host | `localhost` |
| `DB_USER` | MySQL username | `root` |
| `DB_PASSWORD` | MySQL password | Set your local password |
| `DB_NAME` | Database name | `illam_chiya_db` |
| `JWT_SECRET` | Secret used to sign login tokens | Set a long, unique random value |

Keep `.env` private and never commit real credentials. Start the API:

```bash
npm run dev
```

The server checks the database connection, applies pending migrations, then listens on `http://localhost:5000` (or the configured `PORT`). To run migrations without starting the API:

```bash
npm run migrate
```

### 3. Start the frontend

In another terminal:

```bash
cd client
npm install
npm start
```

The development frontend opens at `http://localhost:3000`. Its API client currently targets `http://localhost:5000/api`; update `client/src/services/api.js` if your backend uses a different address.

## API overview

The API base path is `http://localhost:5000/api`. Protected routes require `Authorization: Bearer <token>` from the login response. Buyer- and seller-specific routes also enforce the relevant account role.

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | Public | Register a buyer or seller (`multipart/form-data`; seller verification field is `document`) |
| `POST` | `/auth/login` | Public | Sign in and receive a JWT |
| `GET` | `/auth/me` | Authenticated | Get the current user's profile |
| `GET` | `/products` | Public | List active products |
| `POST` | `/products` | Seller | Create a product |
| `GET` | `/products/categories` | Seller | List categories |
| `POST` / `DELETE` | `/products/categories`, `/products/categories/:categoryId` | Seller | Create or delete a category |
| `GET` | `/products/seller/:sellerId` | Seller | List the signed-in seller's products |
| `PUT` / `DELETE` | `/products/:id` | Seller | Update or delete a product |
| `PATCH` | `/products/:id/status` | Seller | Activate or deactivate a product |
| `POST` | `/orders` | Buyer | Place an order |
| `GET` | `/orders/mine` | Buyer | List the buyer's orders |
| `GET` | `/orders` | Seller | List the seller's orders |
| `GET` | `/orders/:id/tracking` | Buyer or seller | Get order tracking and shipment history |
| `PATCH` | `/orders/:id/status` | Seller | Update shipment status and carrier details |
| `GET` | `/inventory` | Seller | Get inventory and stock metrics |
| `PATCH` | `/inventory/:id/restock` | Seller | Add stock to a product |
| `GET` | `/sellers/info/:sellerId` | Seller | Get the signed-in seller's profile |
| `GET` | `/notifications/mine` | Buyer or seller | List notifications and unread count |
| `PATCH` | `/notifications/read-all` | Buyer or seller | Mark all notifications as read |
| `PATCH` | `/notifications/:notificationId/read` | Buyer or seller | Mark one notification as read |
| `POST` | `/upload` | Seller | Upload a product image (`multipart/form-data`, field `image`) |
| `GET` | `/finance/ledger/:sellerId` | See note below | Get a seller's cash ledger |
| `POST` | `/finance/settle-dues` | See note below | Submit settlement details and proof (`multipart/form-data`, field `proof`) |

The finance routes currently do not use the JWT authentication middleware. Add appropriate authentication and seller-ownership checks before exposing them beyond a trusted development environment.

Uploaded files are stored locally under `server/uploads` and served from `/uploads`. This is suitable only for local development; use managed storage and access controls for production, especially for identity or payment documents.

## Testing and production build

Run frontend tests:

```bash
cd client
npm test -- --watchAll=false
```

Run backend tests with Node's built-in test runner:

```bash
cd server
node --test
```

Create a production frontend build:

```bash
cd client
npm run build
```

## Notes

- The cart is stored in browser local storage; it is not persisted to the server until an order is submitted.
- Order checkout currently uses cash on delivery. The finance dashboard displays a 5% platform-fee calculation and accepts settlement proof; it does not process online payments.
- `server/.env` and uploaded files should not be committed. Use a strong `JWT_SECRET` and review authentication, upload privacy, and database configuration before deployment.
