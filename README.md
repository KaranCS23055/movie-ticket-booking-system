# CineWave - Movie Ticket Booking System

A full-stack, production-grade **Movie Ticket Booking Web Application** developed for the **Software Engineering & Quality Assurance (SEQA) Post Lab**.

This project provides an end-to-end cinema reservation experience, complete with user ticket bookings, interactive auditorium seating layouts, real-time seat collision prevention, role-based access control (Admin & User), and full administrative CRUD operations for movies and showtimes—all backed by a clean RESTful Express architecture and persistent JSON file database.

---

## 📌 Table of Contents
1. [Project Overview & Key Highlights](#-project-overview--key-highlights)
2. [Tech Stack](#-tech-stack)
3. [Architecture & Project Structure](#-architecture--project-structure)
4. [Demo Credentials](#-demo-credentials)
5. [Getting Started (Installation & Execution)](#-getting-started-installation--execution)
6. [Complete REST API Documentation](#-complete-rest-api-documentation)
7. [Postman Testing & cURL Guide](#-postman-testing--curl-guide)
8. [SEQA Quality Assurance & SonarQube Compliance](#-seqa-quality-assurance--sonarqube-compliance)
9. [Automated Verification & Test Suite](#-automated-verification--test-suite)

---

## 🚀 Project Overview & Key Highlights

- **Interactive Seating Plan**: Visual auditorium screen with curved display effect, rows A through E (40 seats), aisle spacing, and live seat states: *Available*, *Selected*, and *Booked*.
- **Strict Concurrency & Seat Collision Prevention**: Validates seat availability at the backend level. Already reserved seats cannot be selected or double-booked.
- **Server-Side Pricing**: Prices are securely computed on the backend (`quantity × show.ticketPrice`) to prevent client-side price tampering.
- **Role-Based Authentication**:
  - **User Role**: Browse movies, filter by genre, search, view showtimes, reserve seats, view generated ticket passes with barcodes, and cancel reservations.
  - **Admin Role**: Executive KPI metrics (Total Movies, Active Shows, Total Bookings, Gross Revenue), complete CRUD for movies, complete CRUD for show schedules, and global bookings management.
- **1-Click Demo Logins**: Instant credential buttons for quick evaluation during lab viva examinations.
- **Persistent Data Store**: All additions, updates, and cancellations are saved directly to `database.json` via safe atomic file writes.

---

## 💻 Tech Stack

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend** | Vanilla HTML5, CSS3, JavaScript (ES6+) | Lightweight, zero external UI framework bloat, fast load times |
| **Styling** | Custom CSS (Cinema Dark Theme, Flexbox/CSS Grid) | Fully responsive across mobile, tablet, and desktop viewports |
| **Backend** | Node.js & Express.js | Industry standard for RESTful microservices and asynchronous I/O |
| **Database** | File-based persistent JSON (`database.json`) | Zero external database installation, cross-platform portability |
| **Security & Auth** | Bearer Token Middleware & RBAC | Clean token-based authorization compliant with REST principles |

---

## 📂 Architecture & Project Structure

```text
movie-ticket-booking-system/
├── backend/
│   ├── middleware/
│   │   └── auth.js            # Token generation, session verification, admin RBAC
│   ├── routes/
│   │   ├── auth.js            # POST /api/login, GET /api/me
│   │   ├── movies.js          # GET, POST, PUT, DELETE /api/movies
│   │   ├── shows.js           # GET, POST, PUT, DELETE /api/shows
│   │   └── bookings.js        # GET, POST, DELETE /api/bookings
│   ├── db.js                  # Atomic file read/write helper & data access layer
│   ├── server.js              # Express app bootstrap, static server, error handler
│   └── test.js                # End-to-end automated regression test suite
├── frontend/
│   ├── css/
│   │   └── style.css          # Cinema dark theme, seat grid, modals, responsive CSS
│   ├── js/
│   │   └── app.js             # Client SPA controller, state management, API calls
│   └── index.html             # User & Admin single-page application interface
├── database.json              # Persistent JSON database (Users, Movies, Shows, Bookings)
├── package.json               # Node.js dependencies and script definitions
└── README.md                  # Comprehensive SEQA documentation and API manual
```

---

## 🔑 Demo Credentials

Preloaded sample accounts configured inside `database.json`:

| Role | Name | Email | Password | Permissions |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | System Administrator | `admin@cinema.com` | `admin123` | Full CRUD on movies/shows, view all bookings, cancellation |
| **User** | Sourish Bhandakkar | `sourish@gmail.com` | `user123` | Book tickets, view own bookings, cancel own tickets |

> **Viva Tip**: On the Sign-In screen, click the **"Admin Demo"** or **"User (Sourish)"** buttons to auto-populate and sign in with one click.

---

## ⚙️ Getting Started (Installation & Execution)

### Prerequisites
- **Node.js** (v16 or higher recommended; verified on Node v20+)
- **npm** (comes bundled with Node.js)

### Step 1: Install Dependencies
Open your terminal in the project root directory and run:
```bash
npm install
```

### Step 2: Start the Web Application
```bash
npm start
```
The server will boot up and log:
```text
====================================================
🎬 Movie Ticket Booking System is running!
📍 URL: http://localhost:3000
🛡️  Admin: admin@cinema.com | admin123
👤 User: sourish@gmail.com | user123
====================================================
```

### Step 3: Access in Browser
Open your browser and navigate to:
```text
http://localhost:3000
```

---

## 📡 Complete REST API Documentation

### 1. Authentication
- **`POST /api/login`**
  - **Description**: Authenticates user and returns authorization token.
  - **Body**: `{ "email": "admin@cinema.com", "password": "admin123" }`
  - **Responses**: `200 OK`, `400 Bad Request`, `401 Unauthorized`

- **`GET /api/me`**
  - **Description**: Retrieves current user profile.
  - **Headers**: `Authorization: Bearer <token>`
  - **Responses**: `200 OK`, `401 Unauthorized`

---

### 2. Movies Management
- **`GET /api/movies`**
  - **Description**: Retrieves all movies. Supports optional query parameters `?genre=Sci-Fi` or `?search=Interstellar`.
  - **Responses**: `200 OK`

- **`GET /api/movies/:id`**
  - **Description**: Retrieves a single movie by ID.
  - **Responses**: `200 OK`, `404 Not Found`

- **`POST /api/movies`** *(Admin Only)*
  - **Description**: Adds a new movie.
  - **Headers**: `Authorization: Bearer <admin-token>`
  - **Body**:
    ```json
    {
      "title": "Gladiator II",
      "genre": "Action / Drama",
      "duration": "148 min",
      "language": "English",
      "rating": 8.5,
      "description": "Years after witnessing the death of Maximus, Lucius must enter the Colosseum.",
      "poster": "https://images.unsplash.com/photo-1534447677768-be436bb09401"
    }
    ```
  - **Responses**: `201 Created`, `400 Bad Request`, `403 Forbidden`

- **`PUT /api/movies/:id`** *(Admin Only)*
  - **Description**: Updates an existing movie record.
  - **Responses**: `200 OK`, `400 Bad Request`, `403 Forbidden`, `404 Not Found`

- **`DELETE /api/movies/:id`** *(Admin Only)*
  - **Description**: Deletes a movie and removes all shows associated with it.
  - **Responses**: `200 OK`, `403 Forbidden`, `404 Not Found`

---

### 3. Shows Schedule
- **`GET /api/shows`**
  - **Description**: Retrieves all scheduled shows. Supports `?movieId=<id>`.
  - **Responses**: `200 OK`

- **`GET /api/shows/:id`**
  - **Description**: Retrieves show details including live array of `bookedSeats`.
  - **Responses**: `200 OK`, `404 Not Found`

- **`POST /api/shows`** *(Admin Only)*
  - **Description**: Schedules a new show for a movie.
  - **Headers**: `Authorization: Bearer <admin-token>`
  - **Body**:
    ```json
    {
      "movieId": "mov-001",
      "screen": "Screen 1 (IMAX 3D)",
      "date": "2026-09-10",
      "time": "08:00 PM",
      "ticketPrice": 350
    }
    ```
  - **Responses**: `201 Created`, `400 Bad Request`, `403 Forbidden`

- **`PUT /api/shows/:id`** *(Admin Only)*
  - **Description**: Modifies screen, time, date, or ticket price.
  - **Responses**: `200 OK`, `400 Bad Request`, `403 Forbidden`, `404 Not Found`

- **`DELETE /api/shows/:id`** *(Admin Only)*
  - **Description**: Deletes a scheduled show.
  - **Responses**: `200 OK`, `403 Forbidden`, `404 Not Found`

---

### 4. Ticket Bookings
- **`GET /api/bookings`**
  - **Description**:
    - If called by an **Admin**, returns all bookings across the theater.
    - If called by a **Customer**, returns only bookings belonging to their account.
  - **Headers**: `Authorization: Bearer <token>`
  - **Responses**: `200 OK`, `401 Unauthorized`

- **`POST /api/bookings`**
  - **Description**: Reserves selected seats for a show. Server verifies seat availability, rejects already-booked seats, calculates total price, and persists reservation.
  - **Headers**: `Authorization: Bearer <token>`
  - **Body**:
    ```json
    {
      "showId": "shw-001",
      "seats": ["C1", "C2"]
    }
    ```
  - **Responses**:
    - `201 Created`: Booking successful.
    - `400 Bad Request`: Duplicate seats requested or seat already reserved.
    - `401 Unauthorized`: User not signed in.
    - `404 Not Found`: Show does not exist.

- **`DELETE /api/bookings/:id`**
  - **Description**: Cancels booking and immediately releases reserved seats back to the pool.
  - **Permissions**: Regular users can only cancel their own tickets; Admins can cancel any ticket.
  - **Responses**: `200 OK`, `400 Bad Request`, `403 Forbidden`, `404 Not Found`

---

## 🧪 Postman Testing & cURL Guide

### 1. User Login Request
```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email": "sourish@gmail.com", "password": "user123"}'
```

### 2. Book Seats Request
```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN_FROM_LOGIN>" \
  -d '{"showId": "shw-001", "seats": ["B1", "B2"]}'
```

### 3. Cancel Booking Request
```bash
curl -X DELETE http://localhost:3000/api/bookings/<BOOKING_ID> \
  -H "Authorization: Bearer <TOKEN_FROM_LOGIN>"
```

---

## 🔍 SEQA Quality Assurance & SonarQube Compliance

Designed with software engineering and static code analysis standards in mind:

1. **Low Cyclomatic Complexity**: Functions are small, modular, and adhere to Single Responsibility Principle (SRP).
2. **Atomic I/O Safety**: `backend/db.js` implements a Promise-based queue and temporary write-and-rename mechanism, preventing race conditions and file corruption.
3. **Defense in Depth**:
   - Both client-side and server-side validation.
   - Prices and totals are computed strictly on the backend.
   - Input sanitization against injection attacks.
4. **Resilient Error Handling**: Centralized Express middleware catches uncaught exceptions and converts them into structured HTTP 500 JSON responses without terminating the Node.js process.
5. **No Code Duplication (DRY)**: Reusable authentication middleware, database helpers, and client utility routines.

---

## 🧪 Automated Verification & Test Suite

The project includes an end-to-end automated testing suite in `backend/test.js`.

To run the verification suite:
```bash
npm test
```

### Verified Test Cases:
- [x] Server Health check responds with HTTP 200.
- [x] Admin login with valid credentials (returns bearer token).
- [x] User login with valid credentials (returns bearer token).
- [x] Rejection of incorrect passwords (HTTP 401).
- [x] Rejection of empty/missing login fields (HTTP 400).
- [x] Movie listing retrieval.
- [x] Authorization guard: regular users blocked from creating movies (HTTP 403).
- [x] Admin successfully creates a new movie (HTTP 201).
- [x] Admin successfully updates an existing movie (HTTP 200).
- [x] Admin schedules a new showtime (HTTP 201).
- [x] Show details include updated `bookedSeats` collection.
- [x] User reserves seats; server accurately computes total price (HTTP 201).
- [x] Duplicate seat booking rejected; collision prevention verified (HTTP 400).
- [x] Access control: User blocked from cancelling another user's booking (HTTP 403).
- [x] Booking owner cancels booking; reserved seats are released back to pool (HTTP 200).
- [x] Newly released seats can now be booked by another user.
- [x] Clean cleanup of test records and file persistence verification in `database.json`.
