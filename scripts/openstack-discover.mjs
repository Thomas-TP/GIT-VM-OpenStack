// Discover the Infomaniak OpenStack project: flavors, images, networks, security
// groups. Use it to refresh the image UUIDs in src/presets.ts (OS[].ami) and to
// find the shared public network id (OS_NETWORK_ID) and flavor names.
//
//   # source the openrc first (sets OS_* env), then:
//   node scripts/openstack-discover.mjs
import { osAuth, osFetch } from './_os.mjs';

const ctx = await osAuth();

console.log('\n=== FLAVORS (name -> vcpu/ram/disk) ===');
const { flavors } = await osFetch(ctx, 'compute', '/flavors/detail');
for (const f of flavors.sort((a, b) => a.ram - b.ram)) {
  console.log(`${f.name.padEnd(24)} vcpu=${String(f.vcpus).padEnd(2)} ram=${String(f.ram).padEnd(6)} disk=${f.disk}`);
}

console.log('\n=== IMAGES (name | id | min_disk | distro) ===');
const { images } = await osFetch(ctx, 'image', '/v2/images?limit=200&status=active');
for (const i of images.sort((a, b) => (a.name > b.name ? 1 : -1))) {
  console.log(`${(i.name || '').padEnd(38)} ${i.id} min_disk=${String(i.min_disk).padEnd(4)} ${i.os_distro || ''}`);
}

console.log('\n=== NETWORKS (name | id | external | shared) ===');
const { networks } = await osFetch(ctx, 'network', '/v2.0/networks');
for (const n of networks) {
  console.log(`${(n.name || '').padEnd(20)} ${n.id} external=${n['router:external']} shared=${n.shared}`);
}

console.log('\n=== SECURITY GROUPS ===');
const { security_groups } = await osFetch(ctx, 'network', '/v2.0/security-groups');
for (const s of security_groups) console.log(`${(s.name || '').padEnd(20)} ${s.id}`);
console.log('');
