import { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Building2,
  Users,
  PieChart,
  Map,
  Database,
  Users2,
  FileText,
  Settings,
  Warehouse,
  UserPlus,
  RefreshCw,
  Package,
  ClipboardCheck,
  Search,
  HeartPulse,
  AlertTriangle,
  Gauge,
  Layers,
  Download,
  QrCode,
  Factory,
  Wheat,
  Globe,
  PlusCircle,
  Shield,
  Ship,
  FolderOpen,
  DollarSign,
  BarChart3,
  ShieldCheck,
  Handshake,
  FileCheck,
  CreditCard,
  Fingerprint,
  Key,
  ScrollText,
  Store,
  Gavel,
} from 'lucide-react';
import type { AppRole } from '@/lib/rbac';
import type { SubscriptionTier, TierFeature } from '@/lib/config/tier-gating';

export type UserRole = 'superadmin' | AppRole;

export interface MenuItem {
  title: string;
  url: string;
  icon: LucideIcon;
  badge?: 'sync' | 'alert';
  tourId?: string;
  allowedRoles: AppRole[];
  requiredTier?: SubscriptionTier;
  tierFeature?: TierFeature;
}

export interface MenuGroup {
  label: string;
  items: MenuItem[];
  allowedRoles: AppRole[];
}

export interface NavigationConfig {
  groups: MenuGroup[];
}

const superadminNavigation: NavigationConfig = {
  groups: [
    {
      label: 'PLATFORM',
      allowedRoles: ['admin', 'aggregator', 'agent'],
      items: [
        { title: 'Overview', url: '/superadmin', icon: LayoutDashboard, allowedRoles: ['admin', 'aggregator', 'agent'] },
        { title: 'Organizations', url: '/superadmin/organizations', icon: Building2, allowedRoles: ['admin', 'aggregator', 'agent'] },
        { title: 'User Management', url: '/superadmin/users', icon: Users, allowedRoles: ['admin', 'aggregator', 'agent'] },
        { title: 'Tenant Health', url: '/superadmin/tenant-health', icon: Gauge, allowedRoles: ['admin', 'aggregator', 'agent'] },
        { title: 'Buyer Organizations', url: '/superadmin/buyer-orgs', icon: Handshake, allowedRoles: ['admin', 'aggregator', 'agent'] },
      ],
    },
    {
      label: 'MONITORING',
      allowedRoles: ['admin', 'aggregator', 'agent'],
      items: [
        { title: 'War Room', url: '/superadmin/health', icon: HeartPulse, allowedRoles: ['admin', 'aggregator', 'agent'] },
        { title: 'Sync Status', url: '/superadmin/sync', icon: RefreshCw, allowedRoles: ['admin', 'aggregator', 'agent'] },
      ],
    },
    {
      label: 'CONFIGURATION',
      allowedRoles: ['admin', 'aggregator', 'agent'],
      items: [
        { title: 'Feature Toggles', url: '/superadmin/feature-toggles', icon: Settings, allowedRoles: ['admin', 'aggregator', 'agent'] },
        { title: 'Commodity Master', url: '/superadmin/commodities', icon: Wheat, allowedRoles: ['admin', 'aggregator', 'agent'] },
        { title: 'Location Data', url: '/superadmin/locations', icon: Globe, allowedRoles: ['admin', 'aggregator', 'agent'] },
      ],
    },
  ],
};

const appNavigation: NavigationConfig = {
  groups: [
    {
      label: 'OVERVIEW',
      allowedRoles: ['admin', 'aggregator', 'agent', 'quality_manager', 'logistics_coordinator', 'compliance_officer', 'warehouse_supervisor'],
      items: [
        { title: 'Dashboard', url: '/app', icon: PieChart, tourId: 'nav-dashboard', allowedRoles: ['admin', 'aggregator', 'agent', 'quality_manager', 'logistics_coordinator', 'compliance_officer', 'warehouse_supervisor'] },
      ],
    },
    {
      label: 'FIELD WORK',
      allowedRoles: ['admin', 'aggregator', 'agent'],
      items: [
        { title: 'Smart Collect', url: '/app/collect', icon: PlusCircle, tourId: 'nav-collect', allowedRoles: ['admin', 'aggregator', 'agent'], requiredTier: 'basic', tierFeature: 'smart_collect' },
        { title: 'Register Farmer', url: '/app/farmers/new', icon: UserPlus, tourId: 'nav-register', allowedRoles: ['admin', 'aggregator', 'agent'], requiredTier: 'basic', tierFeature: 'farmer_registration' },
        { title: 'Map Farm', url: '/app/farms/map', icon: Map, tourId: 'nav-farms', allowedRoles: ['admin', 'aggregator', 'agent'], requiredTier: 'basic', tierFeature: 'farm_mapping' },
        { title: 'Sync Dashboard', url: '/app/sync', icon: RefreshCw, badge: 'sync', tourId: 'nav-sync', allowedRoles: ['admin', 'aggregator', 'agent'], requiredTier: 'basic', tierFeature: 'sync_dashboard' },
      ],
    },
    {
      label: 'PROCUREMENT',
      allowedRoles: ['admin', 'aggregator', 'quality_manager', 'logistics_coordinator', 'warehouse_supervisor'],
      items: [
        { title: 'Inventory', url: '/app/inventory', icon: Warehouse, tourId: 'nav-inventory', allowedRoles: ['admin', 'aggregator', 'logistics_coordinator', 'warehouse_supervisor'], requiredTier: 'basic', tierFeature: 'inventory' },
        { title: 'Bags', url: '/app/bags', icon: Package, tourId: 'nav-bags', allowedRoles: ['admin', 'aggregator', 'quality_manager', 'logistics_coordinator', 'warehouse_supervisor'], requiredTier: 'basic', tierFeature: 'bags' },
        { title: 'Traceability', url: '/app/traceability', icon: Database, tourId: 'nav-traceability', allowedRoles: ['admin', 'aggregator', 'quality_manager', 'compliance_officer'], requiredTier: 'starter', tierFeature: 'traceability' },
        { title: 'Scan & Verify', url: '/app/verify', icon: QrCode, tourId: 'nav-verify', allowedRoles: ['admin', 'aggregator', 'agent', 'quality_manager', 'warehouse_supervisor'], requiredTier: 'basic', tierFeature: 'scan_verify' },
        { title: 'Yield Alerts', url: '/app/yield-alerts', icon: AlertTriangle, badge: 'alert', tourId: 'nav-yield-alerts', allowedRoles: ['admin', 'aggregator', 'quality_manager'], requiredTier: 'basic', tierFeature: 'yield_alerts' },
        { title: 'Payments', url: '/app/payments', icon: DollarSign, allowedRoles: ['admin', 'aggregator'], requiredTier: 'basic', tierFeature: 'payments' },
      ],
    },
    {
      label: 'EXPORT READINESS',
      allowedRoles: ['admin', 'logistics_coordinator', 'compliance_officer'],
      items: [
        { title: 'Shipments', url: '/app/shipments', icon: Ship, tourId: 'nav-shipments', allowedRoles: ['admin', 'logistics_coordinator', 'compliance_officer'], requiredTier: 'pro', tierFeature: 'shipment_readiness' },
        { title: 'Dispatch', url: '/app/dispatch', icon: Package, allowedRoles: ['admin', 'aggregator', 'logistics_coordinator', 'warehouse_supervisor'], requiredTier: 'basic', tierFeature: 'dispatch' },
        { title: 'DDS Exports', url: '/app/dds', icon: FileText, tourId: 'nav-dds', allowedRoles: ['admin', 'compliance_officer'], requiredTier: 'pro', tierFeature: 'dds_export' },
        { title: 'Compliance Profiles', url: '/app/compliance-profiles', icon: ShieldCheck, allowedRoles: ['admin', 'compliance_officer'], requiredTier: 'pro', tierFeature: 'compliance_profiles' },
      ],
    },
    {
      label: 'COMPLIANCE',
      allowedRoles: ['admin', 'quality_manager', 'compliance_officer'],
      items: [
        { title: 'Farm Polygons', url: '/app/farms', icon: Map, tourId: 'nav-farm-polygons', allowedRoles: ['admin', 'quality_manager', 'compliance_officer'], requiredTier: 'starter', tierFeature: 'farm_polygons' },
        { title: 'Boundary Conflicts', url: '/app/conflicts', icon: Layers, badge: 'alert', tourId: 'nav-conflicts', allowedRoles: ['admin', 'compliance_officer'], requiredTier: 'pro', tierFeature: 'boundary_conflicts' },
        { title: 'Compliance Review', url: '/app/compliance', icon: ClipboardCheck, tourId: 'nav-compliance', allowedRoles: ['admin', 'quality_manager', 'compliance_officer'], requiredTier: 'pro', tierFeature: 'compliance_review' },
        { title: 'Documents', url: '/app/documents', icon: FolderOpen, allowedRoles: ['admin', 'quality_manager', 'logistics_coordinator', 'compliance_officer', 'warehouse_supervisor'], requiredTier: 'basic', tierFeature: 'documents' },
      ],
    },
    {
      label: 'PROCESSING',
      allowedRoles: ['admin', 'compliance_officer'],
      items: [
        { title: 'Processing Runs', url: '/app/processing', icon: Factory, tourId: 'nav-processing', allowedRoles: ['admin', 'compliance_officer'], requiredTier: 'pro', tierFeature: 'processing' },
        { title: 'Pedigree', url: '/app/pedigree', icon: QrCode, tourId: 'nav-pedigree', allowedRoles: ['admin', 'compliance_officer'], requiredTier: 'pro', tierFeature: 'pedigree' },
        { title: 'Product Passport', url: '/app/dpp', icon: Fingerprint, allowedRoles: ['admin', 'compliance_officer'], requiredTier: 'enterprise', tierFeature: 'digital_product_passport' },
      ],
    },
    {
      label: 'TRADE',
      allowedRoles: ['admin', 'aggregator', 'logistics_coordinator', 'compliance_officer'],
      items: [
        { title: 'Buyers', url: '/app/buyers', icon: Handshake, allowedRoles: ['admin'], requiredTier: 'pro', tierFeature: 'buyer_portal' },
        { title: 'Contracts', url: '/app/contracts', icon: FileCheck, allowedRoles: ['admin'], requiredTier: 'pro', tierFeature: 'contracts' },
        { title: 'Marketplace', url: '/app/tenders', icon: Store, allowedRoles: ['admin', 'aggregator', 'logistics_coordinator', 'compliance_officer'], requiredTier: 'pro', tierFeature: 'contracts' },
      ],
    },
    {
      label: 'ANALYTICS & REPORTS',
      allowedRoles: ['admin', 'aggregator', 'quality_manager', 'compliance_officer'],
      items: [
        { title: 'Analytics', url: '/app/analytics', icon: BarChart3, tourId: 'nav-analytics', allowedRoles: ['admin', 'aggregator', 'quality_manager', 'compliance_officer'], requiredTier: 'basic', tierFeature: 'analytics' },
        { title: 'Report Builder', url: '/app/analytics/reports', icon: FileText, allowedRoles: ['admin', 'compliance_officer'], requiredTier: 'pro', tierFeature: 'analytics' },
      ],
    },
    {
      label: 'GOVERNANCE',
      allowedRoles: ['admin', 'compliance_officer'],
      items: [
        { title: 'Audit Log', url: '/app/audit', icon: ScrollText, allowedRoles: ['admin', 'compliance_officer'], requiredTier: 'pro', tierFeature: 'delegations' },
        { title: 'Delegations', url: '/app/delegations', icon: Shield, tourId: 'nav-delegations', allowedRoles: ['admin'], requiredTier: 'pro', tierFeature: 'delegations' },
      ],
    },
    {
      label: 'NETWORK',
      allowedRoles: ['admin', 'aggregator', 'quality_manager'],
      items: [
        { title: 'Farmers', url: '/app/farmers', icon: Users, allowedRoles: ['admin', 'aggregator', 'quality_manager'], requiredTier: 'starter', tierFeature: 'farmers_list' },
        { title: 'Field Agents', url: '/app/agents', icon: Users, allowedRoles: ['admin', 'aggregator'], requiredTier: 'basic', tierFeature: 'agents' },
        { title: 'Team', url: '/app/team', icon: Users2, allowedRoles: ['admin'] },
      ],
    },
    {
      label: 'CONFIGURATION',
      allowedRoles: ['admin', 'aggregator'],
      items: [
        { title: 'Settings', url: '/app/settings', icon: Settings, allowedRoles: ['admin', 'aggregator'] },
        { title: 'Data Vault', url: '/app/data-vault', icon: Download, allowedRoles: ['admin'], requiredTier: 'enterprise', tierFeature: 'data_vault' },
        { title: 'API Keys', url: '/app/api-keys', icon: Key, allowedRoles: ['admin'], requiredTier: 'enterprise', tierFeature: 'enterprise_api' },
      ],
    },
  ],
};

const buyerNavigation: NavigationConfig = {
  groups: [
    {
      label: 'OVERVIEW',
      allowedRoles: ['buyer'],
      items: [
        { title: 'Dashboard', url: '/app/buyer', icon: PieChart, allowedRoles: ['buyer'] },
      ],
    },
    {
      label: 'SUPPLY CHAIN',
      allowedRoles: ['buyer'],
      items: [
        { title: 'Suppliers', url: '/app/buyer/suppliers', icon: Handshake, allowedRoles: ['buyer'] },
        { title: 'Contracts', url: '/app/buyer/contracts', icon: FileCheck, allowedRoles: ['buyer'] },
        { title: 'Shipments', url: '/app/buyer/shipments', icon: Ship, allowedRoles: ['buyer'] },
      ],
    },
    {
      label: 'SOURCING',
      allowedRoles: ['buyer'],
      items: [
        { title: 'Tenders', url: '/app/buyer/tenders', icon: Gavel, allowedRoles: ['buyer'] },
      ],
    },
    {
      label: 'VERIFICATION',
      allowedRoles: ['buyer'],
      items: [
        { title: 'Traceability', url: '/app/buyer/traceability', icon: Database, allowedRoles: ['buyer'] },
        { title: 'Documents', url: '/app/buyer/documents', icon: FolderOpen, allowedRoles: ['buyer'] },
      ],
    },
  ],
};

export function getNavigationConfig(role: UserRole): NavigationConfig {
  if (role === 'superadmin') {
    return superadminNavigation;
  }

  if (role === 'buyer') {
    return buyerNavigation;
  }

  return {
    groups: appNavigation.groups
      .filter(group => group.allowedRoles.includes(role as AppRole))
      .map(group => ({
        ...group,
        items: group.items.filter(item => item.allowedRoles.includes(role as AppRole)),
      }))
      .filter(group => group.items.length > 0),
  };
}

export const agentBottomNavItems: MenuItem[] = [
  { title: 'Collect', url: '/app/collect', icon: PlusCircle, allowedRoles: ['agent', 'aggregator', 'admin'], requiredTier: 'basic', tierFeature: 'smart_collect' },
  { title: 'Register', url: '/app/farmers/new', icon: UserPlus, allowedRoles: ['agent', 'aggregator', 'admin'], requiredTier: 'basic', tierFeature: 'farmer_registration' },
  { title: 'Map', url: '/app/farms/map', icon: Map, allowedRoles: ['agent', 'aggregator', 'admin'], requiredTier: 'basic', tierFeature: 'farm_mapping' },
  { title: 'Sync', url: '/app/sync', icon: RefreshCw, allowedRoles: ['agent', 'aggregator', 'admin'], requiredTier: 'basic', tierFeature: 'sync_dashboard' },
];
