/* eslint-disable */
// Boots the real server against a throwaway MongoDB and queries it over HTTP.
// Confirms the app actually starts and serves, which no unit test does.
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { spawn } = require('child_process');

const wait_for = async (check, timeout_ms = 60000) => {
  const deadline = Date.now() + timeout_ms;
  while (Date.now() < deadline) {
    try {
      if (await check()) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
};

(async () => {
  const mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = mongo.getUri('crm_boot');
  console.log('mongo up');

  const env = {
    ...process.env,
    MONGO_URI: uri,
    JWT_ACCESS_SECRET: 'boot-access',
    JWT_REFRESH_SECRET: 'boot-refresh',
    ADMIN_EMAIL: 'admin@boot.test',
    ADMIN_PASSWORD: 'AdminBoot123!',
    DEMO_PASSWORD: 'Demo123!',
    NODE_ENV: 'development',
    PORT: '4100',
    AI_PROVIDER: 'mock',
  };

  const TS_NODE = require.resolve('ts-node/dist/bin.js');
  const seed = spawn(process.execPath, [TS_NODE, '--transpile-only', 'src/scripts/seed.ts'], {
    env, stdio: 'inherit',
  });
  const seed_code = await new Promise((r) => seed.on('exit', r));
  console.log('seed exit:', seed_code);
  if (seed_code !== 0) { await mongo.stop(); process.exit(1); }

  const server = spawn(process.execPath, [TS_NODE, '--transpile-only', 'src/index.ts'], {
    env, stdio: 'inherit',
  });

  const query = async (body) => {
    const res = await fetch('http://localhost:4100/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  };

  const ready = await wait_for(async () => {
    const json = await query({ query: '{ health }' });
    return json?.data?.health;
  });
  console.log(ready ? 'SERVER READY' : 'SERVER DID NOT START');

  if (ready) {
    const login = await query({
      query: 'mutation ($i: LoginInput!) { login(input: $i) { accessToken user { name roles { name } } } }',
      variables: { i: { email: 'demo-manager@example.com', password: 'Demo123!' } },
    });
    console.log('LOGIN:', JSON.stringify(login.data?.login?.user ?? login.errors));

    const token = login.data?.login?.accessToken;
    if (token) {
      const authed = await fetch('http://localhost:4100/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({
          query: '{ dashboardSummary { total_leads open_deals open_deal_value weighted_pipeline_value } pipelineBoard { stage { name } deal_count } leads(limit:2){ total items { name } } }',
        }),
      }).then((r) => r.json());
      console.log('DASHBOARD:', JSON.stringify(authed.data?.dashboardSummary ?? authed.errors));
      console.log('BOARD:', JSON.stringify(authed.data?.pipelineBoard?.map((c) => [c.stage.name, c.deal_count]) ?? authed.errors));
      console.log('LEADS total:', authed.data?.leads?.total);
    }
  }

  server.kill();
  await mongo.stop();
  process.exit(ready ? 0 : 1);
})();
