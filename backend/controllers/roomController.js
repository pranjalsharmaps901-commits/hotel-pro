const Room = require('../models/Room');
const mongoose = require('mongoose');

const isDatabaseConnected = () => mongoose.connection.readyState === 1;

// @desc    Get all rooms (with optional filters)
// @route   GET /api/rooms
const getRooms = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({ message: 'Database is not connected' });
    }

    const { category, isAvailable } = req.query;
    const filter = {};

    if (category) {
      filter.category = category;
    }
    if (isAvailable !== undefined) {
      filter.isAvailable = isAvailable === 'true';
    }

    const rooms = await Room.find(filter).sort({ createdAt: -1 });
    res.status(200).json(rooms);
  } catch (error) {
    console.error('Error fetching rooms:', error.message);
    res.status(500).json({ message: 'Failed to fetch rooms: ' + error.message });
  }
};

// @desc    Get single room by ID
// @route   GET /api/rooms/:id
const getRoomById = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({ message: 'Database is not connected' });
    }

    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    res.status(200).json(room);
  } catch (error) {
    console.error('Error fetching room:', error.message);
    res.status(500).json({ message: 'Failed to fetch room: ' + error.message });
  }
};

// @desc    Create a new room
// @route   POST /api/rooms
const createRoom = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({ message: 'Database is not connected' });
    }

    const { roomNumber, category, pricePerNight, isAvailable, images } = req.body;

    if (!roomNumber || !category || pricePerNight === undefined || pricePerNight === '') {
      return res.status(400).json({ message: 'Please provide roomNumber, category, and pricePerNight' });
    }

    const existingRoom = await Room.findOne({ roomNumber: roomNumber.toString().trim() });
    if (existingRoom) {
      return res.status(400).json({ message: `Room ${roomNumber} already exists` });
    }

    const newRoom = new Room({
      roomNumber: roomNumber.toString().trim(),
      category: category.trim(),
      pricePerNight: Number(pricePerNight),
      isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
      images: Array.isArray(images) ? images : [],
    });

    const savedRoom = await newRoom.save();
    res.status(201).json(savedRoom);
  } catch (error) {
    console.error('Error creating room:', error.message);
    res.status(500).json({ message: 'Failed to create room: ' + error.message });
  }
};

// @desc    Update a room
// @route   PUT /api/rooms/:id
const updateRoom = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({ message: 'Database is not connected' });
    }

    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const { roomNumber, category, pricePerNight, isAvailable, images } = req.body;

    if (roomNumber && roomNumber !== room.roomNumber) {
      const duplicate = await Room.findOne({ roomNumber: roomNumber.toString().trim() });
      if (duplicate && duplicate._id.toString() !== req.params.id) {
        return res.status(400).json({ message: `Room ${roomNumber} already exists` });
      }
      room.roomNumber = roomNumber.toString().trim();
    }

    if (category) room.category = category.trim();
    if (pricePerNight !== undefined) room.pricePerNight = Number(pricePerNight);
    if (isAvailable !== undefined) room.isAvailable = Boolean(isAvailable);
    if (images !== undefined) room.images = Array.isArray(images) ? images : [images];

    const updatedRoom = await room.save();
    res.status(200).json(updatedRoom);
  } catch (error) {
    console.error('Error updating room:', error.message);
    res.status(500).json({ message: 'Failed to update room: ' + error.message });
  }
};

// @desc    Delete a room
// @route   DELETE /api/rooms/:id
const deleteRoom = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({ message: 'Database is not connected' });
    }

    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    await Room.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Error deleting room:', error.message);
    res.status(500).json({ message: 'Failed to delete room: ' + error.message });
  }
};

// @desc    Get room summary statistics
// @route   GET /api/rooms/stats
const getRoomStats = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({ message: 'Database is not connected' });
    }

    const totalRooms = await Room.countDocuments();
    const availableRooms = await Room.countDocuments({ isAvailable: true });

    res.status(200).json({
      totalRooms,
      availableRooms,
    });
  } catch (error) {
    console.error('Error fetching room stats:', error.message);
    res.status(500).json({ message: 'Failed to fetch room stats: ' + error.message });
  }
};

module.exports = {
  getRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  getRoomStats,
};
