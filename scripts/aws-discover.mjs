import { AwsClient } from 'aws4fetch';

const region = process.env.AWS_REGION || 'eu-west-3';
const creds = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
};

const ec2c = new AwsClient({ ...creds, region, service: 'ec2' });
const stsc = new AwsClient({ ...creds, region: 'us-east-1', service: 'sts' });

async function call(client, host, params) {
  const body = new URLSearchParams(params).toString();
  const r = await client.fetch(`https://${host}/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  return { ok: r.ok, status: r.status, text: await r.text() };
}
const ec2 = (p) => call(ec2c, `ec2.${region}.amazonaws.com`, { Version: '2016-11-15', ...p });
const err = (t) => t.match(/<Message>([^<]+)<\/Message>/)?.[1] || t.slice(0, 160);
const all = (t, tag) => [...t.matchAll(new RegExp(`<${tag}>([^<]+)</${tag}>`, 'g'))].map((m) => m[1]);

// 1. Validate credentials
const sts = await call(stsc, 'sts.amazonaws.com', { Action: 'GetCallerIdentity', Version: '2011-06-15' });
if (!sts.ok) {
  console.log('STS FAIL:', sts.status, err(sts.text));
  process.exit(1);
}
console.log('CREDS OK arn=', sts.text.match(/<Arn>([^<]+)<\/Arn>/)?.[1]);

// 2. Default subnet
const sn = await ec2({ Action: 'DescribeSubnets', 'Filter.1.Name': 'default-for-az', 'Filter.1.Value.1': 'true' });
console.log('SUBNETS', sn.ok ? all(sn.text, 'subnetId').join(',') : 'ERR ' + err(sn.text));

// 3. Default security group
const sg = await ec2({ Action: 'DescribeSecurityGroups', 'Filter.1.Name': 'group-name', 'Filter.1.Value.1': 'default' });
console.log('DEFAULT_SG', sg.ok ? all(sg.text, 'groupId')[0] : 'ERR ' + err(sg.text));

// 4. Latest Ubuntu 22.04 AMI (Canonical)
const img = await ec2({
  Action: 'DescribeImages',
  'Owner.1': '099720109477',
  'Filter.1.Name': 'name',
  'Filter.1.Value.1': 'ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*',
  'Filter.2.Name': 'state',
  'Filter.2.Value.1': 'available',
});
if (img.ok) {
  const ids = all(img.text, 'imageId');
  const dates = all(img.text, 'creationDate');
  const zipped = ids.map((id, i) => ({ id, date: dates[i] })).sort((a, b) => (a.date < b.date ? 1 : -1));
  console.log('LATEST_UBUNTU_AMI', zipped[0]?.id, zipped[0]?.date);
} else {
  console.log('IMAGES ERR ' + err(img.text));
}
