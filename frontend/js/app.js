/**
 * CineWave - Movie Ticket Booking System
 * Frontend Application Controller
 * Software Engineering & Quality Assurance (SEQA) Post Lab Project
 */

// ==================== APPLICATION STATE ====================
const state = {
  token: localStorage.getItem('cinewave_token') || null,
  user: JSON.parse(localStorage.getItem('cinewave_user') || 'null'),
  movies: [],
  shows: [],
  bookings: [],
  selectedMovie: null,
  selectedShow: null,
  selectedSeats: new Set(),
  activeGenre: 'All',
  searchQuery: '',
  editingMovieId: null,
  editingShowId: null
};

// API Base Endpoint
const API_BASE = '/api';

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  renderUserMenu();
  loadInitialData();
});

/**
 * Attaches all global and view event listeners
 */
function setupEventListeners() {
  // Navigation Logo Click
  document.getElementById('nav-logo').addEventListener('click', () => switchView('view-movies'));

  // Main Navigation Buttons
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const targetView = e.currentTarget.getAttribute('data-target');
      if (targetView === 'view-my-bookings' && !state.user) {
        showToast('Please sign in to view your bookings.', 'info');
        switchView('view-login');
        return;
      }
      if (targetView === 'view-admin' && (!state.user || state.user.role !== 'admin')) {
        showToast('Access denied: Admin role required.', 'error');
        return;
      }
      switchView(targetView);
    });
  });

  // Login Form Submission
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  // Demo Login Buttons
  document.getElementById('btn-demo-admin').addEventListener('click', () => {
    fillLoginForm('admin@cinema.com', 'admin123');
  });
  document.getElementById('btn-demo-user-1').addEventListener('click', () => {
    fillLoginForm('sourish@gmail.com', 'user123');
  });

  // Search and Genre Filter
  const searchInput = document.getElementById('movie-search-input');
  const clearSearchBtn = document.getElementById('clear-search-btn');

  searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.trim();
    if (state.searchQuery) {
      clearSearchBtn.classList.remove('hidden');
    } else {
      clearSearchBtn.classList.add('hidden');
    }
    renderMovies();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    state.searchQuery = '';
    clearSearchBtn.classList.add('hidden');
    renderMovies();
  });

  document.querySelectorAll('.genre-filter-pills .pill').forEach((pill) => {
    pill.addEventListener('click', (e) => {
      document.querySelectorAll('.genre-filter-pills .pill').forEach((p) => p.classList.remove('active'));
      e.currentTarget.classList.add('active');
      state.activeGenre = e.currentTarget.getAttribute('data-genre');
      renderMovies();
    });
  });

  // Refresh Bookings Button
  document.getElementById('refresh-bookings-btn').addEventListener('click', loadBookings);

  // Admin Sub-Tabs
  document.querySelectorAll('.admin-tab').forEach((tab) => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.admin-tab').forEach((t) => t.classList.remove('active'));
      document.querySelectorAll('.admin-tab-pane').forEach((p) => p.classList.remove('active'));

      e.currentTarget.classList.add('active');
      const targetPane = e.currentTarget.getAttribute('data-tab');
      const paneEl = document.getElementById(targetPane);
      if (paneEl) paneEl.classList.add('active');
    });
  });

  // Admin Add Buttons
  document.getElementById('btn-open-add-movie').addEventListener('click', openAddMovieModal);
  document.getElementById('btn-open-add-show').addEventListener('click', openAddShowModal);

  // Admin Forms
  document.getElementById('form-admin-movie').addEventListener('submit', handleSaveMovie);
  document.getElementById('form-admin-show').addEventListener('submit', handleSaveShow);

  // Confirm Seat Booking Button
  document.getElementById('btn-confirm-booking').addEventListener('click', handleCreateBooking);

  // Receipt Modal button to switch to My Bookings
  document.getElementById('btn-receipt-to-bookings').addEventListener('click', () => {
    closeModal('modal-booking-success');
    switchView('view-my-bookings');
  });

  // Generic Modal Close Buttons
  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const modalId = e.currentTarget.getAttribute('data-close');
      closeModal(modalId);
    });
  });

  // Close modals on clicking overlay outside card
  document.querySelectorAll('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal(overlay.id);
      }
    });
  });

  // Escape key closes modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay:not(.hidden)').forEach((modal) => {
        closeModal(modal.id);
      });
    }
  });
}

// ==================== DATA LOADING ====================
async function loadInitialData() {
  await fetchMovies();
  await fetchShows();

  if (state.user) {
    await loadBookings();
    if (state.user.role === 'admin') {
      updateAdminDashboard();
    }
  }
}

async function fetchMovies() {
  try {
    const res = await fetch(`${API_BASE}/movies`);
    const data = await res.json();
    if (data.success) {
      state.movies = data.data;
      renderMovies();
    }
  } catch (err) {
    showToast('Failed to load movies from server.', 'error');
  }
}

async function fetchShows() {
  try {
    const res = await fetch(`${API_BASE}/shows`);
    const data = await res.json();
    if (data.success) {
      state.shows = data.data;
      if (state.user && state.user.role === 'admin') {
        renderAdminShowsTable();
      }
    }
  } catch (err) {
    console.error('Error fetching shows:', err);
  }
}

async function loadBookings() {
  if (!state.user || !state.token) return;

  try {
    const res = await fetch(`${API_BASE}/bookings`, {
      headers: {
        Authorization: `Bearer ${state.token}`
      }
    });
    const data = await res.json();
    if (data.success) {
      state.bookings = data.data;
      renderMyBookings();
      if (state.user.role === 'admin') {
        renderAdminBookingsTable();
        updateAdminKPIs();
      }
    }
  } catch (err) {
    showToast('Failed to load bookings.', 'error');
  }
}

// ==================== AUTHENTICATION LOGIC ====================
function fillLoginForm(email, password) {
  document.getElementById('login-email').value = email;
  document.getElementById('login-password').value = password;
  handleLogin(new Event('submit'));
}

async function handleLogin(e) {
  if (e) e.preventDefault();

  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const emailError = document.getElementById('email-error');
  const passwordError = document.getElementById('password-error');

  emailError.textContent = '';
  passwordError.textContent = '';

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  let hasError = false;
  if (!email) {
    emailError.textContent = 'Please enter your email.';
    hasError = true;
  }
  if (!password) {
    passwordError.textContent = 'Please enter your password.';
    hasError = true;
  }
  if (hasError) return;

  const submitBtn = document.getElementById('btn-submit-login');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...';

  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (data.success) {
      state.token = data.token;
      state.user = data.user;

      localStorage.setItem('cinewave_token', state.token);
      localStorage.setItem('cinewave_user', JSON.stringify(state.user));

      renderUserMenu();
      showToast(`Welcome back, ${state.user.name}!`, 'success');

      await loadBookings();

      if (state.user.role === 'admin') {
        switchView('view-admin');
        updateAdminDashboard();
      } else {
        switchView('view-movies');
      }
    } else {
      showToast(data.error || 'Authentication failed', 'error');
      passwordError.textContent = data.error;
    }
  } catch (err) {
    showToast('Network error during login.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Sign In';
  }
}

function handleLogout() {
  state.token = null;
  state.user = null;
  state.bookings = [];
  localStorage.removeItem('cinewave_token');
  localStorage.removeItem('cinewave_user');

  renderUserMenu();
  showToast('You have been logged out.', 'info');
  switchView('view-movies');
}

function renderUserMenu() {
  const container = document.getElementById('user-menu-area');
  const adminNavBtn = document.getElementById('nav-admin-btn');

  if (state.user) {
    if (state.user.role === 'admin') {
      adminNavBtn.classList.remove('hidden');
    } else {
      adminNavBtn.classList.add('hidden');
    }

    container.innerHTML = `
      <div class="user-badge">
        <i class="fa-solid fa-user-circle"></i>
        <span>${escapeHtml(state.user.name)}</span>
        <span class="user-role-tag ${state.user.role}">${state.user.role}</span>
      </div>
      <button class="btn btn-secondary btn-sm" id="btn-logout" title="Sign Out">
        <i class="fa-solid fa-arrow-right-from-bracket"></i>
      </button>
    `;

    document.getElementById('btn-logout').addEventListener('click', handleLogout);
  } else {
    adminNavBtn.classList.add('hidden');
    container.innerHTML = `
      <button class="btn btn-primary btn-sm" id="btn-header-login">
        <i class="fa-solid fa-right-to-bracket"></i> Sign In
      </button>
    `;

    document.getElementById('btn-header-login').addEventListener('click', () => switchView('view-login'));
  }
}

// ==================== VIEW ROUTING ====================
function switchView(viewId) {
  document.querySelectorAll('.app-view').forEach((view) => {
    view.classList.add('hidden');
  });

  const targetView = document.getElementById(viewId);
  if (targetView) {
    targetView.classList.remove('hidden');
  }

  // Update navigation active states
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-target') === viewId);
  });

  if (viewId === 'view-my-bookings') {
    loadBookings();
  } else if (viewId === 'view-admin') {
    updateAdminDashboard();
  }
}

// ==================== MOVIES CATALOG RENDERING ====================
function renderMovies() {
  const container = document.getElementById('movies-grid-container');
  let filtered = [...state.movies];

  if (state.activeGenre !== 'All') {
    filtered = filtered.filter((m) =>
      m.genre.toLowerCase().includes(state.activeGenre.toLowerCase())
    );
  }

  if (state.searchQuery) {
    const term = state.searchQuery.toLowerCase();
    filtered = filtered.filter(
      (m) =>
        m.title.toLowerCase().includes(term) ||
        m.genre.toLowerCase().includes(term) ||
        m.language.toLowerCase().includes(term)
    );
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <i class="fa-solid fa-film"></i>
        <h3>No movies match your criteria</h3>
        <p>Try adjusting your search or genre filters.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered
    .map(
      (movie) => {
        const movieShows = state.shows.filter((s) => s.movieId === movie.id);
        const hasShows = movieShows.length > 0;
        return `
    <div class="movie-card" data-movie-id="${movie.id}">
      <div class="movie-card-poster-wrap">
        <img src="${escapeHtml(movie.poster)}" alt="${escapeHtml(movie.title)}" onerror="this.src='https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80'" />
        <div class="movie-card-rating">
          <i class="fa-solid fa-star"></i> ${movie.rating}
        </div>
      </div>
      <div class="movie-card-body">
        <div class="movie-card-meta">
          <span title="Language"><i class="fa-solid fa-language"></i> ${escapeHtml(movie.language)}</span>
          <span title="Duration"><i class="fa-regular fa-clock"></i> ${escapeHtml(movie.duration)}</span>
        </div>
        <h3 class="movie-card-title">${escapeHtml(movie.title)}</h3>
        <div class="movie-card-genre"><i class="fa-solid fa-film"></i> ${escapeHtml(movie.genre)}</div>
        <div class="movie-card-shows-badge ${hasShows ? 'has-shows' : 'no-shows'}">
          ${hasShows ? `<i class="fa-solid fa-calendar-check"></i> ${movieShows.length} Show${movieShows.length > 1 ? 's' : ''} Available` : '<i class="fa-regular fa-calendar-xmark"></i> No Shows Scheduled'}
        </div>
        <p class="movie-card-desc">${escapeHtml(movie.description)}</p>
        <div class="movie-card-footer">
          <button class="btn btn-primary btn-block btn-book-movie" data-id="${movie.id}">
            <i class="fa-solid fa-ticket"></i> View Shows & Book
          </button>
        </div>
      </div>
    </div>
  `;
      }
    )
    .join('');

  // Attach card click handlers
  container.querySelectorAll('.btn-book-movie').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const movieId = e.currentTarget.getAttribute('data-id');
      openMovieDetails(movieId);
    });
  });
}

// ==================== MOVIE DETAILS & SHOWS SELECTION ====================
async function openMovieDetails(movieId) {
  const movie = state.movies.find((m) => m.id === movieId);
  if (!movie) return;

  state.selectedMovie = movie;

  document.getElementById('modal-movie-title').textContent = movie.title;
  document.getElementById('modal-movie-genre').textContent = movie.genre;
  document.getElementById('modal-movie-lang').textContent = movie.language;
  document.getElementById('modal-movie-duration').textContent = movie.duration;
  document.getElementById('modal-movie-rating').textContent = movie.rating;
  document.getElementById('modal-movie-desc').textContent = movie.description;

  const posterImg = document.getElementById('modal-movie-poster');
  posterImg.src = movie.poster;
  posterImg.onerror = () => {
    posterImg.src = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80';
  };

  // Fetch available shows for this movie
  const showsContainer = document.getElementById('modal-shows-container');
  showsContainer.innerHTML = '<p class="text-muted"><i class="fa-solid fa-spinner fa-spin"></i> Loading showtimes...</p>';

  openModal('modal-movie-details');

  try {
    const res = await fetch(`${API_BASE}/shows?movieId=${movieId}`);
    const data = await res.json();

    if (data.success && data.data.length > 0) {
      showsContainer.innerHTML = data.data
        .map(
          (show) => `
        <div class="show-item-card">
          <div class="show-item-left">
            <div class="show-time-badge">
              <i class="fa-solid fa-clock"></i> ${escapeHtml(show.time)}
            </div>
            <div class="show-item-meta">
              <div class="show-screen-title"><i class="fa-solid fa-tv"></i> ${escapeHtml(show.screen)}</div>
              <div class="show-date-text"><i class="fa-regular fa-calendar-days"></i> ${formatDate(show.date)}</div>
            </div>
          </div>
          <div class="show-item-price-action">
            <div class="show-price-block">
              <span class="price-subtitle">Price</span>
              <span class="show-price-tag">₹${show.ticketPrice}</span>
            </div>
            <button class="btn btn-primary btn-sm btn-select-show" data-show-id="${show.id}">
              Select Seats <i class="fa-solid fa-chevron-right" style="font-size: 0.75rem;"></i>
            </button>
          </div>
        </div>
      `
        )
        .join('');

      showsContainer.querySelectorAll('.btn-select-show').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const showId = e.currentTarget.getAttribute('data-show-id');
          closeModal('modal-movie-details');
          openSeatSelector(showId);
        });
      });
    } else {
      showsContainer.innerHTML = `
        <div class="empty-state" style="padding: 1.5rem 0;">
          <i class="fa-solid fa-calendar-xmark" style="font-size: 2rem;"></i>
          <p>No active shows currently scheduled for this movie.</p>
        </div>
      `;
    }
  } catch (err) {
    showsContainer.innerHTML = '<p class="text-muted">Error loading shows.</p>';
  }
}

// ==================== INTERACTIVE SEAT SELECTION ====================
async function openSeatSelector(showId) {
  state.selectedSeats.clear();
  updateSeatSummary();

  const modal = document.getElementById('modal-seat-selector');
  const seatMap = document.getElementById('seat-map-container');
  seatMap.innerHTML = '<p class="text-muted"><i class="fa-solid fa-spinner fa-spin"></i> Loading seat layout...</p>';

  openModal('modal-seat-selector');

  try {
    const res = await fetch(`${API_BASE}/shows/${showId}`);
    const data = await res.json();

    if (!data.success) {
      showToast(data.error || 'Failed to fetch show information.', 'error');
      closeModal('modal-seat-selector');
      return;
    }

    state.selectedShow = data.data;

    document.getElementById('seat-modal-movie-title').textContent = state.selectedShow.movieTitle;
    document.getElementById('seat-modal-show-info').textContent = `${state.selectedShow.screen} • ${formatDate(state.selectedShow.date)} • ${state.selectedShow.time}`;
    document.getElementById('seat-modal-price').textContent = `₹${state.selectedShow.ticketPrice}`;

    renderSeatMap(state.selectedShow.bookedSeats || []);
  } catch (err) {
    showToast('Failed to load seat layout.', 'error');
    closeModal('modal-seat-selector');
  }
}

/**
 * Renders theater seating rows: Rows A through E, Seats 1 to 8 (40 Seats)
 * With aisle gap between seats 4 and 5
 */
function renderSeatMap(bookedSeats) {
  const container = document.getElementById('seat-map-container');
  const rows = ['A', 'B', 'C', 'D', 'E'];
  const cols = [1, 2, 3, 4, 5, 6, 7, 8];

  const bookedSet = new Set(bookedSeats);

  let html = '';
  rows.forEach((row) => {
    html += `<div class="seat-row">`;
    html += `<span class="seat-row-label">${row}</span>`;
    html += `<div class="seat-row-seats">`;

    cols.forEach((col) => {
      if (col === 5) {
        html += `<div class="seat-aisle-gap"></div>`;
      }

      const seatId = `${row}${col}`;
      const isBooked = bookedSet.has(seatId);
      const isSelected = state.selectedSeats.has(seatId);

      let seatClass = 'seat-btn available';
      let disabledAttr = '';

      if (isBooked) {
        seatClass = 'seat-btn booked';
        disabledAttr = 'disabled title="Seat already booked"';
      } else if (isSelected) {
        seatClass = 'seat-btn selected';
      }

      html += `<button type="button" class="${seatClass}" data-seat="${seatId}" ${disabledAttr}>${col}</button>`;
    });

    html += `</div>`;
    html += `<span class="seat-row-label">${row}</span>`;
    html += `</div>`;
  });

  container.innerHTML = html;

  // Attach seat toggle events
  container.querySelectorAll('.seat-btn.available, .seat-btn.selected').forEach((seatBtn) => {
    seatBtn.addEventListener('click', (e) => {
      const seatId = e.currentTarget.getAttribute('data-seat');
      toggleSeat(seatId, e.currentTarget);
    });
  });
}

function toggleSeat(seatId, btnEl) {
  if (state.selectedSeats.has(seatId)) {
    state.selectedSeats.delete(seatId);
    btnEl.classList.remove('selected');
    btnEl.classList.add('available');
  } else {
    // Optional seat limit (e.g. max 8 per booking)
    if (state.selectedSeats.size >= 8) {
      showToast('You can select a maximum of 8 seats per booking.', 'info');
      return;
    }
    state.selectedSeats.add(seatId);
    btnEl.classList.remove('available');
    btnEl.classList.add('selected');
  }
  updateSeatSummary();
}

function updateSeatSummary() {
  const seatsArray = Array.from(state.selectedSeats).sort();
  const count = seatsArray.length;
  const price = state.selectedShow ? Number(state.selectedShow.ticketPrice) : 0;
  const total = count * price;

  const seatsListEl = document.getElementById('selected-seats-list');
  const seatsCountEl = document.getElementById('selected-seats-count');
  const seatsTotalEl = document.getElementById('selected-seats-total');
  const confirmBtn = document.getElementById('btn-confirm-booking');
  const hintEl = document.getElementById('seat-selection-hint');

  seatsListEl.textContent = count > 0 ? seatsArray.join(', ') : 'None';
  seatsCountEl.textContent = count;
  seatsTotalEl.textContent = `₹${total}`;

  if (hintEl) {
    if (count === 0) {
      hintEl.innerHTML = '<i class="fa-solid fa-circle-info"></i> Please select at least 1 available seat to book.';
      hintEl.className = 'seat-selection-hint text-muted';
    } else {
      hintEl.innerHTML = `<i class="fa-solid fa-circle-check text-success"></i> Selected ${count} seat(s): <strong>${seatsArray.join(', ')}</strong>`;
      hintEl.className = 'seat-selection-hint text-success';
    }
  }

  confirmBtn.disabled = count === 0;
}

// ==================== TICKET BOOKING & CONFIRMATION ====================
async function handleCreateBooking() {
  if (!state.selectedMovie) {
    showToast('Please select a movie before proceeding to booking.', 'error');
    return;
  }

  if (!state.selectedShow || !state.selectedShow.id) {
    showToast('Please select a showtime before choosing your seats.', 'error');
    return;
  }

  if (!state.selectedSeats || state.selectedSeats.size === 0) {
    showToast('Please select at least one seat from the auditorium layout before booking.', 'error');
    const hintEl = document.getElementById('seat-selection-hint');
    if (hintEl) {
      hintEl.className = 'seat-selection-hint text-danger';
      hintEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Action required: Please select at least 1 seat!';
    }
    return;
  }

  if (!state.user || !state.token) {
    showToast('Please sign in to proceed with booking your selected seats.', 'info');
    closeModal('modal-seat-selector');
    switchView('view-login');
    return;
  }

  const confirmBtn = document.getElementById('btn-confirm-booking');
  confirmBtn.disabled = true;
  confirmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing Booking...';

  const payload = {
    showId: state.selectedShow.id,
    seats: Array.from(state.selectedSeats)
  };

  try {
    const res = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${state.token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (data.success) {
      closeModal('modal-seat-selector');
      showBookingReceipt(data.data);
      showToast(`🎉 Booking Confirmed! "${data.data.movieTitle}" at ${data.data.showTime} | Seat(s): ${data.data.seats.join(', ')}`, 'success');
      state.selectedSeats.clear();
      await loadBookings();
    } else {
      showToast(data.error || 'Failed to book tickets.', 'error');
      // Re-fetch current seats if collision occurred
      if (data.conflictingSeats) {
        await openSeatSelector(state.selectedShow.id);
      }
    }
  } catch (err) {
    showToast('Network error during booking.', 'error');
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = '<i class="fa-solid fa-lock"></i> Book Tickets';
  }
}

function showBookingReceipt(booking) {
  document.getElementById('receipt-movie-title').textContent = booking.movieTitle;
  document.getElementById('receipt-screen').textContent = booking.screen;
  document.getElementById('receipt-booking-id').textContent = booking.id;
  document.getElementById('receipt-customer').textContent = booking.userName;
  document.getElementById('receipt-date').textContent = formatDate(booking.showDate);
  document.getElementById('receipt-time').textContent = booking.showTime;
  document.getElementById('receipt-seats').textContent = booking.seats.join(', ');
  document.getElementById('receipt-total').textContent = `₹${booking.totalAmount}`;
  document.getElementById('receipt-barcode-code').textContent = `WAVE-${booking.id.toUpperCase()}-SEQA`;

  const summaryMovie = document.getElementById('receipt-summary-movie');
  if (summaryMovie) summaryMovie.textContent = booking.movieTitle;

  const summaryTiming = document.getElementById('receipt-summary-timing');
  if (summaryTiming) summaryTiming.textContent = `${booking.showTime} (${formatDate(booking.showDate)})`;

  const confirmationSummary = document.getElementById('receipt-confirmation-summary');
  if (confirmationSummary) {
    confirmationSummary.textContent = `Confirmed for "${booking.movieTitle}" at ${booking.showTime} • Seat(s): ${booking.seats.join(', ')}`;
  }

  openModal('modal-booking-success');
}

// ==================== USER'S "MY BOOKINGS" ====================
function renderMyBookings() {
  const container = document.getElementById('my-bookings-container');
  if (!state.bookings || state.bookings.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-ticket"></i>
        <h3>No bookings yet</h3>
        <p>You haven't made any ticket reservations. Explore our movies to book your next show!</p>
        <button class="btn btn-primary" style="margin-top: 1rem;" onclick="switchView('view-movies')">
          Browse Movies
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = state.bookings
    .map((b) => {
      const isCancelled = b.status === 'CANCELLED';
      const movie = state.movies.find((m) => m.id === b.movieId);
      const posterSrc = movie && movie.poster ? movie.poster : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=100&q=80';
      const seatsHtml = (b.seats || []).map((seat) => `<span class="seat-chip">${escapeHtml(seat)}</span>`).join('');
      const unitPrice = b.ticketPrice || Math.round(b.totalAmount / (b.seats.length || 1));

      return `
      <div class="booking-ticket-card ${isCancelled ? 'status-cancelled' : 'status-confirmed'}">
        <div class="booking-ticket-info">
          <img src="${escapeHtml(posterSrc)}" alt="${escapeHtml(b.movieTitle)}" class="booking-thumb" onerror="this.src='https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=100&q=80'" />
          <div class="booking-details">
            <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.35rem;">
              <span class="booking-id-tag">#${escapeHtml(b.id)}</span>
              <h3 style="margin-bottom: 0;">${escapeHtml(b.movieTitle)}</h3>
            </div>
            <div class="booking-meta-grid">
              <span class="booking-meta-badge"><i class="fa-solid fa-tv"></i> ${escapeHtml(b.screen)}</span>
              <span class="booking-meta-badge"><i class="fa-regular fa-calendar-days"></i> ${formatDate(b.showDate)}</span>
              <span class="booking-meta-badge time-badge"><i class="fa-solid fa-clock"></i> ${escapeHtml(b.showTime)}</span>
            </div>
            <div style="margin-top: 0.5rem; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
              <span style="font-size: 0.82rem; color: var(--text-secondary);"><i class="fa-solid fa-chair"></i> Seats (${b.seats.length}):</span>
              ${seatsHtml}
            </div>
            <div class="booking-booked-date">
              <i class="fa-regular fa-clock"></i> Booked on ${formatDate(b.bookingDate)}
            </div>
          </div>
        </div>

        <div class="booking-right">
          <span class="status-pill ${isCancelled ? 'cancelled' : 'confirmed'}">
            ${isCancelled ? '<i class="fa-solid fa-ban"></i> CANCELLED' : '<i class="fa-solid fa-circle-check"></i> CONFIRMED'}
          </span>
          <div class="booking-price-line">
            <span class="booking-price-sub">${b.seats.length} × ₹${unitPrice}</span>
            <div style="font-size: 1.25rem; font-weight: 800; color: var(--accent-gold);">
              ₹${b.totalAmount}
            </div>
          </div>
          ${
            !isCancelled
              ? `<button class="btn btn-danger btn-sm btn-cancel-booking" data-id="${b.id}" title="Cancel reservation and release seats">
                  <i class="fa-solid fa-xmark"></i> Cancel Booking
                </button>`
              : '<span class="text-muted" style="font-size: 0.8rem;"><i class="fa-solid fa-rotate-left"></i> Seats released</span>'
          }
        </div>
      </div>
    `;
    })
    .join('');

  // Attach cancellation handlers
  container.querySelectorAll('.btn-cancel-booking').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const bookingId = e.currentTarget.getAttribute('data-id');
      handleCancelBooking(bookingId);
    });
  });
}

async function handleCancelBooking(bookingId) {
  if (!confirm(`Are you sure you want to cancel booking #${bookingId}? Reserved seats will be released immediately.`)) {
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/bookings/${bookingId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${state.token}`
      }
    });

    const data = await res.json();
    if (data.success) {
      showToast('Booking cancelled successfully and seats released.', 'success');
      await loadBookings();
      await fetchShows(); // Refresh show booked seats
    } else {
      showToast(data.error || 'Failed to cancel booking.', 'error');
    }
  } catch (err) {
    showToast('Network error while cancelling booking.', 'error');
  }
}

// ==================== ADMIN DASHBOARD LOGIC ====================
function updateAdminDashboard() {
  if (!state.user || state.user.role !== 'admin') return;
  updateAdminKPIs();
  renderAdminMoviesTable();
  renderAdminShowsTable();
  renderAdminBookingsTable();
}

function updateAdminKPIs() {
  document.getElementById('kpi-movies-count').textContent = state.movies.length;
  document.getElementById('kpi-shows-count').textContent = state.shows.length;
  document.getElementById('kpi-bookings-count').textContent = state.bookings.length;

  const revenue = state.bookings
    .filter((b) => b.status === 'CONFIRMED')
    .reduce((sum, b) => sum + Number(b.totalAmount || 0), 0);

  document.getElementById('kpi-revenue-count').textContent = `₹${revenue.toLocaleString()}`;
}

function renderAdminMoviesTable() {
  const tbody = document.getElementById('admin-movies-tbody');
  if (!tbody) return;

  if (state.movies.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-muted" style="text-align:center; padding: 2rem;">No movies in database.</td></tr>`;
    return;
  }

  tbody.innerHTML = state.movies
    .map(
      (m) => `
    <tr>
      <td><img src="${escapeHtml(m.poster)}" class="table-thumb" alt="Poster" onerror="this.src='https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=100&q=80'" /></td>
      <td><strong>${escapeHtml(m.title)}</strong></td>
      <td>${escapeHtml(m.genre)}</td>
      <td>${escapeHtml(m.duration)}</td>
      <td>${escapeHtml(m.language)}</td>
      <td><span class="rating-badge"><i class="fa-solid fa-star"></i> ${m.rating}</span></td>
      <td>
        <div class="table-actions">
          <button class="btn btn-secondary btn-sm btn-edit-movie" data-id="${m.id}" title="Edit Movie">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="btn btn-danger btn-sm btn-delete-movie" data-id="${m.id}" title="Delete Movie">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `
    )
    .join('');

  tbody.querySelectorAll('.btn-edit-movie').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      openEditMovieModal(id);
    });
  });

  tbody.querySelectorAll('.btn-delete-movie').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      handleDeleteMovie(id);
    });
  });
}

function renderAdminShowsTable() {
  const tbody = document.getElementById('admin-shows-tbody');
  if (!tbody) return;

  if (state.shows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-muted" style="text-align:center; padding: 2rem;">No shows scheduled.</td></tr>`;
    return;
  }

  tbody.innerHTML = state.shows
    .map(
      (s) => `
    <tr>
      <td><strong>${escapeHtml(s.movieTitle || 'Unknown Movie')}</strong></td>
      <td>${escapeHtml(s.screen)}</td>
      <td>${formatDate(s.date)}</td>
      <td>${escapeHtml(s.time)}</td>
      <td><strong class="text-success">₹${s.ticketPrice}</strong></td>
      <td>
        <div class="table-actions">
          <button class="btn btn-secondary btn-sm btn-edit-show" data-id="${s.id}" title="Edit Show">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="btn btn-danger btn-sm btn-delete-show" data-id="${s.id}" title="Delete Show">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `
    )
    .join('');

  tbody.querySelectorAll('.btn-edit-show').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      openEditShowModal(id);
    });
  });

  tbody.querySelectorAll('.btn-delete-show').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      handleDeleteShow(id);
    });
  });
}

function renderAdminBookingsTable() {
  const tbody = document.getElementById('admin-bookings-tbody');
  if (!tbody) return;

  if (state.bookings.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-muted" style="text-align:center; padding: 2rem;">No bookings found.</td></tr>`;
    return;
  }

  tbody.innerHTML = state.bookings
    .map((b) => {
      const isCancelled = b.status === 'CANCELLED';
      return `
    <tr>
      <td><code>#${escapeHtml(b.id)}</code></td>
      <td>
        <strong>${escapeHtml(b.userName)}</strong><br>
        <span class="text-muted" style="font-size: 0.8rem;">${escapeHtml(b.userEmail)}</span>
      </td>
      <td>
        <strong>${escapeHtml(b.movieTitle)}</strong><br>
        <span class="text-muted" style="font-size: 0.8rem;">${escapeHtml(b.screen)}</span>
      </td>
      <td>${formatDate(b.showDate)} • ${escapeHtml(b.showTime)}</td>
      <td>${(b.seats || []).map(s => `<span class="seat-chip" style="font-size: 0.72rem; padding: 1px 6px;">${escapeHtml(s)}</span>`).join('')}</td>
      <td><strong>₹${b.totalAmount}</strong></td>
      <td>
        <span class="status-pill ${isCancelled ? 'cancelled' : 'confirmed'}">
          ${isCancelled ? 'CANCELLED' : 'CONFIRMED'}
        </span>
      </td>
      <td>
        ${
          !isCancelled
            ? `<button class="btn btn-danger btn-sm btn-admin-cancel-bkg" data-id="${b.id}" title="Cancel & Release Seats">
                <i class="fa-solid fa-ban"></i>
              </button>`
            : '<span class="text-muted">-</span>'
        }
      </td>
    </tr>
  `;
    })
    .join('');

  tbody.querySelectorAll('.btn-admin-cancel-bkg').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      handleCancelBooking(id);
    });
  });
}

// ==================== MOVIE CRUD MODAL HANDLERS ====================
function openAddMovieModal() {
  state.editingMovieId = null;
  document.getElementById('modal-admin-movie-title').innerHTML = '<i class="fa-solid fa-film"></i> Add New Movie';
  document.getElementById('form-admin-movie').reset();
  document.getElementById('movie-form-id').value = '';
  openModal('modal-admin-movie');
}

function openEditMovieModal(id) {
  const movie = state.movies.find((m) => m.id === id);
  if (!movie) return;

  state.editingMovieId = id;
  document.getElementById('modal-admin-movie-title').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Edit Movie';
  document.getElementById('movie-form-id').value = movie.id;
  document.getElementById('movie-form-title').value = movie.title;
  document.getElementById('movie-form-genre').value = movie.genre;
  document.getElementById('movie-form-duration').value = movie.duration;
  document.getElementById('movie-form-lang').value = movie.language;
  document.getElementById('movie-form-rating').value = movie.rating;
  document.getElementById('movie-form-poster').value = movie.poster;
  document.getElementById('movie-form-desc').value = movie.description;

  openModal('modal-admin-movie');
}

async function handleSaveMovie(e) {
  e.preventDefault();

  const id = document.getElementById('movie-form-id').value;
  const payload = {
    title: document.getElementById('movie-form-title').value.trim(),
    genre: document.getElementById('movie-form-genre').value.trim(),
    duration: document.getElementById('movie-form-duration').value.trim(),
    language: document.getElementById('movie-form-lang').value.trim(),
    rating: parseFloat(document.getElementById('movie-form-rating').value),
    poster: document.getElementById('movie-form-poster').value.trim(),
    description: document.getElementById('movie-form-desc').value.trim()
  };

  const isEdit = Boolean(id);
  const url = isEdit ? `${API_BASE}/movies/${id}` : `${API_BASE}/movies`;
  const method = isEdit ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${state.token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
      showToast(isEdit ? 'Movie updated successfully!' : 'Movie added successfully!', 'success');
      closeModal('modal-admin-movie');
      await fetchMovies();
      updateAdminDashboard();
    } else {
      showToast(data.error || 'Failed to save movie.', 'error');
    }
  } catch (err) {
    showToast('Network error while saving movie.', 'error');
  }
}

async function handleDeleteMovie(id) {
  if (!confirm('Are you sure you want to delete this movie? All scheduled shows for this movie will also be removed.')) {
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/movies/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${state.token}`
      }
    });

    const data = await res.json();
    if (data.success) {
      showToast('Movie deleted successfully.', 'success');
      await fetchMovies();
      await fetchShows();
      updateAdminDashboard();
    } else {
      showToast(data.error || 'Failed to delete movie.', 'error');
    }
  } catch (err) {
    showToast('Network error while deleting movie.', 'error');
  }
}

// ==================== SHOW CRUD MODAL HANDLERS ====================
function openAddShowModal() {
  state.editingShowId = null;
  document.getElementById('modal-admin-show-title').innerHTML = '<i class="fa-solid fa-calendar-plus"></i> Add New Show';
  document.getElementById('form-admin-show').reset();
  document.getElementById('show-form-id').value = '';

  // Set default date to today
  document.getElementById('show-form-date').value = new Date().toISOString().split('T')[0];

  populateMovieDropdown();
  openModal('modal-admin-show');
}

function openEditShowModal(id) {
  const show = state.shows.find((s) => s.id === id);
  if (!show) return;

  state.editingShowId = id;
  document.getElementById('modal-admin-show-title').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Edit Show';
  populateMovieDropdown(show.movieId);

  document.getElementById('show-form-id').value = show.id;
  document.getElementById('show-form-screen').value = show.screen;
  document.getElementById('show-form-date').value = show.date;
  document.getElementById('show-form-time').value = show.time;
  document.getElementById('show-form-price').value = show.ticketPrice;

  openModal('modal-admin-show');
}

function populateMovieDropdown(selectedMovieId = null) {
  const select = document.getElementById('show-form-movie');
  select.innerHTML = '<option value="">-- Choose a Movie --</option>';

  state.movies.forEach((m) => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = `${m.title} (${m.language})`;
    if (selectedMovieId && m.id === selectedMovieId) {
      opt.selected = true;
    }
    select.appendChild(opt);
  });
}

async function handleSaveShow(e) {
  e.preventDefault();

  const id = document.getElementById('show-form-id').value;
  const payload = {
    movieId: document.getElementById('show-form-movie').value,
    screen: document.getElementById('show-form-screen').value,
    date: document.getElementById('show-form-date').value,
    time: document.getElementById('show-form-time').value.trim(),
    ticketPrice: parseFloat(document.getElementById('show-form-price').value)
  };

  const isEdit = Boolean(id);
  const url = isEdit ? `${API_BASE}/shows/${id}` : `${API_BASE}/shows`;
  const method = isEdit ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${state.token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
      showToast(isEdit ? 'Show updated successfully!' : 'Show scheduled successfully!', 'success');
      closeModal('modal-admin-show');
      await fetchShows();
      updateAdminDashboard();
    } else {
      showToast(data.error || 'Failed to save show.', 'error');
    }
  } catch (err) {
    showToast('Network error while saving show.', 'error');
  }
}

async function handleDeleteShow(id) {
  if (!confirm('Are you sure you want to delete this show?')) {
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/shows/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${state.token}`
      }
    });

    const data = await res.json();
    if (data.success) {
      showToast('Show deleted successfully.', 'success');
      await fetchShows();
      updateAdminDashboard();
    } else {
      showToast(data.error || 'Failed to delete show.', 'error');
    }
  } catch (err) {
    showToast('Network error while deleting show.', 'error');
  }
}

// ==================== MODAL HELPER FUNCTIONS ====================
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
}

// ==================== TOAST SYSTEM ====================
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let icon = 'fa-info-circle';
  if (type === 'success') icon = 'fa-circle-check';
  if (type === 'error') icon = 'fa-circle-exclamation';

  toast.innerHTML = `
    <i class="fa-solid ${icon} toast-icon-${type}"></i>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ==================== UTILITY FORMATTERS ====================
function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? dateStr : date.toLocaleDateString('en-US', options);
  } catch (e) {
    return dateStr;
  }
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
