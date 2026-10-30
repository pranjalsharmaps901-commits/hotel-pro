const express = require('express');
const router = express.Router();
const {
  getBookings,
  getBookingById,
  createBooking,
  updateBookingStatus,
  deleteBooking,
  getBookingStats,
} = require('../controllers/bookingController');
const { protect } = require('../middleware/authMiddleware');

// Booking stats endpoint
router.get('/stats', protect, getBookingStats);

// Bookings list and create
router.route('/')
  .get(protect, getBookings)
  .post(protect, createBooking);

// Single booking operations
router.route('/:id')
  .get(protect, getBookingById)
  .put(protect, updateBookingStatus)
  .delete(protect, deleteBooking);

module.exports = router;
