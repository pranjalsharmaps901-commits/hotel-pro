const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
    roomNumber: { type: String, required: true },
    category: { type: String, required: true },
    pricePerNight: { type: Number, required: true },
    isAvailable: { type: Boolean, default: true },
    images: [{ type: String }]
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);