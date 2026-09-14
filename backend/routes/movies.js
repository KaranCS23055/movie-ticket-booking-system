const express = require('express');
const router = express.Router();
const {
  getMovies,
  findMovieById,
  addMovie,
  updateMovie,
  deleteMovie
} = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

/**
 * Validates movie payload fields
 * @param {Object} body
 * @returns {string|null} error message or null if valid
 */
function validateMoviePayload(body) {
  const { title, genre, duration, language, rating, description } = body;
  if (!title || typeof title !== 'string' || !title.trim()) {
    return 'Movie title is required.';
  }
  if (!genre || typeof genre !== 'string' || !genre.trim()) {
    return 'Movie genre is required.';
  }
  if (!duration || typeof duration !== 'string' || !duration.trim()) {
    return 'Movie duration is required (e.g. "150 min").';
  }
  if (!language || typeof language !== 'string' || !language.trim()) {
    return 'Movie language is required.';
  }
  if (rating === undefined || rating === null || isNaN(Number(rating)) || Number(rating) < 0 || Number(rating) > 10) {
    return 'Valid rating between 0 and 10 is required.';
  }
  if (!description || typeof description !== 'string' || !description.trim()) {
    return 'Movie description is required.';
  }
  return null;
}

/**
 * @route   GET /api/movies
 * @desc    Fetch all movies (supports optional ?genre= or ?search=)
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    let movies = await getMovies();
    const { genre, search } = req.query;

    if (genre && genre !== 'All') {
      movies = movies.filter((m) =>
        m.genre.toLowerCase().includes(genre.toLowerCase())
      );
    }

    if (search) {
      const term = search.toLowerCase();
      movies = movies.filter(
        (m) =>
          m.title.toLowerCase().includes(term) ||
          m.genre.toLowerCase().includes(term) ||
          m.language.toLowerCase().includes(term)
      );
    }

    return res.status(200).json({
      success: true,
      count: movies.length,
      data: movies
    });
  } catch (error) {
    console.error('Error fetching movies:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve movies.'
    });
  }
});

/**
 * @route   GET /api/movies/:id
 * @desc    Get single movie by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const movie = await findMovieById(req.params.id);
    if (!movie) {
      return res.status(404).json({
        success: false,
        error: `Movie with ID "${req.params.id}" was not found.`
      });
    }

    return res.status(200).json({
      success: true,
      data: movie
    });
  } catch (error) {
    console.error('Error fetching movie:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve movie details.'
    });
  }
});

/**
 * @route   POST /api/movies
 * @desc    Create a new movie record
 * @access  Private (Admin only)
 */
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const validationError = validateMoviePayload(req.body);
    if (validationError) {
      return res.status(400).json({
        success: false,
        error: validationError
      });
    }

    const defaultPoster =
      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80';

    const movieData = {
      title: req.body.title.trim(),
      genre: req.body.genre.trim(),
      duration: req.body.duration.trim(),
      language: req.body.language.trim(),
      rating: Number(Number(req.body.rating).toFixed(1)),
      description: req.body.description.trim(),
      poster: req.body.poster && req.body.poster.trim() ? req.body.poster.trim() : defaultPoster
    };

    const createdMovie = await addMovie(movieData);
    return res.status(201).json({
      success: true,
      message: 'Movie added successfully.',
      data: createdMovie
    });
  } catch (error) {
    console.error('Error creating movie:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create movie record.'
    });
  }
});

/**
 * @route   PUT /api/movies/:id
 * @desc    Update an existing movie record
 * @access  Private (Admin only)
 */
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const existing = await findMovieById(req.params.id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: `Movie with ID "${req.params.id}" does not exist.`
      });
    }

    const validationError = validateMoviePayload(req.body);
    if (validationError) {
      return res.status(400).json({
        success: false,
        error: validationError
      });
    }

    const updateData = {
      title: req.body.title.trim(),
      genre: req.body.genre.trim(),
      duration: req.body.duration.trim(),
      language: req.body.language.trim(),
      rating: Number(Number(req.body.rating).toFixed(1)),
      description: req.body.description.trim(),
      poster: req.body.poster && req.body.poster.trim() ? req.body.poster.trim() : existing.poster
    };

    const updatedMovie = await updateMovie(req.params.id, updateData);
    return res.status(200).json({
      success: true,
      message: 'Movie updated successfully.',
      data: updatedMovie
    });
  } catch (error) {
    console.error('Error updating movie:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update movie.'
    });
  }
});

/**
 * @route   DELETE /api/movies/:id
 * @desc    Delete movie and its associated shows
 * @access  Private (Admin only)
 */
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const deleted = await deleteMovie(req.params.id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: `Movie with ID "${req.params.id}" does not exist.`
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Movie and its associated shows deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting movie:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete movie.'
    });
  }
});

module.exports = router;
