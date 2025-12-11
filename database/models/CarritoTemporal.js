const mongoose = require('mongoose');

const carritoSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, unique: true, index: true },
    items: [{
        productoID: { type: Number, required: true },
        nombre: String,
        precio: Number,
        cantidad: { type: Number, required: true },
        subtotal: Number
    }],
    total: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now, expires: 86400 }
});

module.exports = mongoose.model('CarritoTemporal', carritoSchema);
