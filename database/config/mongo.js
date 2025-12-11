const mongoose = require('mongoose');
require('dotenv').config();

const mongoURI = process.env.MONGO_URI;

const connectMongoDB = async () => {
    try {
        await mongoose.connect(mongoURI);
        console.log('✓ Conectado a MongoDB exitosamente');
    } catch (err) {
        console.error('✗ Error conectando a MongoDB:', err);
        process.exit(1);
    }
};

module.exports = { connectMongoDB };
