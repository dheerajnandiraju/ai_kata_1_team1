# Office Supply Management System

A full-stack application for managing office supply requests with role-based access control.

## Features

### Admin Role
- 📦 View current inventory with stock status
- 📋 Review and process pending supply requests
- ✅ Approve requests (automatically updates inventory)
- ❌ Reject requests with optional reason
- 📜 View complete request history

### Employee Role
- ➕ Submit new supply requests
- 📝 Add remarks/justification for requests
- 📊 Track request status (Pending/Approved/Rejected)
- 📋 View personal request history

## Tech Stack

### Backend
- **Node.js** with Express.js
- **RESTful API** architecture
- **In-memory data store** (JSON-based)
- **CORS** enabled for cross-origin requests

### Frontend
- **React 18** with functional components
- **CSS3** with modern styling
- **Responsive design**

## Project Structure

```
office-supply-management/
├── backend/
│   ├── src/
│   │   ├── data/
│   │   │   └── store.js          # In-memory data store
│   │   ├── routes/
│   │   │   ├── authRoutes.js     # Authentication endpoints
│   │   │   ├── inventoryRoutes.js # Inventory endpoints
│   │   │   └── requestRoutes.js   # Request management endpoints
│   │   └── server.js             # Express server setup
│   └── package.json
│
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── components/
    │   │   ├── AdminDashboard.js  # Admin interface
    │   │   ├── EmployeeDashboard.js # Employee interface
    │   │   ├── Header.js          # Navigation header
    │   │   └── Login.js           # Login page
    │   ├── services/
    │   │   └── api.js            # API service layer
    │   ├── styles/
    │   │   ├── index.css         # Global styles
    │   │   ├── App.css           # App layout styles
    │   │   ├── Login.css         # Login page styles
    │   │   ├── Header.css        # Header styles
    │   │   ├── AdminDashboard.css # Admin styles
    │   │   └── EmployeeDashboard.css # Employee styles
    │   ├── App.js                # Main app component
    │   └── index.js              # React entry point
    └── package.json
```

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   cd ai_kata_1_team1
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

### Running the Application

1. **Start the backend server** (Terminal 1)
   ```bash
   cd backend
   npm start
   ```
   Server runs on `http://localhost:5000`

2. **Start the frontend** (Terminal 2)
   ```bash
   cd frontend
   npm start
   ```
   App opens on `http://localhost:3000`

## Demo Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Employee | employee1 | emp123 |
| Employee | employee2 | emp123 |

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login

### Inventory
- `GET /api/inventory` - Get all inventory items
- `GET /api/inventory/:id` - Get single item
- `GET /api/inventory/category/:category` - Get items by category

### Requests
- `GET /api/requests` - Get all requests (supports filters)
- `POST /api/requests` - Create new request
- `PUT /api/requests/:id/approve` - Approve request
- `PUT /api/requests/:id/reject` - Reject request

## Screenshots

### Login Page
Clean login interface with demo credentials displayed for easy testing.

### Admin Dashboard
- **Pending Requests Tab**: View and process incoming requests
- **Inventory Tab**: Monitor stock levels
- **History Tab**: Review all processed requests

### Employee Dashboard
- **Stats Overview**: Quick view of request statuses
- **New Request**: Form to submit supply requests
- **My Requests**: Track all submitted requests

## License

MIT License
