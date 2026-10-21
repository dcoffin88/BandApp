import type { BandMember } from '../types/band.ts';

export function memberDisplayName(
  member: Pick<BandMember, 'name' | 'stageName'>,
): string {
  return member.stageName?.trim() || member.name;
}
