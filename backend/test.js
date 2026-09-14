/**
 * CineWave - Automated Integration & Regression Test Suite
 * SEQA Quality Assurance Verification Script
 */

process.env.NODE_ENV = 'test';
const { app } = require('./server');
const fs = require('fs');
const path = require('path');

const TEST_PORT = 3999;
const BASE_URL = `http://localhost:${TEST_PORT}/api`;

let server = null;
let adminToken = null;
let user1Token = null;
let user2Token = null;

let testMovieId = null;
let testShowId = null;
let testBookingId = null;

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log('\n====================================================');
  console.log('🧪 Starting SEQA Automated Quality Assurance Tests');
  console.log('====================================================\n');

  // Start test server
  await new Promise((resolve) => {
    server = app.listen(TEST_PORT, () => {
      console.log(`Test server running on port ${TEST_PORT}\n`);
      resolve();
    });
  });

  try {
    // ---------------- TEST SUITE 1: HEALTH & AUTHENTICATION ----------------
    console.log('--- TEST SUITE 1: Health & Authentication ---');

    // 1. Health check
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200, 'Health endpoint responds with HTTP 200');
    assert(healthData.status === 'UP', 'Health status is "UP"');

    // 2. Admin Login
    const adminLoginRes = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@cinema.com', password: 'admin123' })
    });
    const adminLoginData = await adminLoginRes.json();
    assert(adminLoginRes.status === 200, 'Admin login returns HTTP 200');
    assert(adminLoginData.token != null, 'Admin login provides authorization token');
    assert(adminLoginData.user.role === 'admin', 'Admin user has role "admin"');
    adminToken = adminLoginData.token;

    // 3. User Sourish Login
    const user1LoginRes = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'sourish@gmail.com', password: 'user123' })
    });
    const user1LoginData = await user1LoginRes.json();
    assert(user1LoginRes.status === 200, 'User Sourish login returns HTTP 200');
    assert(user1LoginData.user.name === 'Sourish Bhandakkar', 'User name is "Sourish Bhandakkar"');
    assert(user1LoginData.user.role === 'user', 'Sourish has role "user"');
    user1Token = user1LoginData.token;

    // 4. Concurrency Test User Setup & Login
    const { readDatabase, writeDatabase } = require('./db');
    const initialDb = await readDatabase();
    initialDb.users.push({
      id: 'usr-test-02',
      name: 'Test Customer',
      email: 'testcustomer@example.com',
      password: 'user123',
      role: 'user'
    });
    await writeDatabase(initialDb);

    const user2LoginRes = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'testcustomer@example.com', password: 'user123' })
    });
    const user2LoginData = await user2LoginRes.json();
    assert(user2LoginRes.status === 200, 'Second test user login returns HTTP 200');
    user2Token = user2LoginData.token;

    // 5. Invalid Password Rejection
    const badLoginRes = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@cinema.com', password: 'wrongpassword' })
    });
    assert(badLoginRes.status === 401, 'Invalid password correctly rejected with HTTP 401');

    // 6. Missing Fields Rejection
    const missingFieldsRes = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: '' })
    });
    assert(missingFieldsRes.status === 400, 'Missing fields correctly rejected with HTTP 400');

    // ---------------- TEST SUITE 2: MOVIE CRUD ----------------
    console.log('\n--- TEST SUITE 2: Movie Management (CRUD) ---');

    // 1. Fetch movies public
    const getMoviesRes = await fetch(`${BASE_URL}/movies`);
    const moviesData = await getMoviesRes.json();
    assert(getMoviesRes.status === 200, 'GET /api/movies returns HTTP 200');
    assert(Array.isArray(moviesData.data) && moviesData.data.length > 0, 'Movies list is populated');

    // 2. Non-admin forbidden from creating movie
    const forbiddenMovieRes = await fetch(`${BASE_URL}/movies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`
      },
      body: JSON.stringify({
        title: 'Hacker Film',
        genre: 'Action',
        duration: '100 min',
        language: 'English',
        rating: 7,
        description: 'Test'
      })
    });
    assert(forbiddenMovieRes.status === 403, 'Regular user forbidden from creating movie (HTTP 403)');

    // 3. Admin creates new movie
    const createMovieRes = await fetch(`${BASE_URL}/movies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        title: 'Avatar: The Way of Water (QA Edition)',
        genre: 'Sci-Fi / Adventure',
        duration: '192 min',
        language: 'English',
        rating: 8.6,
        description: 'Jake Sully lives with his newfound family formed on the extrasolar moon Pandora.',
        poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600'
      })
    });
    const createMovieData = await createMovieRes.json();
    assert(createMovieRes.status === 201, 'Admin creates movie successfully (HTTP 201)');
    assert(createMovieData.data.id != null, 'Created movie has unique identifier');
    testMovieId = createMovieData.data.id;

    // 4. Update movie (Admin)
    const updateMovieRes = await fetch(`${BASE_URL}/movies/${testMovieId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        title: 'Avatar: The Way of Water (Updated)',
        genre: 'Sci-Fi / Adventure / Action',
        duration: '192 min',
        language: 'English / Hindi',
        rating: 9.1,
        description: 'Updated description for QA verification.'
      })
    });
    const updateMovieData = await updateMovieRes.json();
    assert(updateMovieRes.status === 200, 'Admin updates movie successfully (HTTP 200)');
    assert(updateMovieData.data.title === 'Avatar: The Way of Water (Updated)', 'Updated title matches');

    // ---------------- TEST SUITE 3: SHOW CRUD ----------------
    console.log('\n--- TEST SUITE 3: Shows Schedule (CRUD) ---');

    // 1. Admin creates show for the new movie
    const createShowRes = await fetch(`${BASE_URL}/shows`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        movieId: testMovieId,
        screen: 'Screen 1 (IMAX 3D)',
        date: '2026-09-10',
        time: '07:30 PM',
        ticketPrice: 400
      })
    });
    const createShowData = await createShowRes.json();
    assert(createShowRes.status === 201, 'Admin schedules show successfully (HTTP 201)');
    assert(createShowData.data.id != null, 'Created show has unique ID');
    testShowId = createShowData.data.id;

    // 2. Fetch single show details
    const getShowRes = await fetch(`${BASE_URL}/shows/${testShowId}`);
    const getShowData = await getShowRes.json();
    assert(getShowRes.status === 200, 'GET /api/shows/:id returns HTTP 200');
    assert(Array.isArray(getShowData.data.bookedSeats), 'Show contains bookedSeats array');

    // ---------------- TEST SUITE 4: BOOKING LOGIC & CONCURRENCY ----------------
    console.log('\n--- TEST SUITE 4: Booking & Seat Concurrency Verification ---');

    // 1. User Sourish books seats D1 and D2
    const bookingRes = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`
      },
      body: JSON.stringify({
        showId: testShowId,
        seats: ['D1', 'D2']
      })
    });
    const bookingData = await bookingRes.json();
    assert(bookingRes.status === 201, 'User 1 successfully books seats (HTTP 201)');
    assert(bookingData.data.totalAmount === 800, 'Total amount calculated correctly on server (2 x 400 = 800)');
    assert(bookingData.data.seats.length === 2, 'Two seats recorded in booking');
    testBookingId = bookingData.data.id;

    // 2. Duplicate seat collision rejection (Second user attempts to book D2)
    const duplicateRes = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user2Token}`
      },
      body: JSON.stringify({
        showId: testShowId,
        seats: ['D2', 'D3']
      })
    });
    assert(duplicateRes.status === 400, 'Attempt to book already-reserved seat D2 is rejected with HTTP 400');

    // 3. Second user tries to cancel Sourish\'s booking -> Forbidden
    const unauthCancelRes = await fetch(`${BASE_URL}/bookings/${testBookingId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${user2Token}`
      }
    });
    assert(unauthCancelRes.status === 403, 'User cannot cancel another user\'s booking (HTTP 403)');

    // 4. Sourish cancels his own booking -> Allowed & seats released
    const cancelRes = await fetch(`${BASE_URL}/bookings/${testBookingId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${user1Token}`
      }
    });
    assert(cancelRes.status === 200, 'User cancels own booking successfully (HTTP 200)');

    // 5. Verify seats D1 and D2 are now released and second user can now book D2!
    const rebookRes = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user2Token}`
      },
      body: JSON.stringify({
        showId: testShowId,
        seats: ['D2', 'D3']
      })
    });
    assert(rebookRes.status === 201, 'Released seat D2 can now be booked by User 2 (HTTP 201)');

    // ---------------- TEST SUITE 5: CLEANUP & PERSISTENCE ----------------
    console.log('\n--- TEST SUITE 5: Cleanup & File Persistence Verification ---');

    // Admin cleans up test bookings completely
    const rebookData = await rebookRes.json();
    const { removeBooking } = require('./db');
    await removeBooking(testBookingId);
    await removeBooking(rebookData.data.id);

    // Admin deletes test show
    const deleteShowRes = await fetch(`${BASE_URL}/shows/${testShowId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(deleteShowRes.status === 200, 'Admin deletes show successfully (HTTP 200)');

    // Admin deletes test movie
    const deleteMovieRes = await fetch(`${BASE_URL}/movies/${testMovieId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(deleteMovieRes.status === 200, 'Admin deletes movie successfully (HTTP 200)');

    // Clean up temporary test user
    const finalDb = await readDatabase();
    finalDb.users = finalDb.users.filter((u) => u.id !== 'usr-test-02');
    await writeDatabase(finalDb);

    // Verify physical persistence in database.json
    const dbFilePath = path.join(__dirname, '..', 'database.json');
    const rawDb = fs.readFileSync(dbFilePath, 'utf-8');
    const parsedDb = JSON.parse(rawDb);
    assert(parsedDb.users && parsedDb.users.length === 2, 'database.json contains intact users array');
    assert(parsedDb.movies && parsedDb.movies.length >= 5, 'database.json contains initial movies');
    assert(parsedDb.shows && parsedDb.shows.length >= 7, 'database.json contains shows');
    assert(parsedDb.bookings && parsedDb.bookings.length >= 1, 'database.json contains booking records');

    console.log('\n====================================================');
    console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
    console.log('====================================================\n');
  } catch (err) {
    console.error('\n❌ Test suite encountered a failure:', err.message);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close(() => {
        process.exit(process.exitCode || 0);
      });
    } else {
      process.exit(process.exitCode || 0);
    }
  }
}

runTests();
