import type { BandMember, Role } from '../types/band.ts';

export function memberDisplayName(
  member: Pick<BandMember, 'name' | 'stageName'>,
): string {
  return member.stageName?.trim() || member.name;
}

export function roleDisplayName(role: Role, isSuperAdmin = false): string {
  if (isSuperAdmin) return 'Super Admin';
  if (role === 'admin') return 'Band Admin';
  if (role === 'member') return 'Band Member';
  return 'Band Guest';
}
