import { AwsClient } from 'aws4fetch';

const region = process.env.AWS_REGION || 'eu-west-3';
const ec2c = new AwsClient({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region,
  service: 'ec2',
});
async function ec2(params) {
  const body = new URLSearchParams({ Version: '2016-11-15', ...params }).toString();
  const r = await ec2c.fetch(`https://ec2.${region}.amazonaws.com/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  return { ok: r.ok, text: await r.text() };
}
const allTags = (t, tag) => [...t.matchAll(new RegExp(`<${tag}>([^<]+)</${tag}>`, 'g'))].map((m) => m[1]);

// instances tagged by the portal, not already terminated
const di = await ec2({
  Action: 'DescribeInstances',
  'Filter.1.Name': 'tag:managed-by',
  'Filter.1.Value.1': 'git-vm-portal',
  'Filter.2.Name': 'instance-state-name',
  'Filter.2.Value.1': 'pending',
  'Filter.2.Value.2': 'running',
  'Filter.2.Value.3': 'stopping',
  'Filter.2.Value.4': 'stopped',
});
const ids = allTags(di.text, 'instanceId');
console.log('instances to terminate:', ids.length ? ids.join(', ') : '(none)');
if (ids.length) {
  const params = { Action: 'TerminateInstances' };
  ids.forEach((id, i) => (params[`InstanceId.${i + 1}`] = id));
  const t = await ec2(params);
  console.log('terminate:', t.ok ? 'OK' : t.text.slice(0, 200));
}

// delete portal key pairs
const dk = await ec2({ Action: 'DescribeKeyPairs' });
const keys = allTags(dk.text, 'keyName').filter((k) => k.startsWith('vm-portal-'));
console.log('key pairs to delete:', keys.length ? keys.join(', ') : '(none)');
for (const k of keys) {
  await ec2({ Action: 'DeleteKeyPair', KeyName: k });
}
console.log('cleanup done');
