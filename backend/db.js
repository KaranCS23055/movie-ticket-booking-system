const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'database.json');

// Mutex queue to prevent race conditions during concurrent file writes
let writeQueue = Promise.resolve();

/**
 * Safely reads database from database.json
 * @returns {Promise<Object>} The database content
 */
async function readDatabase() {
  try {
    const raw = await fs.promises.readFile(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    console.error('Error reading database file:', error.message);
    throw new Error('Database read failure');
  }
}

/**
 * Safely writes data to database.json via sequential promise queue
 * @param {Object} data Database content to write
 * @returns {Promise<void>}
 */
async function writeDatabase(data) {
  writeQueue = writeQueue.then(async () => {
    try {
      const tempPath = `${DB_FILE}.tmp`;
      await fs.promises.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
      await fs.promises.rename(tempPath, DB_FILE);
    } catch (error) {
      console.error('Error writing database file:', error.message);
      throw new Error('Database write failure');
    }
  });
  return writeQueue;
}

// ---------------- USER OPERATIONS ----------------
async function getUsers() {
  const db = await readDatabase();
  return db.users || [];
}

async function findUserByEmail(email) {
  const users = await getUsers();
  return users.find((u) => u.email.toLowerCase() === String(email).trim().toLowerCase()) || null;
}

async function findUserById(id) {
  const users = await getUsers();
  return users.find((u) => u.id === id) || null;
}

// ---------------- MOVIE OPERATIONS ----------------
async function getMovies() {
  const db = await readDatabase();
  return db.movies || [];
}

async function findMovieById(id) {
  const movies = await getMovies();
  return movies.find((m) => m.id === id) || null;
}

async function addMovie(movieData) {
  const db = await readDatabase();
  const newMovie = {
    id: `mov-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    ...movieData
  };
  db.movies.push(newMovie);
  await writeDatabase(db);
  return newMovie;
}

async function updateMovie(id, updateData) {
  const db = await readDatabase();
  const index = db.movies.findIndex((m) => m.id === id);
  if (index === -1) return null;

  db.movies[index] = {
    ...db.movies[index],
    ...updateData,
    id // Ensure ID remains immutable
  };
  await writeDatabase(db);
  return db.movies[index];
}

async function deleteMovie(id) {
  const db = await readDatabase();
  const index = db.movies.findIndex((m) => m.id === id);
  if (index === -1) return false;

  db.movies.splice(index, 1);
  // Also clean up shows associated with this movie
  db.shows = (db.shows || []).filter((s) => s.movieId !== id);
  await writeDatabase(db);
  return true;
}

// ---------------- SHOW OPERATIONS ----------------
async function getShows(movieId = null) {
  const db = await readDatabase();
  let shows = db.shows || [];
  if (movieId) {
    shows = shows.filter((s) => s.movieId === movieId);
  }

  // Join movieTitle for convenience
  const movies = db.movies || [];
  const movieMap = new Map(movies.map((m) => [m.id, m.title]));

  return shows.map((show) => ({
    ...show,
    movieTitle: movieMap.get(show.movieId) || 'Unknown Movie'
  }));
}

async function findShowById(id) {
  const db = await readDatabase();
  const show = (db.shows || []).find((s) => s.id === id);
  if (!show) return null;

  const movie = (db.movies || []).find((m) => m.id === show.movieId);
  return {
    ...show,
    movieTitle: movie ? movie.title : 'Unknown Movie'
  };
}

async function addShow(showData) {
  const db = await readDatabase();
  const newShow = {
    id: `shw-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    ...showData
  };
  db.shows.push(newShow);
  await writeDatabase(db);

  const movie = (db.movies || []).find((m) => m.id === newShow.movieId);
  return {
    ...newShow,
    movieTitle: movie ? movie.title : 'Unknown Movie'
  };
}

async function updateShow(id, updateData) {
  const db = await readDatabase();
  const index = db.shows.findIndex((s) => s.id === id);
  if (index === -1) return null;

  db.shows[index] = {
    ...db.shows[index],
    ...updateData,
    id // Ensure ID remains immutable
  };
  await writeDatabase(db);

  const movie = (db.movies || []).find((m) => m.id === db.shows[index].movieId);
  return {
    ...db.shows[index],
    movieTitle: movie ? movie.title : 'Unknown Movie'
  };
}

async function deleteShow(id) {
  const db = await readDatabase();
  const index = db.shows.findIndex((s) => s.id === id);
  if (index === -1) return false;

  db.shows.splice(index, 1);
  await writeDatabase(db);
  return true;
}

// ---------------- BOOKING OPERATIONS ----------------
async function getBookings(userId = null) {
  const db = await readDatabase();
  let bookings = db.bookings || [];
  if (userId) {
    bookings = bookings.filter((b) => b.userId === userId);
  }
  return bookings;
}

async function findBookingById(id) {
  const db = await readDatabase();
  return (db.bookings || []).find((b) => b.id === id) || null;
}

/**
 * Returns set of booked seat numbers for an active show
 * @param {string} showId
 * @returns {Promise<string[]>} List of currently booked seats
 */
async function getBookedSeatsForShow(showId) {
  const db = await readDatabase();
  const activeBookings = (db.bookings || []).filter(
    (b) => b.showId === showId && b.status === 'CONFIRMED'
  );

  const bookedSeats = [];
  for (const booking of activeBookings) {
    if (Array.isArray(booking.seats)) {
      bookedSeats.push(...booking.seats);
    }
  }
  return bookedSeats;
}

async function addBooking(bookingData) {
  const db = await readDatabase();
  const newBooking = {
    id: `bkg-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    status: 'CONFIRMED',
    bookingDate: new Date().toISOString(),
    ...bookingData
  };

  db.bookings.push(newBooking);
  await writeDatabase(db);
  return newBooking;
}

async function cancelBooking(id) {
  const db = await readDatabase();
  const booking = db.bookings.find((b) => b.id === id);
  if (!booking) return null;

  booking.status = 'CANCELLED';
  await writeDatabase(db);
  return booking;
}

async function removeBooking(id) {
  const db = await readDatabase();
  const index = (db.bookings || []).findIndex((b) => b.id === id);
  if (index === -1) return false;

  db.bookings.splice(index, 1);
  await writeDatabase(db);
  return true;
}

module.exports = {
  readDatabase,
  writeDatabase,
  getUsers,
  findUserByEmail,
  findUserById,
  getMovies,
  findMovieById,
  addMovie,
  updateMovie,
  deleteMovie,
  getShows,
  findShowById,
  addShow,
  updateShow,
  deleteShow,
  getBookings,
  findBookingById,
  getBookedSeatsForShow,
  addBooking,
  cancelBooking,
  removeBooking
};
