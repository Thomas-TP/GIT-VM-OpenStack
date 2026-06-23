import type { Env } from './types';

// Minimal OpenStack client for Infomaniak Public Cloud (pub1 / dc3-a).
// Replaces the former AWS EC2 client. Talks to Keystone (auth), Nova (compute),
// Glance (images/snapshots) and Neutron (network) over their REST APIs.
//
// Design notes:
// - The DB columns are still named `aws_instance_id` / `aws_snapshot_id` (the
//   schema is shared with the original AWS project, additive-migrations only).
//   Here they hold an OpenStack **server UUID** and a Glance **image UUID**.
// - The exported function names mirror the old aws.ts on purpose, so the rest of
//   the worker (index.ts) keeps working with minimal changes.
// - Public IP: Infomaniak's `ext-net1` is a SHARED network whose subnets are
//   public IPv4 ranges. Booting an instance directly on it yields a routable
//   public IP — no floating-IP allocation needed (the EC2 "public IP" analog).

// ---- Keystone auth (token + endpoint catalog, cached per isolate) --------
interface OsSession {
  token: string;
  expires: number; // epoch ms
  endpoints: Record<string, string>; // service type -> public URL (for OS_REGION)
}
let session: OsSession | null = null;
let flavorCache: { at: number; byName: Record<string, string> } | null = null;

function authBody(env: Env): string {
  return JSON.stringify({
    auth: {
      identity: {
        methods: ['password'],
        password: {
          user: {
            name: env.OS_USERNAME,
            domain: { name: env.OS_USER_DOMAIN_NAME || 'Default' },
            password: env.OS_PASSWORD,
          },
        },
      },
      scope: { project: { id: env.OS_PROJECT_ID } },
    },
  });
}

async function authenticate(env: Env): Promise<OsSession> {
  const res = await fetch(`${env.OS_AUTH_URL.replace(/\/$/, '')}/auth/tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: authBody(env),
  });
  if (!res.ok) {
    throw new Error(`Keystone auth failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
  }
  const token = res.headers.get('X-Subject-Token');
  if (!token) throw new Error('Keystone auth: no X-Subject-Token header');
  const body = (await res.json()) as any;
  const region = env.OS_REGION || 'dc3-a';
  const endpoints: Record<string, string> = {};
  for (const svc of body?.token?.catalog ?? []) {
    const ep =
      (svc.endpoints ?? []).find((e: any) => e.interface === 'public' && e.region === region) ??
      (svc.endpoints ?? []).find((e: any) => e.interface === 'public');
    if (ep?.url) endpoints[svc.type] = ep.url.replace(/\/$/, '');
  }
  const expISO = body?.token?.expires_at;
  const expires = expISO ? new Date(expISO).getTime() : Date.now() + 50 * 60_000;
  return { token, expires, endpoints };
}

async function getSession(env: Env): Promise<OsSession> {
  if (session && session.expires - Date.now() > 120_000) return session;
  session = await authenticate(env);
  return session;
}

function extractMsg(text: string): string {
  try {
    const j = JSON.parse(text);
    for (const k of Object.keys(j)) {
      if (j[k] && typeof j[k] === 'object' && typeof j[k].message === 'string') return j[k].message;
    }
    if (typeof j.message === 'string') return j.message;
  } catch {
    /* not json */
  }
  return text.slice(0, 200);
}

// Authenticated request against a service in the catalog. `service` is a Keystone
// service type (compute, image, network, metric). One automatic re-auth on 401.
async function osFetch(
  env: Env,
  service: string,
  path: string,
  init: RequestInit = {},
  retry = true
): Promise<Response> {
  const s = await getSession(env);
  const base = s.endpoints[service];
  if (!base) throw new Error(`OpenStack: service '${service}' not in catalog`);
  const headers = new Headers(init.headers);
  headers.set('X-Auth-Token', s.token);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  headers.set('Accept', 'application/json');
  const res = await fetch(`${base}${path}`, { ...init, headers });
  if (res.status === 401 && retry) {
    session = null;
    return osFetch(env, service, path, init, false);
  }
  return res;
}

async function osJson<T = any>(env: Env, service: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await osFetch(env, service, path, init);
  const text = await res.text();
  if (!res.ok) throw new Error(`OpenStack ${service} ${path.split('?')[0]} -> ${res.status}: ${extractMsg(text)}`);
  return (text ? JSON.parse(text) : {}) as T;
}

// ---- Keypairs (Nova generates the keypair and returns the private key once,
// exactly like EC2 CreateKeyPair returns keyMaterial). RSA only. ------------
export interface KeyPair {
  keyName: string;
  privateKey: string;
}

export async function createKeyPair(env: Env, requestId: number): Promise<KeyPair> {
  const keyName = `vm-portal-req-${requestId}`;
  // Idempotent re-provision: drop any leftover with the same name first.
  await osFetch(env, 'compute', `/os-keypairs/${encodeURIComponent(keyName)}`, { method: 'DELETE' }).catch(() => {});
  const out = await osJson<{ keypair: { private_key?: string } }>(env, 'compute', '/os-keypairs', {
    method: 'POST',
    body: JSON.stringify({ keypair: { name: keyName } }),
  });
  const privateKey = out.keypair?.private_key;
  if (!privateKey) throw new Error('createKeyPair: no private_key in response');
  return { keyName, privateKey };
}

export async function deleteKeyPair(env: Env, keyName: string): Promise<void> {
  await osFetch(env, 'compute', `/os-keypairs/${encodeURIComponent(keyName)}`, { method: 'DELETE' }).catch(() => {});
}

// Resolve a flavor name (e.g. "a2-ram4-disk20-perf1") to its UUID. Cached 10 min.
async function flavorId(env: Env, name: string): Promise<string> {
  if (!flavorCache || Date.now() - flavorCache.at > 600_000) {
    const out = await osJson<{ flavors: { id: string; name: string }[] }>(env, 'compute', '/flavors/detail');
    const byName: Record<string, string> = {};
    for (const f of out.flavors) byName[f.name] = f.id;
    flavorCache = { at: Date.now(), byName };
  }
  const id = flavorCache.byName[name];
  if (!id) throw new Error(`flavor not found: ${name}`);
  return id;
}

// ---- Launch -------------------------------------------------------------
export interface LaunchResult {
  instanceId: string;
}
export interface LaunchParams {
  requestId: number;
  keyName: string;
  /** Flavor NAME (composed perf×storage), resolved to an id here. */
  flavorName: string;
  /** Glance image UUID (OS image, or a snapshot image for restore). */
  imageId: string;
  /** cloud-init (Linux) / cloudbase-init (Windows) user-data, raw text. */
  userData?: string;
  /** User-chosen VM name (falls back to vm-portal-req-<id>). */
  nameTag?: string | null;
}

export async function launchInstance(env: Env, p: LaunchParams): Promise<LaunchResult> {
  if (!env.OS_NETWORK_ID) throw new Error('OpenStack network config missing (OS_NETWORK_ID)');
  const flavorRef = await flavorId(env, p.flavorName);
  const server: Record<string, unknown> = {
    name: (p.nameTag && p.nameTag.trim() ? p.nameTag.trim() : `vm-portal-req-${p.requestId}`).slice(0, 255),
    imageRef: p.imageId,
    flavorRef,
    key_name: p.keyName,
    networks: [{ uuid: env.OS_NETWORK_ID }],
    metadata: { 'managed-by': 'git-vm-portal', 'request-id': String(p.requestId) },
  };
  // Security group by name (Nova boot wants the name, not the id).
  if (env.OS_SECURITY_GROUP_NAME) server.security_groups = [{ name: env.OS_SECURITY_GROUP_NAME }];
  // user_data must be base64-encoded.
  if (p.userData) server.user_data = btoa(unescape(encodeURIComponent(p.userData)));

  const out = await osJson<{ server: { id: string } }>(env, 'compute', '/servers', {
    method: 'POST',
    body: JSON.stringify({ server }),
  });
  if (!out.server?.id) throw new Error('launchInstance: no server id in response');
  return { instanceId: out.server.id };
}

// ---- State -------------------------------------------------------------
// Map Nova server status to the AWS-style tokens the rest of the worker uses
// ('running' | 'stopped' | 'pending' | 'terminated' | 'error' | ...).
function mapState(status: string): string {
  switch ((status || '').toUpperCase()) {
    case 'ACTIVE':
      return 'running';
    case 'SHUTOFF':
      return 'stopped';
    case 'BUILD':
    case 'REBUILD':
      return 'pending';
    case 'REBOOT':
    case 'HARD_REBOOT':
      return 'pending';
    case 'PAUSED':
    case 'SUSPENDED':
    case 'SHELVED':
    case 'SHELVED_OFFLOADED':
      return 'stopped';
    case 'DELETED':
    case 'SOFT_DELETED':
      return 'terminated';
    case 'ERROR':
      return 'error';
    default:
      return (status || 'unknown').toLowerCase();
  }
}

// First IPv4 address across the server's networks. On Infomaniak ext-net1 the
// fixed address IS the public IP.
function firstIpv4(addresses: Record<string, any[]> | undefined): string | undefined {
  for (const net of Object.keys(addresses ?? {})) {
    for (const a of addresses![net]) {
      if (a.version === 4 && a.addr) return a.addr as string;
    }
  }
  return undefined;
}

export interface InstanceStatus {
  state: string;
  publicIp?: string;
  launchTime?: string;
}

export async function describeInstance(env: Env, instanceId: string): Promise<InstanceStatus> {
  const res = await osFetch(env, 'compute', `/servers/${instanceId}`);
  if (res.status === 404) return { state: 'terminated' };
  const text = await res.text();
  if (!res.ok) throw new Error(`describeInstance -> ${res.status}: ${extractMsg(text)}`);
  const srv = (JSON.parse(text) as any).server;
  return {
    state: mapState(srv.status),
    publicIp: firstIpv4(srv.addresses),
    launchTime: srv['OS-SRV-USG:launched_at'] || srv.created,
  };
}

export async function terminateInstance(env: Env, instanceId: string): Promise<void> {
  const res = await osFetch(env, 'compute', `/servers/${instanceId}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 404) throw new Error(`terminateInstance -> ${res.status}: ${extractMsg(await res.text())}`);
}

async function serverAction(env: Env, instanceId: string, action: Record<string, unknown>): Promise<void> {
  const res = await osFetch(env, 'compute', `/servers/${instanceId}/action`, {
    method: 'POST',
    body: JSON.stringify(action),
  });
  if (!res.ok) throw new Error(`server action -> ${res.status}: ${extractMsg(await res.text())}`);
}

export async function startInstance(env: Env, instanceId: string): Promise<void> {
  await serverAction(env, instanceId, { 'os-start': null });
}
export async function stopInstance(env: Env, instanceId: string): Promise<void> {
  await serverAction(env, instanceId, { 'os-stop': null });
}
export async function rebootInstance(env: Env, instanceId: string): Promise<void> {
  await serverAction(env, instanceId, { reboot: { type: 'SOFT' } });
}

// ---- Snapshots (Glance image of the server, the OpenStack analog of an AMI) --
export interface RootVolume {
  volumeId?: string;
  rootDevice?: string;
  architecture?: string;
  sizeGb?: number;
}
// No separate EBS volume on OpenStack: the snapshot is taken from the server
// itself (createImage). We return the server id as the "volumeId" so the shared
// call sites keep working.
export async function describeRootVolume(env: Env, instanceId: string): Promise<RootVolume> {
  return { volumeId: instanceId, rootDevice: '/dev/vda', architecture: 'x86_64' };
}

// createImage on the server -> a Glance image. Returns the image UUID.
export async function createSnapshot(env: Env, serverId: string, description: string): Promise<string> {
  const res = await osFetch(env, 'compute', `/servers/${serverId}/action`, {
    method: 'POST',
    body: JSON.stringify({
      createImage: { name: description.slice(0, 255), metadata: { 'managed-by': 'git-vm-portal' } },
    }),
  });
  if (!res.ok) throw new Error(`createSnapshot -> ${res.status}: ${extractMsg(await res.text())}`);
  // Newer microversions return { image_id }; otherwise the image URL is in Location.
  const body = await res.text();
  let id: string | undefined;
  try {
    id = JSON.parse(body)?.image_id;
  } catch {
    /* no body */
  }
  if (!id) {
    const loc = res.headers.get('location') || res.headers.get('Location');
    if (loc) id = loc.split('/').filter(Boolean).pop();
  }
  if (!id) throw new Error('createSnapshot: could not determine image id');
  return id;
}

// Map Glance image status -> { state: 'pending'|'completed'|'error', sizeGb? }.
export async function describeSnapshot(env: Env, imageId: string): Promise<{ state: string; sizeGb?: number }> {
  const res = await osFetch(env, 'image', `/v2/images/${imageId}`);
  if (res.status === 404) return { state: 'error' };
  const text = await res.text();
  if (!res.ok) throw new Error(`describeSnapshot -> ${res.status}: ${extractMsg(text)}`);
  const img = JSON.parse(text) as any;
  const st = (img.status || '').toLowerCase();
  const state = st === 'active' ? 'completed' : st === 'killed' || st === 'deleted' ? 'error' : 'pending';
  const sizeGb = img.min_disk || (img.size ? Math.ceil(img.size / 1024 ** 3) : undefined);
  return { state, sizeGb };
}

export async function deleteSnapshot(env: Env, imageId: string): Promise<void> {
  await osFetch(env, 'image', `/v2/images/${imageId}`, { method: 'DELETE' }).catch(() => {});
}

// On OpenStack a snapshot image is directly bootable — no separate "register"
// step (unlike AWS RegisterImage). Pass the image id straight through.
export async function registerImageFromSnapshot(
  env: Env,
  _name: string,
  snapshotId: string,
  _rootDevice: string,
  _architecture: string
): Promise<string> {
  return snapshotId;
}

// CPU telemetry (idle auto-stop). Infomaniak exposes Gnocchi (`metric`), but
// turning the cumulative `cpu` counter into a reliable utilisation % is
// error-prone on a public cloud and risks false auto-stops. Disabled for now
// (IDLE_STOP defaults to "false"); returns null = "no data, do nothing".
export async function maxCpuOverWindow(
  _env: Env,
  _instanceId: string,
  _minutes: number
): Promise<{ max: number; datapoints: number } | null> {
  return null;
}

// List portal-managed servers -> { serverId: state } (for reconciliation/drift).
export async function listManagedInstances(env: Env): Promise<Record<string, string>> {
  const out = await osJson<{ servers: any[] }>(env, 'compute', '/servers/detail');
  const result: Record<string, string> = {};
  for (const s of out.servers ?? []) {
    if (s.metadata?.['managed-by'] === 'git-vm-portal') result[s.id] = mapState(s.status);
  }
  return result;
}
