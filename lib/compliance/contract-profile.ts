export interface ContractProfileRecord {
  id: string;
  org_id: string;
}

export function profileBelongsToExporter(
  exporterOrgId: string,
  complianceProfileId: string,
  profile: ContractProfileRecord | null
): boolean {
  return Boolean(
    profile
    && profile.id === complianceProfileId
    && profile.org_id === exporterOrgId
  );
}

export function contractAndShipmentProfilesMatch(
  contractProfileId: string | null,
  shipmentProfileId: string | null
): boolean {
  return contractProfileId === shipmentProfileId;
}
