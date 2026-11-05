const mongoose = require('mongoose');

const dbHost = process.env.DB_Host || 'localhost';
const dbPort = process.env.DB_Port || '27017';
const dbName = process.env.DB_Name || 'WorkShop';

const mongoURI = `mongodb://${dbHost}:${dbPort}/${dbName}`;

const connectDB = async () => {
  try {
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    throw err; // Rethrow the error to be handled in server.js
  }
};

module.exports = connectDB;