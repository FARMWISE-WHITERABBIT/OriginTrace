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
  Store,
  Gavel,
  Upload,
  CreditCard as CreditCardIcon,
  ScanLine,
  BookOpen,
  FlaskConical,
  Wallet,
  Banknote,
  ScrollText,
  Truck,
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
  allowedRoles: UserRole[];
  requiredTier?: SubscriptionTier;
  tierFeature?: TierFeature;
}

export interface MenuGroup {
  label: string;
  items: MenuItem[];
  allowedRoles: UserRole[];
}

export interface NavigationConfig {
  groups: MenuGroup[];
}

const superadminNavigation: NavigationConfig = {
  groups: [
    {
      label: 'PLATFORM',
      allowedRoles: ['superadmin'],
      items: [
        { title: 'Overview', url: '/superadmin', icon: LayoutDashboard, allowedRoles: ['superadmin'] },
        { title: 'Organizations', url: '/superadmin/organizations', icon: Building2, allowedRoles: ['superadmin'] },
        { title: 'User Management', url: '/superadmin/users', icon: Users, allowedRoles: ['superadmin'] },
        { title: 'Tenant Health', url: '/superadmin/tenant-health', icon: Gauge, allowedRoles: ['superadmin'] },
        { title: 'Buyer Organizations', url: '/superadmin/buyer-orgs', icon: Handshake, allowedRoles: ['superadmin'] },
        { title: 'Billing', url: '/superadmin/billing', icon: CreditCardIcon, allowedRoles: ['superadmin'] },
      ],
    },
    {
      label: 'MONITORING',
      allowedRoles: ['superadmin'],
      items: [
        { title: 'War Room', url: '/superadmin/health', icon: HeartPulse, allowedRoles: ['superadmin'] },
        { title: 'Sync Status', url: '/superadmin/sync', icon: RefreshCw, allowedRoles: ['superadmin'] },
      ],
    },
    {
      label: 'CONFIGURATION',
      allowedRoles: ['superadmin'],
      items: [
        { title: 'Feature Toggles', url: '/superadmin/feature-toggles', icon: Settings, allowedRoles: ['superadmin'] },
        { title: 'Commodity Master', url: '/superadmin/commodities', icon: Wheat, allowedRoles: ['superadmin'] },
        { title: 'Location Data', url: '/superadmin/locations', icon: Globe, allowedRoles: ['superadmin'] },
      ],
    },
  ],
};

const appNavigation: NavigationConfig = {
  groups: [
    // ── 1. OVERVIEW ──────────────────────────────────────────────────────────
    {
      label: 'OVERVIEW',
      allowedRoles: ['admin', 'aggregator', 'agent', 'quality_manager', 'logistics_coordinator', 'compliance_officer', 'warehouse_supervisor'],
      items: [
        { title: 'Dashboard', url: '/app', icon: PieChart, tourId: 'nav-dashboard', allowedRoles: ['admin', 'aggregator', 'agent', 'quality_manager', 'logistics_coordinator', 'compliance_officer', 'warehouse_supervisor'] },
      ],
    },

    // ── 2. FARMERS & FARMS ────────────────────────────────────────────────────
    {
      label: 'FARMERS & FARMS',
      allowedRoles: ['admin', 'aggregator', 'agent', 'quality_manager', 'compliance_officer'],
      items: [
        { title: 'Farmers', url: '/app/farmers', icon: Users, tourId: 'nav-farmers', allowedRoles: ['admin', 'aggregator', 'quality_manager'], requiredTier: 'starter', tierFeature: 'farmers_list' },
        { title: 'Register Farmer', url: '/app/farmers/new', icon: UserPlus, tourId: 'nav-register', allowedRoles: ['admin', 'aggregator', 'agent'], requiredTier: 'starter', tierFeature: 'farmer_registration' },
        { title: 'Farm Polygons', url: '/app/farms', icon: Layers, tourId: 'nav-farm-polygons', allowedRoles: ['admin', 'quality_manager', 'compliance_officer'], requiredTier: 'starter', tierFeature: 'farm_polygons' },
        { title: 'Boundary Conflicts', url: '/app/conflicts', icon: AlertTriangle, badge: 'alert', tourId: 'nav-conflicts', allowedRoles: ['admin', 'compliance_officer'], requiredTier: 'pro', tierFeature: 'boundary_conflicts' },
      ],
    },

    // ── 3. COLLECTION ─────────────────────────────────────────────────────────
    {
      label: 'COLLECTION',
      allowedRoles: ['admin', 'aggregator', 'agent', 'quality_manager', 'logistics_coordinator', 'warehouse_supervisor'],
      items: [
        { title: 'Smart Collect', url: '/app/collect', icon: PlusCircle, tourId: 'nav-collect', allowedRoles: ['admin', 'aggregator', 'agent'], requiredTier: 'starter', tierFeature: 'smart_collect' },
        { title: 'Inventory', url: '/app/inventory', icon: Warehouse, tourId: 'nav-inventory', allowedRoles: ['admin', 'aggregator', 'logistics_coordinator', 'warehouse_supervisor'], requiredTier: 'starter', tierFeature: 'inventory' },
        { title: 'Dispatch', url: '/app/inventory?tab=dispatch', icon: Truck, tourId: 'nav-dispatch', allowedRoles: ['admin', 'aggregator', 'logistics_coordinator', 'warehouse_supervisor'], requiredTier: 'basic', tierFeature: 'dispatch' },
        { title: 'Yield Alerts', url: '/app/yield-alerts', icon: AlertTriangle, badge: 'alert', tourId: 'nav-yield-alerts', allowedRoles: ['admin', 'aggregator', 'quality_manager'], requiredTier: 'basic', tierFeature: 'yield_alerts' },
        { title: 'Sync', url: '/app/sync', icon: RefreshCw, badge: 'sync', tourId: 'nav-sync', allowedRoles: ['admin', 'aggregator', 'agent'], requiredTier: 'starter', tierFeature: 'sync_dashboard' },
      ],
    },

    // ── 3b. FINANCE ───────────────────────────────────────────────────────────
    {
      label: 'FINANCE',
      allowedRoles: ['admin', 'aggregator', 'logistics_coordinator', 'compliance_officer'],
      items: [
        { title: 'Payments', url: '/app/payments', icon: DollarSign, tourId: 'nav-payments', allowedRoles: ['admin', 'aggregator', 'logistics_coordinator', 'compliance_officer'], requiredTier: 'basic', tierFeature: 'payments' },
      ],
    },

    // ── 4. PROCESSING & EXPORT ────────────────────────────────────────────────
    {
      label: 'PROCESSING & EXPORT',
      allowedRoles: ['admin', 'aggregator', 'logistics_coordinator', 'compliance_officer', 'warehouse_supervisor'],
      items: [
        { title: 'Processing Runs', url: '/app/processing', icon: Factory, tourId: 'nav-processing', allowedRoles: ['admin', 'compliance_officer'], requiredTier: 'pro', tierFeature: 'processing' },
        { title: 'Pedigree', url: '/app/pedigree', icon: QrCode, tourId: 'nav-pedigree', allowedRoles: ['admin', 'compliance_officer'], requiredTier: 'pro', tierFeature: 'pedigree' },
        { title: 'Product Passport', url: '/app/dpp', icon: Fingerprint, tourId: 'nav-dpp', allowedRoles: ['admin', 'compliance_officer'], requiredTier: 'enterprise', tierFeature: 'digital_product_passport' },
        { title: 'Shipments', url: '/app/shipments', icon: Ship, tourId: 'nav-shipments', allowedRoles: ['admin', 'logistics_coordinator', 'compliance_officer'], requiredTier: 'pro', tierFeature: 'shipment_readiness' },
        { title: 'Service Providers', url: '/app/service-providers', icon: Store, allowedRoles: ['admin', 'logistics_coordinator'], requiredTier: 'pro', tierFeature: 'shipment_readiness' },
        { title: 'Shipment Templates', url: '/app/shipment-templates', icon: BookOpen, allowedRoles: ['admin', 'logistics_coordinator'], requiredTier: 'pro', tierFeature: 'shipment_readiness' },
        { title: 'DDS Export', url: '/app/dds', icon: FileText, tourId: 'nav-dds', allowedRoles: ['admin', 'compliance_officer'], requiredTier: 'pro', tierFeature: 'dds_export' },
      ],
    },

    // ── 5. COMPLIANCE ─────────────────────────────────────────────────────────
    {
      label: 'COMPLIANCE',
      allowedRoles: ['admin', 'aggregator', 'quality_manager', 'compliance_officer', 'warehouse_supervisor'],
      items: [
        { title: 'Traceability', url: '/app/traceability', icon: Database, tourId: 'nav-traceability', allowedRoles: ['admin', 'aggregator', 'quality_manager', 'compliance_officer'], requiredTier: 'starter', tierFeature: 'traceability' },
        { title: 'Scan & Verify', url: '/app/verify', icon: ScanLine, tourId: 'nav-verify', allowedRoles: ['admin', 'aggregator', 'agent', 'quality_manager', 'warehouse_supervisor'], requiredTier: 'starter', tierFeature: 'scan_verify' },
        { title: 'Lab Results', url: '/app/lab-results', icon: FlaskConical, tourId: 'nav-lab-results', allowedRoles: ['admin', 'compliance_officer', 'quality_manager', 'logistics_coordinator'], requiredTier: 'pro', tierFeature: 'compliance_profiles' },
        { title: 'Compliance Profiles', url: '/app/settings?tab=compliance', icon: ShieldCheck, allowedRoles: ['admin', 'compliance_officer'], requiredTier: 'pro', tierFeature: 'compliance_profiles' },
        { title: 'Audit Log', url: '/app/audit', icon: ScrollText, allowedRoles: ['admin', 'compliance_officer'], requiredTier: 'basic', tierFeature: 'payments' },
      ],
    },

    // ── 6. TRADE ──────────────────────────────────────────────────────────────
    {
      label: 'TRADE',
      allowedRoles: ['admin', 'aggregator', 'logistics_coordinator', 'compliance_officer'],
      items: [
        { title: 'Buyers', url: '/app/buyers', icon: Handshake, tourId: 'nav-buyers', allowedRoles: ['admin'], requiredTier: 'pro', tierFeature: 'buyer_portal' },
        { title: 'Contracts', url: '/app/contracts', icon: FileCheck, allowedRoles: ['admin'], requiredTier: 'pro', tierFeature: 'contracts' },
        { title: 'Marketplace', url: '/app/tenders', icon: Store, allowedRoles: ['admin', 'aggregator', 'logistics_coordinator', 'compliance_officer'], requiredTier: 'pro', tierFeature: 'contracts' },
      ],
    },

    // ── 7. PEOPLE ─────────────────────────────────────────────────────────────
    {
      label: 'PEOPLE',
      allowedRoles: ['admin', 'aggregator'],
      items: [
        { title: 'Field Agents', url: '/app/agents', icon: Users, tourId: 'nav-agents', allowedRoles: ['admin', 'aggregator'], requiredTier: 'basic', tierFeature: 'agents' },
        { title: 'Team', url: '/app/team', icon: Users2, allowedRoles: ['admin'] },
        { title: 'Delegations', url: '/app/delegations', icon: Shield, tourId: 'nav-delegations', allowedRoles: ['admin'], requiredTier: 'pro', tierFeature: 'delegations' },
      ],
    },

    // ── 8. ANALYTICS ─────────────────────────────────────────────────────────
    {
      label: 'ANALYTICS',
      allowedRoles: ['admin', 'aggregator', 'quality_manager', 'compliance_officer'],
      items: [
        { title: 'Analytics', url: '/app/analytics', icon: BarChart3, tourId: 'nav-analytics', allowedRoles: ['admin', 'aggregator', 'quality_manager', 'compliance_officer'], requiredTier: 'basic', tierFeature: 'analytics' },
        { title: 'Report Builder', url: '/app/analytics/reports', icon: FileText, allowedRoles: ['admin', 'compliance_officer'], requiredTier: 'pro', tierFeature: 'analytics' },
      ],
    },

    // ── 9. CONFIGURATION ─────────────────────────────────────────────────────
    {
      label: 'CONFIGURATION',
      allowedRoles: ['admin', 'aggregator'],
      items: [
        { title: 'Settings', url: '/app/settings', icon: Settings, allowedRoles: ['admin', 'aggregator'] },
        { title: 'Data Vault', url: '/app/data-vault', icon: Download, allowedRoles: ['admin'], requiredTier: 'enterprise', tierFeature: 'data_vault' },
        { title: 'Document Vault', url: '/app/documents', icon: FolderOpen, tourId: 'nav-documents', allowedRoles: ['admin', 'quality_manager', 'logistics_coordinator', 'compliance_officer', 'warehouse_supervisor'], requiredTier: 'starter', tierFeature: 'documents' },
        { title: 'API Keys', url: '/app/settings?tab=api-keys', icon: Key, allowedRoles: ['admin'], requiredTier: 'enterprise', tierFeature: 'enterprise_api' },
        { title: 'Guide', url: '/app/guide', icon: BookOpen, allowedRoles: ['admin', 'aggregator', 'agent', 'quality_manager', 'compliance_officer', 'logistics_coordinator', 'warehouse_supervisor'] },
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
        { title: 'Dashboard', url: '/app/buyer', icon: PieChart, tourId: 'nav-buyer-dashboard', allowedRoles: ['buyer'] },
      ],
    },
    {
      label: 'SUPPLY CHAIN',
      allowedRoles: ['buyer'],
      items: [
        { title: 'Suppliers', url: '/app/buyer/suppliers', icon: Handshake, tourId: 'nav-buyer-suppliers', allowedRoles: ['buyer'] },
        { title: 'Contracts', url: '/app/buyer/contracts', icon: FileCheck, tourId: 'nav-buyer-contracts', allowedRoles: ['buyer'] },
        { title: 'Shipments', url: '/app/buyer/shipments', icon: Ship, tourId: 'nav-buyer-shipments', allowedRoles: ['buyer'] },
      ],
    },
    {
      label: 'SOURCING',
      allowedRoles: ['buyer'],
      items: [
        { title: 'Tenders', url: '/app/buyer/tenders', icon: Gavel, tourId: 'nav-buyer-tenders', allowedRoles: ['buyer'] },
      ],
    },
    {
      label: 'VERIFICATION',
      allowedRoles: ['buyer'],
      items: [
        { title: 'Traceability', url: '/app/buyer/traceability', icon: Database, tourId: 'nav-buyer-traceability', allowedRoles: ['buyer'] },
        { title: 'Documents', url: '/app/buyer/documents', icon: FolderOpen, tourId: 'nav-buyer-documents', allowedRoles: ['buyer'] },
      ],
    },
  ],
};

export function getNavigationConfig(role: UserRole): NavigationConfig {
  if (role === 'superadmin') return superadminNavigation;
  if (role === 'buyer') return buyerNavigation;
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
  { title: 'Collect', url: '/app/collect', icon: PlusCircle, allowedRoles: ['agent', 'aggregator', 'admin'], requiredTier: 'starter', tierFeature: 'smart_collect' },
  { title: 'Register', url: '/app/farmers/new', icon: UserPlus, allowedRoles: ['agent', 'aggregator', 'admin'], requiredTier: 'starter', tierFeature: 'farmer_registration' },
  { title: 'Map', url: '/app/farms/map', icon: Map, allowedRoles: ['agent', 'aggregator', 'admin'], requiredTier: 'starter', tierFeature: 'farm_mapping' },
  { title: 'Sync', url: '/app/sync', icon: RefreshCw, allowedRoles: ['agent', 'aggregator', 'admin'], requiredTier: 'starter', tierFeature: 'sync_dashboard' },
];
