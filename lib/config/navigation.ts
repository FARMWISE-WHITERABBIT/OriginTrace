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
} from 'lucide-react';
import type { AppRole } from '@/lib/rbac';
import type { SubscriptionTier, TierFeature } from '@/lib/config/tier-gating';

export type UserRole = 'superadmin' | 'admin' | 'aggregator' | 'agent';

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
      allowedRoles: ['admin', 'aggregator', 'agent'],
      items: [
        { title: 'Dashboard', url: '/app', icon: PieChart, tourId: 'nav-dashboard', allowedRoles: ['admin', 'aggregator', 'agent'] },
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
      allowedRoles: ['admin', 'aggregator'],
      items: [
        { title: 'Inventory', url: '/app/inventory', icon: Warehouse, tourId: 'nav-inventory', allowedRoles: ['admin', 'aggregator'], requiredTier: 'pro', tierFeature: 'inventory' },
        { title: 'Bags', url: '/app/bags', icon: Package, tourId: 'nav-bags', allowedRoles: ['admin', 'aggregator'], requiredTier: 'pro', tierFeature: 'bags' },
        { title: 'Traceability', url: '/app/traceability', icon: Database, tourId: 'nav-traceability', allowedRoles: ['admin', 'aggregator'], requiredTier: 'pro', tierFeature: 'traceability' },
        { title: 'Scan & Verify', url: '/app/verify', icon: QrCode, tourId: 'nav-verify', allowedRoles: ['admin', 'aggregator', 'agent'], requiredTier: 'basic', tierFeature: 'scan_verify' },
        { title: 'Yield Alerts', url: '/app/yield-alerts', icon: AlertTriangle, badge: 'alert', tourId: 'nav-yield-alerts', allowedRoles: ['admin', 'aggregator'], requiredTier: 'pro', tierFeature: 'yield_alerts' },
      ],
    },
    {
      label: 'EXPORT READINESS',
      allowedRoles: ['admin'],
      items: [
        { title: 'Shipment Readiness', url: '/app/shipments', icon: Ship, tourId: 'nav-shipments', allowedRoles: ['admin'], requiredTier: 'pro', tierFeature: 'shipment_readiness' },
        { title: 'DDS Exports', url: '/app/dds', icon: FileText, tourId: 'nav-dds', allowedRoles: ['admin'], requiredTier: 'enterprise', tierFeature: 'dds_export' },
      ],
    },
    {
      label: 'COMPLIANCE',
      allowedRoles: ['admin'],
      items: [
        { title: 'Farm Polygons', url: '/app/farms', icon: Map, tourId: 'nav-farm-polygons', allowedRoles: ['admin'], requiredTier: 'enterprise', tierFeature: 'farm_polygons' },
        { title: 'Boundary Conflicts', url: '/app/conflicts', icon: Layers, badge: 'alert', tourId: 'nav-conflicts', allowedRoles: ['admin'], requiredTier: 'enterprise', tierFeature: 'boundary_conflicts' },
        { title: 'Compliance Review', url: '/app/compliance', icon: ClipboardCheck, tourId: 'nav-compliance', allowedRoles: ['admin'], requiredTier: 'enterprise', tierFeature: 'compliance_review' },
      ],
    },
    {
      label: 'PROCESSING',
      allowedRoles: ['admin'],
      items: [
        { title: 'Processing Runs', url: '/app/processing', icon: Factory, tourId: 'nav-processing', allowedRoles: ['admin'], requiredTier: 'enterprise', tierFeature: 'processing' },
        { title: 'Pedigree', url: '/app/pedigree', icon: QrCode, tourId: 'nav-pedigree', allowedRoles: ['admin'], requiredTier: 'enterprise', tierFeature: 'pedigree' },
      ],
    },
    {
      label: 'GOVERNANCE',
      allowedRoles: ['admin'],
      items: [
        { title: 'Delegations', url: '/app/delegations', icon: Shield, tourId: 'nav-delegations', allowedRoles: ['admin'], requiredTier: 'enterprise', tierFeature: 'delegations' },
      ],
    },
    {
      label: 'NETWORK',
      allowedRoles: ['admin', 'aggregator'],
      items: [
        { title: 'Farmers', url: '/app/farmers', icon: Users, allowedRoles: ['admin', 'aggregator'], requiredTier: 'pro', tierFeature: 'farmers_list' },
        { title: 'Field Agents', url: '/app/agents', icon: Users, allowedRoles: ['admin', 'aggregator'], requiredTier: 'pro', tierFeature: 'agents' },
        { title: 'Team', url: '/app/team', icon: Users2, allowedRoles: ['admin'] },
      ],
    },
    {
      label: 'CONFIGURATION',
      allowedRoles: ['admin', 'aggregator'],
      items: [
        { title: 'Settings', url: '/app/settings', icon: Settings, allowedRoles: ['admin', 'aggregator'] },
        { title: 'Data Vault', url: '/app/data-vault', icon: Download, allowedRoles: ['admin'], requiredTier: 'enterprise', tierFeature: 'data_vault' },
      ],
    },
  ],
};

export function getNavigationConfig(role: UserRole): NavigationConfig {
  if (role === 'superadmin') {
    return superadminNavigation;
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
