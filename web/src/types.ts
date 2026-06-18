export type Role = 'member' | 'admin';

export interface User {
  email: string;
  name: string;
  role: Role;
}

export interface Preset {
  id: string;
  label: string;
  instanceType: string;
  vcpu: number;
  ramGb: number;
}

export type Status =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'provisioning'
  | 'active'
  | 'failed'
  | 'terminated';

export interface VmRequest {
  id: number;
  user_email: string;
  purpose: string;
  preset: string;
  region: string;
  status: Status;
  admin_note: string | null;
  decided_by: string | null;
  created_at: string;
  decided_at: string | null;
  public_ip?: string | null;
  ssh_key_name?: string | null;
  aws_instance_id?: string | null;
  vm_state?: string | null;
  has_key?: number;
}
