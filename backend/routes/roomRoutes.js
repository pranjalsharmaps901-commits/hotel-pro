const express = require('express');
const router = express.Router();
const {
  getRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  getRoomStats,
} = require('../controllers/roomController');
const { protect } = require('../middleware/authMiddleware');

// Room stats endpoint
router.get('/stats', protect, getRoomStats);

// Rooms list and create
router.route('/')
  .get(getRooms)
  .post(protect, createRoom);

// Single room operations
router.route('/:id')
  .get(getRoomById)
  .put(protect, updateRoom)
  .delete(protect, deleteRoom);

module.exports = router;
