'use client';

/**
 * /app/settings/subscription — Subscription status + upgrade request + GDPR actions
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const TIER_LABELS: Record<string, string> = {
  starter:    'Starter',
  basic:      'Basic',
  pro:        'Pro',
  enterprise: 'Enterprise',
};

const TIER_COLORS: Record<string, string> = {
  starter:    '#6b7280',
  basic:      '#2563eb',
  pro:        '#7c3aed',
  enterprise: '#166534',
};

const TIER_ORDER = ['starter', 'basic', 'pro', 'enterprise'];

const TIER_FEATURES: Record<string, string[]> = {
  starter:    ['Up to 50 farmers', 'Basic farm mapping', 'EUDR batch certificates', '1 user'],
  basic:      ['Up to 500 farmers', 'Full GPS mapping', 'All compliance frameworks', '5 users', 'API access'],
  pro:        ['Unlimited farmers', 'DPP (Digital Product Passport)', 'Buyer portal', '10 users', 'Webhooks', 'Analytics'],
  enterprise: ['Unlimited everything', 'Custom integrations', 'Dedicated support', 'SLA guarantee', 'Multi-org', 'On-premise option'],
};

export default function SubscriptionPage() {
  const router = useRouter();
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [requestTier, setRequestTier] = useState<string | null>(null);
  const [requestNote, setRequestNote] = useState('');
  const [requestSent, setRequestSent] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);

  // GDPR
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(d => { setOrg(d.organization || d.org); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const currentTierIdx = TIER_ORDER.indexOf(org?.subscription_tier || 'starter');
  const subStatus = org?.subscription_status || 'active';
  const expiresAt = org?.subscription_expires_at ? new Date(org.subscription_expires_at) : null;
  const graceEnds  = org?.grace_period_ends_at  ? new Date(org.grace_period_ends_at)  : null;

  const handleRequestUpgrade = async () => {
    if (!requestTier) return;
    setSendingRequest(true);
    setError('');
    try {
      const res = await fetch('/api/subscription/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: requestTier, note: requestNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRequestSent(true);
      setRequestTier(null);
      setRequestNote('');
    } catch (e: any) {
      setError(e.message || 'Failed to send request');
    } finally {
      setSendingRequest(false);
    }
  };

  const handleExport = async () => {
    setExportLoading(true);
    const res = await fetch('/api/account/export');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `origintrace-data-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportLoading(false);
  };

  const handleDelete = async () => {
    if (deleteConfirmText !== 'DELETE MY ACCOUNT') return;
    setDeleting(true);
    const res = await fetch('/api/account', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmation: 'DELETE MY ACCOUNT' }),
    });
    if (res.ok) {
      router.push('/auth/login?deleted=1');
    } else {
      const d = await res.json();
      setError(d.error || 'Failed to delete account');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: '#9ca3af', fontFamily: 'system-ui' }}>
        Loading subscription…
      </div>
    );
  }

  const currentTier = org?.subscription_tier || 'starter';

  return (
    <div style={{ maxWidth: 840, margin: '0 auto', padding: '32px 24px', fontFamily: 'system-ui, sans-serif', color: '#111' }}>

      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 6px', color: '#111827' }}>Subscription</h1>
        <p style={{ color: '#6b7280', margin: 0 }}>Manage your plan and account settings</p>
      </div>

      {/* Current plan card */}
      <div style={{
        border: `2px solid ${TIER_COLORS[currentTier]}`,
        borderRadius: 12, padding: '24px 28px', marginBottom: 32,
        background: '#f9fafb',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span style={{
                background: TIER_COLORS[currentTier], color: 'white',
                padding: '3px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600,
              }}>{TIER_LABELS[currentTier]}</span>
              {subStatus === 'grace_period' && (
                <span style={{ background: '#fef3c7', color: '#92400e', padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                  ⚠ Grace Period
                </span>
              )}
              {subStatus === 'expired' && (
                <span style={{ background: '#fee2e2', color: '#991b1b', padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                  Expired
                </span>
              )}
              {subStatus === 'active' && currentTier !== 'starter' && (
                <span style={{ background: '#dcfce7', color: '#166534', padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                  ✓ Active
                </span>
              )}
            </div>
            {expiresAt && subStatus === 'active' && (
              <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>
                Renews: <strong>{expiresAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
              </p>
            )}
            {graceEnds && subStatus === 'grace_period' && (
              <p style={{ margin: 0, color: '#92400e', fontSize: 14, fontWeight: 500 }}>
                Grace period ends: {graceEnds.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}. Renew to avoid downgrade.
              </p>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: '0 0 4px', color: '#6b7280', fontSize: 13 }}>Organisation</p>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 16 }}>{org?.name || '—'}</p>
          </div>
        </div>
      </div>

      {/* Upgrade request success banner */}
      {requestSent && (
        <div style={{
          background: '#dcfce7', border: '1px solid #86efac', borderRadius: 8,
          padding: '14px 18px', marginBottom: 28, color: '#166534', fontSize: 14,
        }}>
          ✓ Upgrade request sent. Your OriginTrace account manager will reach out shortly with a payment link.
        </div>
      )}

      {error && (
        <div style={{
          background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8,
          padding: '14px 18px', marginBottom: 28, color: '#991b1b', fontSize: 14,
        }}>{error}</div>
      )}

      {/* Plan comparison */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: '#111827' }}>Available Plans</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 40 }}>
        {TIER_ORDER.map((tier, idx) => {
          const isCurrent = tier === currentTier;
          const isUpgrade = idx > currentTierIdx;
          return (
            <div key={tier} style={{
              border: `1.5px solid ${isCurrent ? TIER_COLORS[tier] : '#e5e7eb'}`,
              borderRadius: 10, padding: '20px 16px',
              background: isCurrent ? 'white' : '#f9fafb',
              position: 'relative',
              boxShadow: isCurrent ? `0 0 0 3px ${TIER_COLORS[tier]}22` : 'none',
            }}>
              <div style={{
                display: 'inline-block', background: TIER_COLORS[tier],
                color: 'white', padding: '2px 10px', borderRadius: 12,
                fontSize: 11, fontWeight: 700, marginBottom: 10, letterSpacing: '0.05em',
              }}>{TIER_LABELS[tier].toUpperCase()}</div>
              {isCurrent && (
                <div style={{
                  position: 'absolute', top: 10, right: 10,
                  background: '#dcfce7', color: '#166534',
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                }}>CURRENT</div>
              )}
              <ul style={{ margin: '0 0 16px', padding: '0 0 0 16px', fontSize: 12, color: '#4b5563', lineHeight: 1.7 }}>
                {TIER_FEATURES[tier].map(f => <li key={f}>{f}</li>)}
              </ul>
              {isUpgrade && !requestSent && (
                <button
                  onClick={() => setRequestTier(tier)}
                  style={{
                    width: '100%', padding: '8px 0',
                    background: requestTier === tier ? TIER_COLORS[tier] : 'white',
                    color: requestTier === tier ? 'white' : TIER_COLORS[tier],
                    border: `1.5px solid ${TIER_COLORS[tier]}`,
                    borderRadius: 7, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {requestTier === tier ? 'Selected ✓' : 'Request Upgrade'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Upgrade request form */}
      {requestTier && !requestSent && (
        <div style={{
          background: 'white', border: '1.5px solid #166534',
          borderRadius: 10, padding: 24, marginBottom: 40,
        }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600, color: '#166534' }}>
            Request upgrade to {TIER_LABELS[requestTier]}
          </h3>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280' }}>
            We'll review your request and send you a payment link within 1 business day.
          </p>
          <textarea
            placeholder="Optional: tell us about your use case or any questions (helps us tailor the right plan for you)"
            value={requestNote}
            onChange={e => setRequestNote(e.target.value)}
            rows={3}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '10px 12px', border: '1px solid #d1d5db',
              borderRadius: 7, fontSize: 13, resize: 'vertical',
              fontFamily: 'inherit', marginBottom: 14, color: '#374151',
            }}
          />
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleRequestUpgrade}
              disabled={sendingRequest}
              style={{
                background: '#166534', color: 'white',
                border: 'none', borderRadius: 7, padding: '10px 24px',
                fontSize: 13, fontWeight: 600, cursor: sendingRequest ? 'not-allowed' : 'pointer',
                opacity: sendingRequest ? 0.7 : 1,
              }}
            >
              {sendingRequest ? 'Sending…' : 'Send Request'}
            </button>
            <button
              onClick={() => setRequestTier(null)}
              style={{
                background: 'white', color: '#6b7280',
                border: '1px solid #d1d5db', borderRadius: 7,
                padding: '10px 16px', fontSize: 13, cursor: 'pointer',
              }}
            >Cancel</button>
          </div>
        </div>
      )}

      {/* Contact / no pricing note */}
      <div style={{
        background: '#f0fdf4', border: '1px solid #bbf7d0',
        borderRadius: 10, padding: '18px 22px', marginBottom: 48,
        fontSize: 13, color: '#166534',
      }}>
        <strong>Custom pricing for your operation.</strong> Pricing is tailored based on your volume, geography, and compliance requirements. After you request an upgrade, your account manager will contact you to discuss the right plan and send a secure payment link.
      </div>

      {/* GDPR / Account actions */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 6, color: '#111827' }}>Account & Data</h2>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
        Your rights under the Nigeria Data Protection Act 2023 and GDPR.{" "}
        <a href="/legal/privacy" style={{ color: '#166534' }}>Privacy Policy</a>
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 480, marginBottom: 48 }}>
        <button
          onClick={handleExport}
          disabled={exportLoading}
          style={{
            background: 'white', border: '1.5px solid #166534', color: '#166534',
            padding: '12px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            cursor: exportLoading ? 'wait' : 'pointer', textAlign: 'left',
          }}
        >
          {exportLoading ? 'Preparing export…' : '⬇ Download My Data (GDPR Art. 20)'}
        </button>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          style={{
            background: 'white', border: '1.5px solid #dc2626', color: '#dc2626',
            padding: '12px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', textAlign: 'left',
          }}
        >
          ✕ Delete My Account (GDPR Art. 17)
        </button>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: 'white', borderRadius: 12, padding: 32,
            maxWidth: 460, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            <h3 style={{ margin: '0 0 10px', color: '#111827', fontSize: 18 }}>Delete account?</h3>
            <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 20px', lineHeight: 1.6 }}>
              This is permanent and cannot be undone. Your profile, API keys, and access will be removed immediately. Organisation data may be retained as required by law and your Terms of Service.
            </p>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#374151' }}>
              Type <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>DELETE MY ACCOUNT</code> to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE MY ACCOUNT"
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '10px 12px', border: '1.5px solid #d1d5db',
                borderRadius: 7, fontSize: 14, marginBottom: 20, fontFamily: 'monospace',
              }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleDelete}
                disabled={deleteConfirmText !== 'DELETE MY ACCOUNT' || deleting}
                style={{
                  background: deleteConfirmText === 'DELETE MY ACCOUNT' ? '#dc2626' : '#d1d5db',
                  color: 'white', border: 'none', borderRadius: 7,
                  padding: '10px 20px', fontSize: 13, fontWeight: 600,
                  cursor: deleteConfirmText === 'DELETE MY ACCOUNT' && !deleting ? 'pointer' : 'not-allowed',
                }}
              >
                {deleting ? 'Deleting…' : 'Delete permanently'}
              </button>
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                style={{
                  background: 'white', color: '#374151',
                  border: '1px solid #d1d5db', borderRadius: 7,
                  padding: '10px 16px', fontSize: 13, cursor: 'pointer',
                }}
              >Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
