// UI test harness only: Playwright intercepts API calls. Production always requires MySQL.
import { createAppServer } from '../scripts/serve.mjs';
const server=await createAppServer();
server.listen(4317,'127.0.0.1');
