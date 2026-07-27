import { describe, expect, it } from 'vitest';
import {
  contractAndShipmentProfilesMatch,
  profileBelongsToExporter,
} from '@/lib/compliance/contract-profile';

describe('contract compliance profile ownership', () => {
  it('accepts a profile owned by the selected linked exporter', () => {
    expect(profileBelongsToExporter('exporter-a', 'profile-a', {
      id: 'profile-a',
      org_id: 'exporter-a',
    })).toBe(true);
  });

  it('rejects a profile belonging to another exporter', () => {
    expect(profileBelongsToExporter('exporter-a', 'profile-b', {
      id: 'profile-b',
      org_id: 'exporter-b',
    })).toBe(false);
  });

  it('rejects an unresolved profile', () => {
    expect(profileBelongsToExporter('exporter-a', 'profile-missing', null)).toBe(false);
  });
});

describe('contract and shipment profile alignment', () => {
  it('accepts identical assigned profiles', () => {
    expect(contractAndShipmentProfilesMatch('profile-a', 'profile-a')).toBe(true);
  });

  it('rejects different or one-sided profile assignments', () => {
    expect(contractAndShipmentProfilesMatch('profile-a', 'profile-b')).toBe(false);
    expect(contractAndShipmentProfilesMatch('profile-a', null)).toBe(false);
    expect(contractAndShipmentProfilesMatch(null, 'profile-a')).toBe(false);
  });

  it('permits an explicitly unprofiled contract and shipment pair', () => {
    expect(contractAndShipmentProfilesMatch(null, null)).toBe(true);
  });
});
