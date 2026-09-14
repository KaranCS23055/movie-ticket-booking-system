const express = require('express');
const router = express.Router();
const {
  getShows,
  findShowById,
  addShow,
  updateShow,
  deleteShow,
  findMovieById,
  getBookedSeatsForShow
} = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

/**
 * Validates show payload fields
 * @param {Object} body
 * @returns {string|null} error message or null if valid
 */
async function validateShowPayload(body) {
  const { movieId, screen, date, time, ticketPrice } = body;

  if (!movieId || typeof movieId !== 'string') {
    return 'Valid movieId is required.';
  }

  const movie = await findMovieById(movieId);
  if (!movie) {
    return `Referenced movie with ID "${movieId}" does not exist.`;
  }

  if (!screen || typeof screen !== 'string' || !screen.trim()) {
    return 'Screen name/type is required.';
  }

  if (!date || typeof date !== 'string' || !date.trim()) {
    return 'Show date is required.';
  }

  if (!time || typeof time !== 'string' || !time.trim()) {
    return 'Show time is required.';
  }

  if (ticketPrice === undefined || ticketPrice === null || isNaN(Number(ticketPrice)) || Number(ticketPrice) <= 0) {
    return 'A positive ticketPrice number is required.';
  }

  return null;
}

/**
 * @route   GET /api/shows
 * @desc    Fetch shows, optionally filtered by ?movieId=
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { movieId } = req.query;
    const shows = await getShows(movieId);

    return res.status(200).json({
      success: true,
      count: shows.length,
      data: shows
    });
  } catch (error) {
    console.error('Error fetching shows:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve shows.'
    });
  }
});

/**
 * @route   GET /api/shows/:id
 * @desc    Fetch show details along with currently booked seats
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const show = await findShowById(req.params.id);
    if (!show) {
      return res.status(404).json({
        success: false,
        error: `Show with ID "${req.params.id}" was not found.`
      });
    }

    const bookedSeats = await getBookedSeatsForShow(show.id);

    return res.status(200).json({
      success: true,
      data: {
        ...show,
        bookedSeats
      }
    });
  } catch (error) {
    console.error('Error fetching show details:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve show details.'
    });
  }
});

/**
 * @route   POST /api/shows
 * @desc    Create a new show
 * @access  Private (Admin only)
 */
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const validationError = await validateShowPayload(req.body);
    if (validationError) {
      return res.status(400).json({
        success: false,
        error: validationError
      });
    }

    const showData = {
      movieId: req.body.movieId,
      screen: req.body.screen.trim(),
      date: req.body.date.trim(),
      time: req.body.time.trim(),
      ticketPrice: Number(req.body.ticketPrice),
      totalSeats: req.body.totalSeats ? Number(req.body.totalSeats) : 40
    };

    const createdShow = await addShow(showData);
    return res.status(201).json({
      success: true,
      message: 'Show created successfully.',
      data: createdShow
    });
  } catch (error) {
    console.error('Error creating show:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create show record.'
    });
  }
});

/**
 * @route   PUT /api/shows/:id
 * @desc    Update an existing show
 * @access  Private (Admin only)
 */
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const existing = await findShowById(req.params.id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: `Show with ID "${req.params.id}" does not exist.`
      });
    }

    const validationError = await validateShowPayload(req.body);
    if (validationError) {
      return res.status(400).json({
        success: false,
        error: validationError
      });
    }

    const updateData = {
      movieId: req.body.movieId,
      screen: req.body.screen.trim(),
      date: req.body.date.trim(),
      time: req.body.time.trim(),
      ticketPrice: Number(req.body.ticketPrice),
      totalSeats: req.body.totalSeats ? Number(req.body.totalSeats) : existing.totalSeats || 40
    };

    const updatedShow = await updateShow(req.params.id, updateData);
    return res.status(200).json({
      success: true,
      message: 'Show updated successfully.',
      data: updatedShow
    });
  } catch (error) {
    console.error('Error updating show:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update show.'
    });
  }
});

/**
 * @route   DELETE /api/shows/:id
 * @desc    Delete a show
 * @access  Private (Admin only)
 */
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const deleted = await deleteShow(req.params.id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: `Show with ID "${req.params.id}" does not exist.`
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Show deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting show:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete show.'
    });
  }
});

module.exports = router;
