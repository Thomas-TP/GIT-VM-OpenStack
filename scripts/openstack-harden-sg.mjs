// OPTIONAL hardening: lock the egress of the `git-vm-portal` security group to an
// allowlist (network-level, un-bypassable by a sudo/admin user inside the VM).
//
// Allows out: DNS 53 -> Cloudflare for Families ONLY (1.1.1.3 / 1.0.0.3),
// HTTP/HTTPS 80/443, NTP 123, SSH 22, DHCP 67/68. Everything else (torrents/P2P,
// unfiltered DNS, etc.) is denied. Run once:
//
//   node scripts/openstack-harden-sg.mjs
//
// ⚠️ After this, only the ports above leave the VM. Course installs (apt/curl over
// 80/443) still work; arbitrary outbound (e.g. custom ports) will not.
import { osAuth, osFetch } from './_os.mjs';

const SG_NAME = process.env.OS_SECURITY_GROUP_NAME || 'git-vm-portal';
const ctx = await osAuth();

const { security_groups } = await osFetch(ctx, 'network', '/v2.0/security-groups');
const sg = security_groups.find((s) => s.name === SG_NAME);
if (!sg) {
  console.error(`Security group ${SG_NAME} not found — run openstack-setup.mjs first.`);
  process.exit(1);
}

// 1. Remove every existing egress rule (default allow-all IPv4 + IPv6).
for (const r of sg.security_group_rules.filter((r) => r.direction === 'egress')) {
  await osFetch(ctx, 'network', `/v2.0/security-group-rules/${r.id}`, { method: 'DELETE' });
  console.log(`  - removed egress ${r.ethertype} ${r.protocol ?? 'any'}`);
}

// 2. Add the allowlist (IPv4 only).
const CF = ['1.1.1.3/32', '1.0.0.3/32'];
const rules = [
  ...CF.flatMap((ip) => [
    { protocol: 'udp', min: 53, max: 53, cidr: ip },
    { protocol: 'tcp', min: 53, max: 53, cidr: ip },
  ]),
  { protocol: 'tcp', min: 80, max: 80, cidr: '0.0.0.0/0' },
  { protocol: 'tcp', min: 443, max: 443, cidr: '0.0.0.0/0' },
  { protocol: 'udp', min: 123, max: 123, cidr: '0.0.0.0/0' }, // NTP
  { protocol: 'tcp', min: 22, max: 22, cidr: '0.0.0.0/0' }, // SSH/git
  { protocol: 'udp', min: 67, max: 68, cidr: '0.0.0.0/0' }, // DHCP
];
for (const r of rules) {
  await osFetch(ctx, 'network', '/v2.0/security-group-rules', {
    method: 'POST',
    body: JSON.stringify({
      security_group_rule: {
        security_group_id: sg.id,
        direction: 'egress',
        ethertype: 'IPv4',
        protocol: r.protocol,
        port_range_min: r.min,
        port_range_max: r.max,
        remote_ip_prefix: r.cidr,
      },
    }),
  });
  console.log(`  + egress ${r.protocol} ${r.min}-${r.max} -> ${r.cidr}`);
}
console.log('\nEgress locked to allowlist. DNS is forced to Cloudflare for Families.');
