#Illam Chiya Project
# 🍃 Illam Chiya - E-Commerce Platform

An e-commerce web application designed to connect authentic local tea producers from Ilam, Nepal with tea enthusiasts worldwide. Built using a modern full-stack web architecture with Node.js, Express, MySQL, and React.

---

## 🛠 Tech Stack

| Domain | Technologies Used |
| :--- | :--- |
| **Frontend** | React.js, React Router v6, Axios, CSS3 (Matcha Theme) |
| **Backend** | Node.js, Express.js |
| **Database** | MySQL |
| **Authentication & Security** | JSON Web Tokens (JWT), Bcrypt.js |
| **File Storage** | Multer (Static File Uploads) |
| **Version Control** | Git, GitHub |

---

##  Core Features

* **User Authentication & Authorization**: Secure signup, login, and password hashing using JWT and Bcrypt.
* **Product Management**: Ability to add, fetch, and display catalog products with category filtering.
* **Media Upload Handling**: Static image file management via Multer for product assets and verification files.
* **RESTful API Service**: Express API layer integrated with an Axios client interceptor to handle requests and manage bearer token headers automatically.

---

## 📁 Project Structure

```text
Illam Chiya/
├── client/                     # React Frontend Application
│   ├── src/
│   │   ├── services/
│   │   │   └── api.js          # Shared Axios Instance with JWT Interceptor
│   │   ├── App.js              # Central Routing Configuration
│   │   └── index.js
│   └── package.json
│
├── server/                     # Node.js & Express Backend Application
│   ├── config/
│   │   └── db.js               # MySQL Connection Pool
│   ├── controllers/            # Request Logic (authController, productController)
│   ├── middleware/             # Middleware (authMiddleware, uploadMiddleware)
│   ├── routes/                 # Express API Routes (authRoutes, productRoutes)
│   ├── uploads/                # Static Asset Directory
│   ├── .env                    # Environment Configurations
│   ├── server.js               # Express Application Server Entry Point
│   └── package.json
│
└── illam_chiya_database.sql    # Relational Database Schema

## Setup & Installation Instructions

#Prerequisites
Node.js (v18+)
MySQL Database Server
Git

1. Database Setup

Import illam_chiya_database.sql into your local MySQL server instance.
Verify table setup (users, products, categories).

2. Backend Configuration

Bash
cd server
npm install

##Create a .env file inside the server/ directory:

Code snippet
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=illam_chiya_db
JWT_SECRET=your_jwt_secret_key
Start the backend server:

Bash
npm run dev

3. Frontend Configuration
Bash
cd client
npm install
npm start
The client dashboard will launch at http://localhost:3000.

## 📡 Key API Endpoints
POST /api/auth/register — User account registration

POST /api/auth/login — User authentication and JWT issuance

GET /api/products — Retrieve all published tea products

POST /api/products — Create new tea entry (Requires auth & multipart upload)

GET /uploads/:filename — Serve uploaded media assets