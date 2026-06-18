export interface Preset {
  id: string;
  label: string;
  instanceType: string;
  vcpu: number;
  ramGb: number;
}

export const PRESETS: Record<string, Preset> = {
  small: { id: 'small', label: 'Small — 2 vCPU / 2 Go', instanceType: 't3.small', vcpu: 2, ramGb: 2 },
  medium: { id: 'medium', label: 'Medium — 2 vCPU / 4 Go', instanceType: 't3.medium', vcpu: 2, ramGb: 4 },
  large: { id: 'large', label: 'Large — 2 vCPU / 8 Go', instanceType: 't3.large', vcpu: 2, ramGb: 8 },
};

export function isValidPreset(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(PRESETS, id);
}
