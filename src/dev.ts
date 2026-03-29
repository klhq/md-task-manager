import app from './app.js';
import logger from './core/logger.js';

const PORT = Number(process.env.PORT) || 3000;

logger.infoWithContext({
  message: `Server running on http://localhost:${PORT}`,
});
logger.infoWithContext({
  message: 'Webhook endpoint ready at /api',
});

// Bun's --watch mode detects this default export as a server config
// and manages the lifecycle (including hot-reload without port conflicts).
export default {
  fetch: app.fetch,
  port: PORT,
};
