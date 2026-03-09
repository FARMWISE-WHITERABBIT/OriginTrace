export interface LocationState { id: number; name: string; }
export interface LocationLGA { id: number; name: string; state_id: number; }

export interface Farmer {
  id: string;
  farmer_name: string;
  phone?: string;
  community: string;
}

export interface Farm {
  id: string;
  farmer_name: string;
  community: string;
  commodity?: string;
  area_hectares?: number;
  compliance_status: string;
  boundary?: any;
}

export interface Contributor {
  farmer: Farmer;
  farms: Farm[];
}

export interface InventoryEntry {
  farm_id: string;
  farmer_name: string;
  community: string;
  bag_count: number;
  weight_kg: number;
  area_hectares?: number;
  has_boundary: boolean;
  compliance_status: string;
}

export interface ComplianceFlag {
  type: 'polygon_missing' | 'overlap' | 'yield_warning';
  farm_id: string;
  farmer_name: string;
  message: string;
  severity: 'info' | 'warning';
}

export const STEPS = [
  { id: 1, label: 'Batch Identity', icon: 'MapPin' as const },
  { id: 2, label: 'Contributors', icon: 'Users' as const },
  { id: 3, label: 'Select Farms', icon: 'TreePine' as const },
  { id: 4, label: 'Log Inventory', icon: 'Package' as const },
  { id: 5, label: 'Compliance', icon: 'ShieldCheck' as const },
  { id: 6, label: 'Finalize', icon: 'CheckCircle' as const },
];
