'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { 
  LogOut,
  Building2,
  AlertCircle,
  Wifi,
  WifiOff,
  ChevronDown,
  Settings,
  Lock,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { useOrg } from '@/lib/contexts/org-context';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { getNavigationConfig, UserRole } from '@/lib/config/navigation';
import { hasTierAccess, TIER_LABELS, type SubscriptionTier } from '@/lib/config/tier-gating';
import { useOnlineStatus } from '@/lib/hooks/use-online-status';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useState, useEffect } from 'react';

interface ImpersonationSession {
  org_id: string;
  org_name: string;
}

export function AppSidebar() {
  const pathname = usePathname();
  const { profile, organization, isLoading, isSystemAdmin } = useOrg();
  const { state } = useSidebar();
  const router = useRouter();
  const supabase = createClient();
  const isOnline = useOnlineStatus();
  const [impersonation, setImpersonation] = useState<ImpersonationSession | null>(null);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Check for impersonation session
  useEffect(() => {
    async function checkImpersonation() {
      try {
        const res = await fetch('/api/impersonate');
        if (res.ok) {
          const data = await res.json();
          if (data.impersonating) {
            setImpersonation({
              org_id: data.org_id,
              org_name: data.org_name || 'Unknown Org'
            });
          } else {
            setImpersonation(null);
          }
        }
      } catch (err) {
        console.error('Failed to check impersonation:', err);
      }
    }
    if (isSystemAdmin) {
      checkImpersonation();
    }
  }, [isSystemAdmin]);

  // Check for unsynced records (for sync badge)
  useEffect(() => {
    async function checkUnsyncedRecords() {
      try {
        if (typeof window !== 'undefined' && 'indexedDB' in window) {
          const { getSyncStats } = await import('@/lib/offline/sync-store');
          const stats = await getSyncStats();
          setUnsyncedCount(stats.pending + stats.error);
        }
      } catch (err) {
        setUnsyncedCount(0);
      }
    }
    checkUnsyncedRecords();
    const interval = setInterval(checkUnsyncedRecords, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
      router.push('/');
      router.refresh();
    }
  };

  const toggleGroup = (label: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [label]: !prev[label]
    }));
  };

  // Determine user role for navigation
  let userRole: UserRole = 'agent';
  if (isSystemAdmin && pathname.startsWith('/superadmin')) {
    userRole = 'superadmin';
  } else if (isSystemAdmin || profile?.role === 'admin') {
    userRole = 'admin';
  } else if (profile?.role === 'aggregator') {
    userRole = 'aggregator';
  }

  const navConfig = getNavigationConfig(userRole);

  // Get user initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sidebar>
      <SidebarHeader className="relative">
        {/* Impersonation indicator */}
        {impersonation && (
          <div className="absolute -top-1 -right-1 z-10">
            <div className="relative">
              <AlertCircle className="h-5 w-5 text-red-500 animate-pulse" />
              <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full" />
            </div>
          </div>
        )}
        
        <div className="flex items-center gap-2 px-2">
          {organization?.logo_url ? (
            <img
              src={organization.logo_url}
              alt={organization.name}
              className="h-8 object-contain transition-all duration-200"
              style={{ maxWidth: state === 'collapsed' ? '32px' : '120px' }}
            />
          ) : (
            <Image
              src="/images/logo-white.png"
              alt="OriginTrace"
              width={state === 'collapsed' ? 32 : 120}
              height={32}
              className="transition-all duration-200"
              style={{ width: 'auto' }}
            />
          )}
        </div>
        
        {state === 'expanded' && (
          <div className="px-2 mt-2 space-y-1">
            {organization && (
              <div className="flex items-center gap-2 text-xs text-sidebar-foreground/70">
                <Building2 className="h-3 w-3" />
                <span className="truncate">{organization.name}</span>
              </div>
            )}
            {impersonation && (
              <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded">
                <AlertCircle className="h-3 w-3" />
                <span className="truncate">Impersonating: {impersonation.org_name}</span>
              </div>
            )}
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="bg-sidebar">
        {navConfig.groups.map((group) => (
          <SidebarGroup key={group.label}>
            <Collapsible
              open={state === 'collapsed' ? true : !collapsedGroups[group.label]}
              onOpenChange={() => { if (state === 'expanded') toggleGroup(group.label); }}
            >
              {state === 'expanded' && (
                <CollapsibleTrigger asChild>
                  <SidebarGroupLabel className="cursor-pointer hover:bg-sidebar-accent/50 rounded flex items-center justify-between pr-2">
                    <span>{group.label}</span>
                    <ChevronDown 
                      className={`h-3 w-3 transition-transform ${
                        collapsedGroups[group.label] ? '-rotate-90' : ''
                      }`}
                    />
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
              )}
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => {
                      const isActive = pathname === item.url || 
                        (item.url !== '/app' && item.url !== '/superadmin' && pathname.startsWith(item.url + '/'));
                      const showSyncBadge = item.badge === 'sync' && unsyncedCount > 0;
                      const isTierLocked = item.tierFeature && !hasTierAccess(
                        organization?.subscription_tier,
                        item.tierFeature
                      );
                      
                      if (isTierLocked) {
                        return (
                          <SidebarMenuItem key={item.title}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <SidebarMenuButton
                                  className="opacity-50 cursor-not-allowed"
                                  data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}-locked`}
                                >
                                  <div className="relative">
                                    <item.icon className="h-4 w-4" />
                                    {state === 'collapsed' && (
                                      <Lock className="absolute -top-1 -right-1.5 h-2.5 w-2.5 text-sidebar-foreground/60" />
                                    )}
                                  </div>
                                  {state === 'expanded' && (
                                    <span className="flex-1">{item.title}</span>
                                  )}
                                  {state === 'expanded' && (
                                    <Lock className="h-3.5 w-3.5 text-sidebar-foreground/50" />
                                  )}
                                </SidebarMenuButton>
                              </TooltipTrigger>
                              <TooltipContent side="right">
                                <p>Upgrade to {TIER_LABELS[item.requiredTier as SubscriptionTier]} to unlock</p>
                              </TooltipContent>
                            </Tooltip>
                          </SidebarMenuItem>
                        );
                      }

                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton 
                            asChild 
                            isActive={isActive}
                          >
                            <Link 
                              href={item.url} 
                              data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                              {...(item.tourId ? { 'data-tour': item.tourId } : {})}
                            >
                              <div className="relative">
                                <item.icon className="h-4 w-4" />
                                {showSyncBadge && (
                                  <span className="absolute -top-1 -right-1 h-2 w-2 bg-orange-500 rounded-full" />
                                )}
                              </div>
                              {state === 'expanded' && (
                                <span className="flex-1">{item.title}</span>
                              )}
                              {state === 'expanded' && showSyncBadge && (
                                <Badge variant="secondary" className="h-5 px-1.5 text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                                  {unsyncedCount}
                                </Badge>
                              )}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {/* Sync Status Indicator */}
        <div className="px-2 py-2">
          <div className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded ${
            isOnline 
              ? 'bg-green-500/10 text-green-600 dark:text-green-400' 
              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
          }`}>
            {isOnline ? (
              <>
                <Wifi className="h-3 w-3" />
                <span>{state === 'expanded' ? 'Connected' : ''}</span>
                {state === 'expanded' && unsyncedCount > 0 && (
                  <span className="ml-auto text-orange-500">{unsyncedCount} pending</span>
                )}
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3" />
                <span>{state === 'expanded' ? 'Offline Mode' : ''}</span>
              </>
            )}
          </div>
        </div>

        {/* User Profile Section */}
        {profile && (
          <div className="px-2 py-2">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary/20 text-primary text-sm">
                  {getInitials(profile.full_name || 'User')}
                </AvatarFallback>
              </Avatar>
              {state === 'expanded' && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    {profile.full_name}
                  </p>
                  <p className="text-xs text-sidebar-foreground/60 capitalize">
                    {userRole === 'superadmin' ? 'Platform Admin' : profile.role}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings & Logout */}
        <div className="px-2 pb-2 space-y-1">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start gap-2 text-sidebar-foreground/70"
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
            {state === 'expanded' && <span>Sign Out</span>}
          </Button>
        </div>

        {state === 'expanded' && organization?.logo_url && (
          <div className="px-3 pb-2">
            <p className="text-[10px] text-sidebar-foreground/40 text-center" data-testid="text-powered-by">
              Powered by OriginTrace
            </p>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
