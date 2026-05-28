import 'dotenv/config';
import app from './app';
import { startExpiryJob } from './jobs/expireReservations';
import logger from './utils/logger';

const PORT = parseInt(process.env.PORT ?? '3000', 10);

app.listen(PORT, () => {
  logger.info({
    message: `Server running`,
    port: PORT,
    environment: process.env.NODE_ENV ?? 'development',
  });

  startExpiryJob();
});
