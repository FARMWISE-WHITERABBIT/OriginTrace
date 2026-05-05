'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Organization {
  id: number;
  name: string;
  commodity_types: string[];
  slug?: string;
  subscription_status?: string;
  logo_url?: string;
  settings?: Record<string, unknown>;
  invite_code?: string;
  active_lgas?: string[];
  commodities?: unknown[];
  subscription_tier?: string;
  feature_flags?: Record<string, boolean>;
  agent_seat_limit?: number;
  monthly_collection_limit?: number;
  data_region?: string;
  brand_colors?: { primary?: string; secondary?: string; accent?: string } | null;
  preferred_currency?: string;
}

interface Profile {
  id: number;
  user_id: string;
  org_id?: number;
  role: string;
  full_name: string;
  email?: string;
  assigned_state?: string;
  assigned_lga?: string;
}

interface ImpersonationState {
  isImpersonating: boolean;
  orgId?: number;
  orgName?: string;
  expiresAt?: string;
}

interface OrgContextType {
  organization: Organization | null;
  profile: Profile | null;
  isLoading: boolean;
  isConfigured: boolean;
  isSystemAdmin: boolean;
  impersonation: ImpersonationState;
  setOrganization: (org: Organization | null) => void;
  refreshProfile: () => Promise<void>;
  startImpersonation: (orgId: number) => Promise<boolean>;
  stopImpersonation: () => Promise<void>;
}

const OrgContext = createContext<OrgContextType | undefined>(undefined);

export function OrgProvider({ children }: { children: ReactNode }) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [impersonation, setImpersonation] = useState<ImpersonationState>({ isImpersonating: false });
  const supabase = createClient();
  const isConfigured = supabase !== null;
  const pathname = usePathname();
  const isSuperadminRoute = pathname?.startsWith('/superadmin');

  const checkImpersonation = async () => {
    try {
      const response = await fetch('/api/impersonate');
      if (response.ok) {
        const data = await response.json();
        if (data.impersonating) {
          setImpersonation({
            isImpersonating: true,
            orgId: data.org_id,
            orgName: data.org_name,
            expiresAt: data.expires_at
          });
          return data.org_id;
        }
      }
    } catch (error) {
      console.error('Failed to check impersonation:', error);
    }
    setImpersonation({ isImpersonating: false });
    return null;
  };

  const refreshProfile = async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setProfile(null);
      setOrganization(null);
      setIsSystemAdmin(false);
      setImpersonation({ isImpersonating: false });
      setIsLoading(false);
      return;
    }

    try {
      const impersonatedOrgId = await checkImpersonation();
      
      let response = await fetch('/api/profile');
      if (response.status === 503) {
        await new Promise(r => setTimeout(r, 2000));
        response = await fetch('/api/profile');
      }
      if (!response.ok) {
        if (response.status !== 401 && response.status !== 503) {
          try {
            const errorData = await response.json();
            console.error('Profile API error:', errorData);
          } catch {
            console.error('Profile API error: status', response.status);
          }
        }
        setProfile(null);
        setOrganization(null);
        setIsSystemAdmin(false);
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      
      if (data.profile) {
        setProfile(data.profile as Profile);
        setIsSystemAdmin(data.isSystemAdmin || false);
        
        const hydrateOrgTier = (org: any): Organization | null => {
          if (!org) return null;
          const s = org.settings || {};
          // Resolve tier: explicit column first, then settings JSONB fallback, then default
          // VALID tiers only — reject legacy values like 'trial', 'free', 'growth'
          const VALID_TIERS = ['starter', 'basic', 'pro', 'enterprise'];
          const rawTier = org.subscription_tier || s.subscription_tier;
          // null/unset means billing not yet configured — pass through as undefined
          // so hasTierAccess() grants full access rather than capping at 'starter'
          const resolvedTier = VALID_TIERS.includes(rawTier) ? rawTier : undefined;
          return {
            ...org,
            subscription_tier: resolvedTier,
            subscription_status: org.subscription_status || 'active',
            feature_flags: org.feature_flags || s.feature_flags || {},
            agent_seat_limit: org.agent_seat_limit ?? s.agent_seat_limit ?? 5,
            monthly_collection_limit: org.monthly_collection_limit ?? s.monthly_collection_limit ?? 1000,
            data_region: org.data_region || s.data_region,
            preferred_currency: (org.preferred_currency as string) || (s.preferred_currency as string) || 'NGN',
            settings: { ...s, preferred_currency: (org.preferred_currency as string) || (s.preferred_currency as string) || 'NGN' },
          } as Organization;
        };

        if (impersonatedOrgId && data.isSystemAdmin) {
          const orgResponse = await fetch(`/api/settings`);
          if (orgResponse.ok) {
            const orgData = await orgResponse.json();
            if (orgData.organization) {
              setOrganization(hydrateOrgTier(orgData.organization));
            } else {
              setOrganization(hydrateOrgTier(data.organization));
            }
          } else {
            setOrganization(hydrateOrgTier(data.organization));
          }
        } else {
          setOrganization(hydrateOrgTier(data.organization));
        }
      } else {
        console.warn('No profile found for user:', user.id);
        setProfile(null);
        setOrganization(null);
        setIsSystemAdmin(false);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      setProfile(null);
      setOrganization(null);
      setIsSystemAdmin(false);
    }
    
    setIsLoading(false);
  };

  const startImpersonation = async (orgId: number): Promise<boolean> => {
    try {
      const response = await fetch('/api/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', org_id: orgId })
      });
      
      if (response.ok) {
        const data = await response.json();
        setImpersonation({
          isImpersonating: true,
          orgId: data.impersonation.org_id,
          orgName: data.impersonation.org_name,
          expiresAt: data.impersonation.expires_at
        });
        await refreshProfile();
        return true;
      }
    } catch (error) {
      console.error('Failed to start impersonation:', error);
    }
    return false;
  };

  const stopImpersonation = async () => {
    try {
      await fetch('/api/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
      });
      setImpersonation({ isImpersonating: false });
      await refreshProfile();
    } catch (error) {
      console.error('Failed to stop impersonation:', error);
    }
  };

  useEffect(() => {
    if (isSuperadminRoute) {
      setIsLoading(false);
      return;
    }

    refreshProfile();

    if (!supabase) return;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      if (!isSuperadminRoute) {
        refreshProfile();
      }
    });

    return () => subscription.unsubscribe();
  }, [isSuperadminRoute]);

  return (
    <OrgContext.Provider value={{ 
      organization, 
      profile, 
      isLoading, 
      isConfigured,
      isSystemAdmin,
      impersonation,
      setOrganization,
      refreshProfile,
      startImpersonation,
      stopImpersonation
    }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  const context = useContext(OrgContext);
  if (context === undefined) {
    throw new Error('useOrg must be used within an OrgProvider');
  }
  return context;
}
