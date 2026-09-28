/* eslint-disable */
/**
 * Runs the Playwright suite against a throwaway in-memory MongoDB.
 *
 * Without this, `pnpm e2e` picks up server/.env and would write test records
 * into whatever real database that points at. A single-node replica set is used
 * rather than a standalone so the transactional code path (lead conversion) is
 * exercised the same way the unit suite exercises it.
 *
 * MONGO_URI is set in this process's environment, and dotenv does not override
 * variables that already exist — so the dev servers the Playwright config
 * spawns inherit the throwaway URI rather than the one in .env.
 *
 * Child processes are launched with `node <cli entry>` rather than through a
 * shell: on Windows, `shell: true` mangles the backslashes in a node_modules
 * path and the command fails with "'node_modules.bin' is not recognized".
 *
 *   pnpm e2e:local                 run the whole suite
 *   pnpm e2e:local e2e/login.spec.ts --reporter=line
 */
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { spawn } = require('child_process');
const path = require('path');

const SERVER_DIR = path.join(__dirname, '..');
const CLIENT_DIR = path.join(__dirname, '..', '..', 'client');

const run = (args, cwd, env) =>
  new Promise((resolve) => {
    const child = spawn(process.execPath, args, { cwd, env, stdio: 'inherit' });
    child.on('exit', (code) => resolve(code ?? 1));
  });

(async () => {
  console.log('Starting throwaway MongoDB (single-node replica set)…');
  const mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  // getUri takes the database name; appending it to the string would land
  // inside the ?replicaSet= query and corrupt the set name.
  const uri = mongo.getUri('crm_e2e');

  const env = {
    ...process.env,
    MONGO_URI: uri,
    JWT_ACCESS_SECRET: 'e2e-access-secret',
    JWT_REFRESH_SECRET: 'e2e-refresh-secret',
    ADMIN_EMAIL: 'admin@e2e.test',
    ADMIN_PASSWORD: 'AdminE2E123!',
    DEMO_PASSWORD: 'Demo123!',
    NODE_ENV: 'development',
    PORT: '4000',
    // The suite logs in repeatedly and the dashboard fires several aggregations
    // per load; the default ceilings would throttle it.
    RATE_LIMIT_MAX: '5000',
    AUTH_RATE_LIMIT_MAX: '500',
    // The deterministic mock, so e2e needs no API key and no network.
    AI_PROVIDER: 'mock',
  };

  const TS_NODE = require.resolve('ts-node/dist/bin.js');
  const PLAYWRIGHT = path.join(CLIENT_DIR, 'node_modules', '@playwright', 'test', 'cli.js');

  let status = 1;
  try {
    console.log('Seeding…');
    status = await run([TS_NODE, '--transpile-only', 'src/scripts/seed.ts'], SERVER_DIR, env);
    if (status !== 0) throw new Error('seed failed');

    console.log('Running Playwright…');
    status = await run([PLAYWRIGHT, 'test', ...process.argv.slice(2)], CLIENT_DIR, env);
  } catch (error) {
    console.error(error.message);
  } finally {
    await mongo.stop();
  }

  process.exit(status);
})();
