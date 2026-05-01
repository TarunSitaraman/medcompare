const { startServer } = require('next/dist/server/lib/start-server');

const port = Number(process.env.PORT || 3000);
const hostname = process.env.HOSTNAME || '0.0.0.0';

startServer({
  dir: process.cwd(),
  port,
  isDev: true,
  hostname,
  allowRetry: true,
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
