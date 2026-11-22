
require('dotenv').config();

const app = require('./app');
const { initDb } = require('./config/db');
const seedDatabase = require('./seed');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // 1. Initialize database
    await initDb();

    // 2. Run initial seeds
    await seedDatabase();

    // 3. Start Express server
    const server = app.listen(PORT, () => {
      console.log('====================================================');
      console.log(`Pennywise Backend API running on port ${PORT}`);
      console.log(`Health check: /api/health`);
      console.log('====================================================');
    });

    // Graceful shutdown
    const shutdown = () => {
      console.log('Shutting down Pennywise server gracefully...');

      server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
}

startServer();
