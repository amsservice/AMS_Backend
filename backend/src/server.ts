// import app from './app';
// import { ENV } from './config/env';
// import { connectDB } from './config/db';

// const startServer = async () => {
  
//   await connectDB();

//   app.listen(ENV.PORT, () => {
//     console.log(` Server running on http://localhost:${ENV.PORT}`);
//   });
// };

// startServer();


import app from './app';
import { ENV } from './config/env';
import { connectDB } from './config/db';
import { initCounters } from './config/initCounter'; // 👈 import

const startServer = async () => {
  try {
    // 1️⃣ Connect database
    await connectDB();

    // 2️⃣ Initialize counters (schoolCode, etc.)
    await initCounters();

    // 3️⃣ Start server
    app.listen(ENV.PORT, () => {
      console.log(`🚀 Server running on http://localhost:${ENV.PORT}`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
