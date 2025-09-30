const cluster = require('cluster');
const os = require('os');

const WORKERS = parseInt(process.env.WEB_CONCURRENCY || String(os.cpus().length), 10);

if (cluster.isMaster) {
  console.log(`👑 Master ${process.pid} is running. Spawning ${WORKERS} workers...`);

  for (let i = 0; i < WORKERS; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.error(`💥 Worker ${worker.process.pid} died (code=${code}, signal=${signal}). Restarting...`);
    cluster.fork();
  });

  const shutdown = () => {
    console.log('🛑 Master received shutdown signal. Stopping workers...');
    for (const id in cluster.workers) {
      cluster.workers[id].process.kill('SIGTERM');
    }
    setTimeout(() => process.exit(0), 5000);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} else {
  console.log(`🧑‍🏭 Worker ${process.pid} starting app.js`);
  require('./app');
}


