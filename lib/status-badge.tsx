import { Badge } from '@/components/ui/badge';
import {
  Check,
  X,
  Clock,
  Truck,
  Lock,
} from 'lucide-react';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

interface StatusConfig {
  label: string;
  variant: BadgeVariant;
  className?: string;
  icon?: React.ReactNode;
}

const STATUS_CONFIGS: Record<string, Record<string, StatusConfig>> = {
  document: {
    active: { label: 'Active', variant: 'default' },
    expiring_soon: { label: 'Expiring Soon', variant: 'secondary' },
    expired: { label: 'Expired', variant: 'destructive' },
    archived: { label: 'Archived', variant: 'outline' },
  },
  bag: {
    collected: { label: 'Collected', variant: 'default', className: 'bg-blue-600' },
    processed: { label: 'Processed', variant: 'default', className: 'bg-green-600' },
    unused: { label: 'Unused', variant: 'secondary' },
  },
  farm: {
    approved: {
      label: 'Approved',
      variant: 'default',
      className: 'bg-green-600',
      icon: <Check className="h-3 w-3 mr-1" />,
    },
    rejected: {
      label: 'Rejected',
      variant: 'destructive',
      icon: <X className="h-3 w-3 mr-1" />,
    },
    pending: {
      label: 'Pending',
      variant: 'secondary',
      icon: <Clock className="h-3 w-3 mr-1" />,
    },
  },
  sync: {
    pending: { label: 'Pending', variant: 'outline', className: 'text-amber-600 border-amber-300' },
    syncing: { label: 'Syncing', variant: 'outline', className: 'text-blue-600 border-blue-300' },
    synced: { label: 'Synced', variant: 'outline', className: 'text-green-600 border-green-300' },
    error: { label: 'Failed', variant: 'outline', className: 'text-red-600 border-red-300' },
  },
  batch: {
    dispatched: {
      label: 'Dispatched',
      variant: 'default',
      className: 'bg-green-600',
      icon: <Truck className="h-3 w-3 mr-1" />,
    },
    resolved: {
      label: 'Resolved',
      variant: 'default',
      icon: <Lock className="h-3 w-3 mr-1" />,
    },
    collecting: {
      label: 'Collecting',
      variant: 'secondary',
      icon: <Clock className="h-3 w-3 mr-1" />,
    },
  },
  subscription: {
    active: { label: 'active', variant: 'default' },
    trial: { label: 'trial', variant: 'secondary' },
    suspended: { label: 'suspended', variant: 'destructive' },
    cancelled: { label: 'cancelled', variant: 'outline' },
  },
  compliance: {
    approved: { label: 'Approved', variant: 'outline', className: 'text-green-600 border-green-300' },
    pending: { label: 'Pending', variant: 'outline', className: 'text-amber-600 border-amber-300' },
    rejected: { label: 'Rejected', variant: 'outline', className: 'text-red-600 border-red-300' },
  },
};

export type StatusDomain = keyof typeof STATUS_CONFIGS;

interface StatusBadgeProps {
  domain: StatusDomain;
  status: string;
  className?: string;
  'data-testid'?: string;
}

export function StatusBadge({ domain, status, className, ...props }: StatusBadgeProps) {
  const domainConfigs = STATUS_CONFIGS[domain];
  const config = domainConfigs?.[status];

  if (!config) {
    return (
      <Badge variant="outline" className={className} {...props}>
        {status}
      </Badge>
    );
  }

  return (
    <Badge
      variant={config.variant}
      className={[config.className, className].filter(Boolean).join(' ')}
      {...props}
    >
      {config.icon}
      {config.label}
    </Badge>
  );
}

export function getStatusBadgeVariant(domain: StatusDomain, status: string): BadgeVariant {
  return STATUS_CONFIGS[domain]?.[status]?.variant || 'outline';
}

export function getStatusLabel(domain: StatusDomain, status: string): string {
  return STATUS_CONFIGS[domain]?.[status]?.label || status;
}
