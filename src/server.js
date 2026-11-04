require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set');
    await connectDB();
    app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}/api/v1`));
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
})();
