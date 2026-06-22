// One-off: attache une policy inline au user IAM (snapshots EBS + AMI + export OVA).
import { AwsClient } from 'aws4fetch';

const USER = process.env.AWS_IAM_USER || 'Claude';
const c = new AwsClient({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: 'us-east-1',
  service: 'iam',
});

const policy = {
  Version: '2012-10-17',
  Statement: [
    {
      Effect: 'Allow',
      Action: [
        'ec2:CreateSnapshot', 'ec2:DescribeSnapshots', 'ec2:DeleteSnapshot',
        'ec2:RegisterImage', 'ec2:DeregisterImage', 'ec2:DescribeImages',
        'ec2:DescribeVolumes', 'ec2:DescribeInstances', 'ec2:CreateTags',
        'ec2:CreateInstanceExportTask', 'ec2:DescribeExportTasks', 'ec2:CancelExportTask',
      ],
      Resource: '*',
    },
    {
      Effect: 'Allow',
      Action: ['s3:CreateBucket', 's3:PutObject', 's3:GetObject', 's3:ListBucket', 's3:PutBucketPolicy', 's3:GetBucketLocation'],
      Resource: ['arn:aws:s3:::gitvm-exports-*', 'arn:aws:s3:::gitvm-exports-*/*'],
    },
    {
      Effect: 'Allow',
      Action: ['iam:CreateRole', 'iam:PutRolePolicy', 'iam:GetRole', 'iam:CreatePolicy', 'iam:PassRole'],
      Resource: '*',
    },
  ],
};

const body = new URLSearchParams({
  Action: 'PutUserPolicy',
  Version: '2010-05-08',
  UserName: USER,
  PolicyName: 'gitvm-snapshots-export',
  PolicyDocument: JSON.stringify(policy),
}).toString();

const r = await c.fetch('https://iam.amazonaws.com/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body,
});
const text = await r.text();
console.log(r.ok ? `✅ Policy attachee au user ${USER}` : 'ERR ' + r.status + ': ' + (text.match(/<Message>([^<]+)/)?.[1] ?? text.slice(0, 300)));
