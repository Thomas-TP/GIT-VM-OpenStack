// One-time setup: ensure the `git-vm-portal` security group exists with the
// ingress rules the portal needs (SSH 22, RDP 3389, ICMP/ping). Egress is left
// open (default allow-all) so cloud-init course installs work; lock it down
// afterwards with openstack-harden-sg.mjs if desired.
//
//   node scripts/openstack-setup.mjs
//
// Idempotent. Replaces the AWS scripts/aws-setup.mjs + aws-open-rdp.mjs.
import { osAuth, osFetch } from './_os.mjs';

const SG_NAME = process.env.OS_SECURITY_GROUP_NAME || 'git-vm-portal';
const ctx = await osAuth();

const { security_groups } = await osFetch(ctx, 'network', '/v2.0/security-groups');
let sg = security_groups.find((s) => s.name === SG_NAME);
if (sg) {
  console.log(`Security group already exists: ${SG_NAME} (${sg.id})`);
} else {
  const created = await osFetch(ctx, 'network', '/v2.0/security-groups', {
    method: 'POST',
    body: JSON.stringify({ security_group: { name: SG_NAME, description: 'GIT VM Portal — ingress SSH/RDP/ICMP' } }),
  });
  sg = created.security_group;
  console.log(`Created security group: ${SG_NAME} (${sg.id})`);
}

// Desired ingress rules (port_min/max null for ICMP).
const want = [
  { protocol: 'tcp', port_range_min: 22, port_range_max: 22 },
  { protocol: 'tcp', port_range_min: 3389, port_range_max: 3389 },
  { protocol: 'icmp', port_range_min: null, port_range_max: null },
];
const have = sg.security_group_rules || [];
for (const r of want) {
  const exists = have.some(
    (h) =>
      h.direction === 'ingress' &&
      h.ethertype === 'IPv4' &&
      h.protocol === r.protocol &&
      (h.port_range_min ?? null) === r.port_range_min
  );
  if (exists) {
    console.log(`  rule present: ${r.protocol} ${r.port_range_min ?? ''}`);
    continue;
  }
  await osFetch(ctx, 'network', '/v2.0/security-group-rules', {
    method: 'POST',
    body: JSON.stringify({
      security_group_rule: {
        security_group_id: sg.id,
        direction: 'ingress',
        ethertype: 'IPv4',
        protocol: r.protocol,
        remote_ip_prefix: '0.0.0.0/0',
        ...(r.port_range_min != null ? { port_range_min: r.port_range_min, port_range_max: r.port_range_max } : {}),
      },
    }),
  });
  console.log(`  + ingress ${r.protocol} ${r.port_range_min ?? ''}`);
}
console.log(`\nDone. Set OS_SECURITY_GROUP_NAME="${SG_NAME}" in wrangler.jsonc (already default).`);
