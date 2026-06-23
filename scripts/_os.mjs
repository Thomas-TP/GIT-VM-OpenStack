// Tiny shared OpenStack helper for the one-off scripts (Node 20+, global fetch).
// Reads credentials from the environment (source an openrc / clouds.yaml first):
//   OS_AUTH_URL (…/identity/v3)  OS_USERNAME  OS_PASSWORD
//   OS_PROJECT_ID  OS_USER_DOMAIN_NAME (default "Default")  OS_REGION (default dc3-a)
// No external dependencies — raw Keystone + service REST calls.

function need(name, fallback) {
  const v = process.env[name] ?? fallback;
  if (!v) {
    console.error(`Missing env ${name}. Source your openrc (PCU-…-openrc.txt) first.`);
    process.exit(1);
  }
  return v;
}

export async function osAuth() {
  const authUrl = need('OS_AUTH_URL', 'https://api.pub1.infomaniak.cloud/identity/v3').replace(/\/$/, '');
  const region = process.env.OS_REGION || 'dc3-a';
  const body = {
    auth: {
      identity: {
        methods: ['password'],
        password: {
          user: {
            name: need('OS_USERNAME'),
            domain: { name: process.env.OS_USER_DOMAIN_NAME || 'Default' },
            password: need('OS_PASSWORD'),
          },
        },
      },
      scope: { project: { id: need('OS_PROJECT_ID') } },
    },
  };
  const res = await fetch(`${authUrl}/auth/tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Keystone auth failed: ${res.status} ${await res.text()}`);
  const token = res.headers.get('x-subject-token');
  const cat = (await res.json()).token.catalog;
  const endpoints = {};
  for (const s of cat) {
    const ep =
      s.endpoints.find((e) => e.interface === 'public' && e.region === region) ||
      s.endpoints.find((e) => e.interface === 'public');
    if (ep) endpoints[s.type] = ep.url.replace(/\/$/, '');
  }
  return { token, endpoints };
}

export async function osFetch(ctx, service, path, init = {}) {
  const base = ctx.endpoints[service];
  if (!base) throw new Error(`service ${service} not in catalog`);
  const headers = { 'X-Auth-Token': ctx.token, Accept: 'application/json', ...(init.headers || {}) };
  if (init.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${base}${path}`, { ...init, headers });
  const text = await res.text();
  if (!res.ok) throw new Error(`${service} ${path} -> ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}
