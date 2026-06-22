// One-off: infra for the one-click snapshot disk export (.vmdk/.vdi).
// Creates:
//   1. S3 bucket  gitvm-exports-<account>   (eu-central-2)
//   2. IAM role + instance profile  gitvm-export-helper  (the throwaway converter EC2)
//   3. inline policy on the Worker user (Claude): iam:PassRole + s3 read + ec2 describe
// Idempotent: re-running is safe (EntityAlreadyExists / BucketAlreadyOwnedByYou ignored).
//
// Run locally with the AWS creds in env:
//   $env:AWS_ACCESS_KEY_ID='...'; $env:AWS_SECRET_ACCESS_KEY='...'; node scripts/aws-export-helper-setup.mjs
import { AwsClient } from 'aws4fetch';

const ACCOUNT = process.env.AWS_ACCOUNT_ID || '437659978697';
const REGION = process.env.AWS_REGION || 'eu-central-2';
const WORKER_USER = process.env.AWS_WORKER_USER || 'Claude';
const BUCKET = `gitvm-exports-${ACCOUNT}`;
const ROLE = 'gitvm-export-helper';

const creds = { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY };
const iamc = new AwsClient({ ...creds, region: 'us-east-1', service: 'iam' });
const s3c = new AwsClient({ ...creds, region: REGION, service: 's3' });

async function iam(params) {
  const body = new URLSearchParams({ Version: '2010-05-08', ...params }).toString();
  const r = await iamc.fetch('https://iam.amazonaws.com/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  return { ok: r.ok, status: r.status, text: await r.text() };
}
const ok = (r, label) => {
  if (r.ok) console.log(`✅ ${label}`);
  else if (/EntityAlreadyExists|BucketAlreadyOwnedByYou|Duplicate/i.test(r.text)) console.log(`• ${label} (existe déjà)`);
  else console.log(`ERR ${label}: ${r.status} ${r.text.slice(0, 300)}`);
};

// 1. S3 bucket
{
  const r = await s3c.fetch(`https://${BUCKET}.s3.${REGION}.amazonaws.com/`, {
    method: 'PUT',
    body: `<CreateBucketConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><LocationConstraint>${REGION}</LocationConstraint></CreateBucketConfiguration>`,
  });
  ok({ ok: r.ok, status: r.status, text: await r.text() }, `Bucket S3 ${BUCKET}`);
}

// 2. Helper role + instance profile
const trust = JSON.stringify({ Version: '2012-10-17', Statement: [{ Effect: 'Allow', Principal: { Service: 'ec2.amazonaws.com' }, Action: 'sts:AssumeRole' }] });
ok(await iam({ Action: 'CreateRole', RoleName: ROLE, AssumeRolePolicyDocument: trust }), `Rôle ${ROLE}`);

const rolePolicy = JSON.stringify({
  Version: '2012-10-17',
  Statement: [
    { Effect: 'Allow', Action: ['ec2:CreateVolume', 'ec2:AttachVolume', 'ec2:DetachVolume', 'ec2:DeleteVolume', 'ec2:DescribeVolumes', 'ec2:ModifyInstanceAttribute', 'ec2:CreateTags'], Resource: '*' },
    { Effect: 'Allow', Action: ['s3:PutObject'], Resource: `arn:aws:s3:::${BUCKET}/*` },
  ],
});
ok(await iam({ Action: 'PutRolePolicy', RoleName: ROLE, PolicyName: 'gitvm-export-helper-policy', PolicyDocument: rolePolicy }), 'Policy du rôle');
ok(await iam({ Action: 'CreateInstanceProfile', InstanceProfileName: ROLE }), `Instance profile ${ROLE}`);
ok(await iam({ Action: 'AddRoleToInstanceProfile', InstanceProfileName: ROLE, RoleName: ROLE }), 'Rôle ajouté au profile');

// 3. Worker user (Claude): PassRole + S3 read + EC2 describe for the export flow
const userPolicy = JSON.stringify({
  Version: '2012-10-17',
  Statement: [
    { Effect: 'Allow', Action: ['iam:PassRole'], Resource: `arn:aws:iam::${ACCOUNT}:role/${ROLE}` },
    { Effect: 'Allow', Action: ['s3:GetObject', 's3:ListBucket'], Resource: [`arn:aws:s3:::${BUCKET}`, `arn:aws:s3:::${BUCKET}/*`] },
    { Effect: 'Allow', Action: ['ec2:DescribeImages'], Resource: '*' },
  ],
});
ok(await iam({ Action: 'PutUserPolicy', UserName: WORKER_USER, PolicyName: 'gitvm-export', PolicyDocument: userPolicy }), `Policy export sur user ${WORKER_USER}`);

console.log('\nFait. Bucket + rôle + droits en place. Le bouton « Générer le disque » est actif.');
