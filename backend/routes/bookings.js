const express = require('express');
const router = express.Router();
const {
  getBookings,
  findBookingById,
  addBooking,
  cancelBooking,
  findShowById,
  findMovieById,
  getBookedSeatsForShow
} = require('../db');
const { authenticate } = require('../middleware/auth');

/**
 * Validates seat format (e.g. A1 through H8)
 * @param {string} seat
 * @returns {boolean}
 */
function isValidSeatFormat(seat) {
  return typeof seat === 'string' && /^[A-H][1-8]$/.test(seat.trim());
}

/**
 * @route   GET /api/bookings
 * @desc    Fetch bookings (Admin gets all, regular user gets own bookings)
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { showId } = req.query;
    let bookings = [];

    if (req.user.role === 'admin') {
      bookings = await getBookings();
    } else {
      bookings = await getBookings(req.user.id);
    }

    if (showId) {
      bookings = bookings.filter((b) => b.showId === showId);
    }

    // Sort latest first
    bookings.sort((a, b) => new Date(b.bookingDate) - new Date(a.bookingDate));

    return res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve bookings.'
    });
  }
});

/**
 * @route   POST /api/bookings
 * @desc    Create a new ticket booking
 * @access  Private
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { showId, seats } = req.body;

    // 1. Basic field presence validation
    if (!showId || typeof showId !== 'string' || !showId.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Please select a valid showtime before attempting to book.'
      });
    }

    if (!seats || !Array.isArray(seats) || seats.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please select at least one seat from the auditorium layout before booking.'
      });
    }

    // Normalize and sanitize seats
    const normalizedSeats = seats.map((s) => String(s).trim().toUpperCase());

    // Check for internal duplicates in request
    const uniqueRequestedSeats = new Set(normalizedSeats);
    if (uniqueRequestedSeats.size !== normalizedSeats.length) {
      return res.status(400).json({
        success: false,
        error: 'Duplicate seats detected in your booking selection. Please choose unique seats.'
      });
    }

    // Check seat format
    for (const seat of normalizedSeats) {
      if (!isValidSeatFormat(seat)) {
        return res.status(400).json({
          success: false,
          error: `Invalid seat code "${seat}". Seats must be valid coordinates between A1 and H8.`
        });
      }
    }

    // 2. Validate Show existence
    const show = await findShowById(showId);
    if (!show) {
      return res.status(404).json({
        success: false,
        error: `The selected showtime is no longer available. Please choose another show.`
      });
    }

    // 3. Validate Movie existence
    const movie = await findMovieById(show.movieId);
    if (!movie) {
      return res.status(404).json({
        success: false,
        error: 'The movie associated with this show could not be found. Please choose an available movie.'
      });
    }

    // 4. Concurrency & Seat Collision Check
    const alreadyBookedSeats = await getBookedSeatsForShow(showId);
    const conflictingSeats = normalizedSeats.filter((seat) =>
      alreadyBookedSeats.includes(seat)
    );

    if (conflictingSeats.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Seat(s) ${conflictingSeats.join(', ')} are already booked. Please choose other seats.`,
        conflictingSeats
      });
    }

    // 5. Server-side amount calculation
    const ticketPrice = Number(show.ticketPrice);
    const totalAmount = ticketPrice * normalizedSeats.length;

    // 6. Persist booking
    const bookingPayload = {
      userId: req.user.id,
      userName: req.user.name,
      userEmail: req.user.email,
      movieId: show.movieId,
      movieTitle: movie.title,
      showId: show.id,
      screen: show.screen,
      showDate: show.date,
      showTime: show.time,
      seats: normalizedSeats,
      seatCount: normalizedSeats.length,
      ticketPrice,
      totalAmount
    };

    const newBooking = await addBooking(bookingPayload);

    return res.status(201).json({
      success: true,
      message: `Booking confirmed for "${movie.title}" at ${show.time}. Seat(s): ${normalizedSeats.join(', ')}.`,
      data: newBooking
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process ticket booking.'
    });
  }
});

/**
 * @route   DELETE /api/bookings/:id
 * @desc    Cancel a booking and release its seats
 * @access  Private
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const booking = await findBookingById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: `Booking with ID "${req.params.id}" does not exist.`
      });
    }

    // Authorization check: only booking owner or admin can cancel
    if (req.user.role !== 'admin' && booking.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden. You are not authorized to cancel another user\'s booking.'
      });
    }

    if (booking.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        error: 'This booking has already been cancelled.'
      });
    }

    const updated = await cancelBooking(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully. Reserved seats have been released.',
      data: updated
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to cancel booking.'
    });
  }
});

module.exports = router;
