import { AwsClient } from 'aws4fetch';
import type { Env } from './types';
import { PRESETS } from './presets';

// Minimal EC2 client. EC2 uses the AWS "query" protocol (form-encoded params,
// XML responses). We extract only the few fields we need with regex — the
// response shapes for these actions are stable and simple.

function client(env: Env): AwsClient {
  return new AwsClient({
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    region: env.AWS_REGION,
    service: 'ec2',
  });
}

async function ec2(env: Env, params: Record<string, string>): Promise<string> {
  const body = new URLSearchParams({ Version: '2016-11-15', ...params }).toString();
  const res = await client(env).fetch(`https://ec2.${env.AWS_REGION}.amazonaws.com/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const text = await res.text();
  if (!res.ok) {
    const msg = text.match(/<Message>([^<]+)<\/Message>/)?.[1] ?? `${res.status}`;
    throw new Error(`EC2 ${params.Action} failed: ${msg}`);
  }
  return text;
}

function extract(xml: string, tag: string): string | undefined {
  return xml.match(new RegExp(`<${tag}>([^<]+)</${tag}>`))?.[1];
}

export interface KeyPair {
  keyName: string;
  privateKey: string; // PEM / OpenSSH private key material
}

// Generate a fresh SSH key pair for one VM. AWS keeps the public half and
// returns the private key once — we store it (encrypted) and hand it to the user.
export async function createKeyPair(env: Env, requestId: number): Promise<KeyPair> {
  const keyName = `vm-portal-req-${requestId}`;
  // Delete any leftover with the same name (idempotent re-provision).
  await ec2(env, { Action: 'DeleteKeyPair', KeyName: keyName }).catch(() => {});
  const xml = await ec2(env, { Action: 'CreateKeyPair', KeyName: keyName, KeyType: 'ed25519' });
  const privateKey = extract(xml, 'keyMaterial');
  if (!privateKey) throw new Error('CreateKeyPair: no keyMaterial in response');
  return { keyName, privateKey };
}

export async function deleteKeyPair(env: Env, keyName: string): Promise<void> {
  await ec2(env, { Action: 'DeleteKeyPair', KeyName: keyName }).catch(() => {});
}

export interface LaunchResult {
  instanceId: string;
}

export async function launchInstance(
  env: Env,
  requestId: number,
  preset: string,
  keyName: string
): Promise<LaunchResult> {
  const p = PRESETS[preset];
  if (!p) throw new Error(`unknown preset ${preset}`);
  if (!env.AWS_AMI_ID || !env.AWS_SUBNET_ID || !env.AWS_SECURITY_GROUP_ID) {
    throw new Error('AWS resource config missing (AMI / subnet / security group)');
  }

  const params: Record<string, string> = {
    Action: 'RunInstances',
    ImageId: env.AWS_AMI_ID,
    InstanceType: p.instanceType,
    MinCount: '1',
    MaxCount: '1',
    KeyName: keyName,
    'NetworkInterface.1.DeviceIndex': '0',
    'NetworkInterface.1.SubnetId': env.AWS_SUBNET_ID,
    'NetworkInterface.1.AssociatePublicIpAddress': 'true',
    'NetworkInterface.1.SecurityGroupId.1': env.AWS_SECURITY_GROUP_ID,
    'TagSpecification.1.ResourceType': 'instance',
    'TagSpecification.1.Tag.1.Key': 'Name',
    'TagSpecification.1.Tag.1.Value': `vm-portal-req-${requestId}`,
    'TagSpecification.1.Tag.2.Key': 'managed-by',
    'TagSpecification.1.Tag.2.Value': 'git-vm-portal',
    'TagSpecification.1.Tag.3.Key': 'request-id',
    'TagSpecification.1.Tag.3.Value': String(requestId),
  };

  const xml = await ec2(env, params);
  const instanceId = extract(xml, 'instanceId');
  if (!instanceId) throw new Error('RunInstances: no instanceId in response');
  return { instanceId };
}

export interface InstanceStatus {
  state: string;
  publicIp?: string;
}

export async function describeInstance(env: Env, instanceId: string): Promise<InstanceStatus> {
  const xml = await ec2(env, { Action: 'DescribeInstances', 'InstanceId.1': instanceId });
  const state = xml.match(/<instanceState>[\s\S]*?<name>([^<]+)<\/name>/)?.[1] ?? 'unknown';
  const publicIp = extract(xml, 'ipAddress');
  return { state, publicIp };
}

export async function terminateInstance(env: Env, instanceId: string): Promise<void> {
  await ec2(env, { Action: 'TerminateInstances', 'InstanceId.1': instanceId });
}
