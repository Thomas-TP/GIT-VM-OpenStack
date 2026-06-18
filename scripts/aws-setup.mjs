import { AwsClient } from 'aws4fetch';

const region = process.env.AWS_REGION || 'eu-west-3';
const ec2c = new AwsClient({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region,
  service: 'ec2',
});
const AMI = process.env.AWS_AMI_ID;
const SUBNET = process.env.AWS_SUBNET_ID;

async function ec2(params) {
  const body = new URLSearchParams({ Version: '2016-11-15', ...params }).toString();
  const r = await ec2c.fetch(`https://ec2.${region}.amazonaws.com/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  return { ok: r.ok, status: r.status, text: await r.text() };
}
const code = (t) => t.match(/<Code>([^<]+)<\/Code>/)?.[1];
const msg = (t) => t.match(/<Message>([^<]+)<\/Message>/)?.[1] || t.slice(0, 160);
const first = (t, tag) => t.match(new RegExp(`<${tag}>([^<]+)</${tag}>`))?.[1];

const SG_NAME = 'git-vm-portal-ssh';

// 1. default VPC id (via a default subnet)
const sn = await ec2({ Action: 'DescribeSubnets', 'Filter.1.Name': 'default-for-az', 'Filter.1.Value.1': 'true' });
const vpcId = first(sn.text, 'vpcId');
console.log('VPC', vpcId || 'ERR ' + msg(sn.text));

// 2. find or create the SSH security group
let sgId;
const existing = await ec2({ Action: 'DescribeSecurityGroups', 'Filter.1.Name': 'group-name', 'Filter.1.Value.1': SG_NAME });
sgId = first(existing.text, 'groupId');
if (!sgId) {
  const created = await ec2({
    Action: 'CreateSecurityGroup',
    GroupName: SG_NAME,
    GroupDescription: 'git-vm-portal: SSH access to provisioned VMs',
    VpcId: vpcId,
  });
  sgId = first(created.text, 'groupId');
  console.log('SG created', sgId || 'ERR ' + msg(created.text));
} else {
  console.log('SG exists', sgId);
}

// 3. authorize inbound SSH (22) from anywhere (idempotent)
if (sgId) {
  const auth = await ec2({
    Action: 'AuthorizeSecurityGroupIngress',
    GroupId: sgId,
    'IpPermissions.1.IpProtocol': 'tcp',
    'IpPermissions.1.FromPort': '22',
    'IpPermissions.1.ToPort': '22',
    'IpPermissions.1.IpRanges.1.CidrIp': '0.0.0.0/0',
    'IpPermissions.1.IpRanges.1.Description': 'SSH',
  });
  console.log('SSH ingress', auth.ok ? 'OK' : code(auth.text) === 'InvalidPermission.Duplicate' ? 'already set' : 'ERR ' + msg(auth.text));
}

// 4. dry-run RunInstances to confirm launch permission
const dry = await ec2({
  Action: 'RunInstances',
  DryRun: 'true',
  ImageId: AMI,
  InstanceType: 't3.small',
  MinCount: '1',
  MaxCount: '1',
  SubnetId: SUBNET,
  'SecurityGroupId.1': sgId,
});
console.log('RunInstances perm', code(dry.text) === 'DryRunOperation' ? 'OK (allowed)' : 'ERR ' + code(dry.text) + ' ' + msg(dry.text));

// 5. CreateKeyPair perm (create throwaway then delete)
const kp = await ec2({ Action: 'CreateKeyPair', KeyName: 'vm-portal-selftest', KeyType: 'ed25519' });
if (kp.ok) {
  console.log('CreateKeyPair OK');
  const del = await ec2({ Action: 'DeleteKeyPair', KeyName: 'vm-portal-selftest' });
  console.log('DeleteKeyPair', del.ok ? 'OK' : 'ERR ' + msg(del.text));
} else {
  console.log('CreateKeyPair ERR ' + code(kp.text) + ' ' + msg(kp.text));
}

console.log('\nUSE_SECURITY_GROUP_ID=' + sgId);
