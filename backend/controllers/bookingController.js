const Booking = require('../models/Booking');
const Room = require('../models/Room');
const mongoose = require('mongoose');

const isDatabaseConnected = () => mongoose.connection.readyState === 1;

// @desc    Get all bookings
// @route   GET /api/bookings
const getBookings = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({ message: 'Database is not connected' });
    }

    const bookings = await Booking.find()
      .populate('user', 'name email')
      .populate('room', 'roomNumber category pricePerNight isAvailable')
      .sort({ createdAt: -1 });

    res.status(200).json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error.message);
    res.status(500).json({ message: 'Failed to fetch bookings: ' + error.message });
  }
};

// @desc    Get single booking by ID
// @route   GET /api/bookings/:id
const getBookingById = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({ message: 'Database is not connected' });
    }

    const booking = await Booking.findById(req.params.id)
      .populate('user', 'name email')
      .populate('room', 'roomNumber category pricePerNight');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.status(200).json(booking);
  } catch (error) {
    console.error('Error fetching booking:', error.message);
    res.status(500).json({ message: 'Failed to fetch booking: ' + error.message });
  }
};

// @desc    Create a new booking
// @route   POST /api/bookings
const createBooking = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({ message: 'Database is not connected' });
    }

    const { room: roomId, checkInDate, checkOutDate, totalPrice, paymentStatus } = req.body;
    const userId = req.user ? req.user._id : req.body.user;

    if (!roomId || !checkInDate || !checkOutDate) {
      return res.status(400).json({ message: 'Please provide room, checkInDate, and checkOutDate' });
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Selected room not found' });
    }

    // Calculate total price if not provided
    let calculatedPrice = totalPrice;
    if (!calculatedPrice || Number(calculatedPrice) <= 0) {
      const inDate = new Date(checkInDate);
      const outDate = new Date(checkOutDate);
      const diffTime = Math.max(1, Math.ceil((outDate - inDate) / (1000 * 60 * 60 * 24)));
      calculatedPrice = diffTime * room.pricePerNight;
    }

    const booking = new Booking({
      user: userId,
      room: roomId,
      checkInDate: new Date(checkInDate),
      checkOutDate: new Date(checkOutDate),
      totalPrice: Number(calculatedPrice),
      paymentStatus: paymentStatus || 'Pending',
    });

    const savedBooking = await booking.save();
    const populated = await Booking.findById(savedBooking._id)
      .populate('user', 'name email')
      .populate('room', 'roomNumber category pricePerNight');

    res.status(201).json(populated);
  } catch (error) {
    console.error('Error creating booking:', error.message);
    res.status(500).json({ message: 'Failed to create booking: ' + error.message });
  }
};

// @desc    Update booking payment or dates
// @route   PUT /api/bookings/:id
const updateBookingStatus = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({ message: 'Database is not connected' });
    }

    const { paymentStatus, checkInDate, checkOutDate, totalPrice } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (paymentStatus) booking.paymentStatus = paymentStatus;
    if (checkInDate) booking.checkInDate = new Date(checkInDate);
    if (checkOutDate) booking.checkOutDate = new Date(checkOutDate);
    if (totalPrice !== undefined) booking.totalPrice = Number(totalPrice);

    await booking.save();

    const populated = await Booking.findById(booking._id)
      .populate('user', 'name email')
      .populate('room', 'roomNumber category pricePerNight');

    res.status(200).json(populated);
  } catch (error) {
    console.error('Error updating booking:', error.message);
    res.status(500).json({ message: 'Failed to update booking: ' + error.message });
  }
};

// @desc    Delete/Cancel a booking
// @route   DELETE /api/bookings/:id
const deleteBooking = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({ message: 'Database is not connected' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    await Booking.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Booking deleted successfully' });
  } catch (error) {
    console.error('Error deleting booking:', error.message);
    res.status(500).json({ message: 'Failed to delete booking: ' + error.message });
  }
};

// @desc    Get booking summary statistics
// @route   GET /api/bookings/stats
const getBookingStats = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({ message: 'Database is not connected' });
    }

    const totalBookings = await Booking.countDocuments();
    const recentBookings = await Booking.find()
      .populate('user', 'name email')
      .populate('room', 'roomNumber category pricePerNight')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      totalBookings,
      recentBookings,
    });
  } catch (error) {
    console.error('Error fetching booking stats:', error.message);
    res.status(500).json({ message: 'Failed to fetch booking stats: ' + error.message });
  }
};

module.exports = {
  getBookings,
  getBookingById,
  createBooking,
  updateBookingStatus,
  deleteBooking,
  getBookingStats,
};
