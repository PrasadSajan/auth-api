# 🔐 Authentication API

A complete authentication system built with Node.js, Express, PostgreSQL, and JWT.

## 🚀 Features

- **User Registration** with email verification
- **JWT Authentication** with secure tokens
- **Password Reset** via email
- **Admin Dashboard** for user management
- **PostgreSQL Database** with proper security
- **RESTful API** design
- **Professional Frontend** interface

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL with pg
- **Authentication:** JWT, bcryptjs
- **Email:** Nodemailer
- **Security:** CORS, environment variables, middleware protection

## 📦 Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/auth-api.git

2. Install dependencies:

bash
npm install

3. Set up environment variables:

env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=auth_api
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

4. Start the server:

bash
npm run dev

📚 API Endpoints
POST /api/auth/signup - User registration

POST /api/auth/login - User login

POST /api/auth/forgot-password - Password reset request

POST /api/auth/reset-password - Password reset

GET /api/admin/users - Get all users (Admin only)


🎯 Usage
Use Thunder Client or Postman to test the API endpoints. The frontend is available in the frontend folder.