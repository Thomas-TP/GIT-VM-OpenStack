// One-off: open inbound RDP (tcp/3389) on the shared security group so Windows
// VMs are reachable via Remote Desktop / MobaXterm. Idempotent — re-running is safe.
import { AwsClient } from 'aws4fetch';

const region = process.env.AWS_REGION || 'eu-central-2';
const sg = process.env.AWS_SECURITY_GROUP_ID;
if (!sg) {
  console.error('AWS_SECURITY_GROUP_ID required');
  process.exit(1);
}
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

const r = await ec2({
  Action: 'AuthorizeSecurityGroupIngress',
  GroupId: sg,
  'IpPermissions.1.IpProtocol': 'tcp',
  'IpPermissions.1.FromPort': '3389',
  'IpPermissions.1.ToPort': '3389',
  'IpPermissions.1.IpRanges.1.CidrIp': '0.0.0.0/0',
  'IpPermissions.1.IpRanges.1.Description': 'RDP for Windows VMs (git-vm-portal)',
});
if (r.ok) console.log('RDP 3389 opened on', sg);
else if (/Duplicate/i.test(r.text)) console.log('RDP 3389 already open on', sg, '(ok)');
else console.error('FAILED:', r.text.match(/<Message>([^<]+)/)?.[1] ?? r.text.slice(0, 300));
