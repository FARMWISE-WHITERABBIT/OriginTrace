'use client';

import Link from 'next/link';
import { MarketingNav } from '@/components/marketing/nav';
import { MarketingFooter } from '@/components/marketing/footer';
import HeroBackground from '@/components/marketing/hero-background';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/marketing/motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Code2,
  Key,
  Shield,
  Zap,
  ArrowRight,
  Copy,
  Check,
  AlertCircle,
  Clock,
  Lock,
  Package,
  Truck,
  Sprout,
} from 'lucide-react';
import { useState } from 'react';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
      aria-label="Copy to clipboard"
      data-testid="button-copy-code"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function CodeBlock({ children, title }: { children: string; title?: string }) {
  return (
    <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 overflow-hidden" data-testid={title ? `code-block-${title.toLowerCase().replace(/\s+/g, '-')}` : undefined}>
      {title && (
        <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center justify-between gap-2 flex-wrap">
          <span>{title}</span>
          <CopyButton text={children} />
        </div>
      )}
      <pre className="p-4 overflow-x-auto text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        <code>{children}</code>
      </pre>
    </div>
  );
}

function Section({ id, title, icon: Icon, children }: { id: string; title: string; icon?: React.ElementType; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-5" data-testid={`section-${id}`}>
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-9 h-9 rounded-md bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
            <Icon className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
          </div>
        )}
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function EndpointCard({ method, path, description, icon: Icon }: { method: string; path: string; description: string; icon: React.ElementType }) {
  return (
    <Card className="hover-elevate">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-md bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded">{method}</span>
              <code className="text-sm font-mono text-slate-700 dark:text-slate-300">{path}</code>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const tocItems = [
  { href: '#authentication', label: 'Authentication', icon: Key },
  { href: '#rate-limiting', label: 'Rate Limiting', icon: Clock },
  { href: '#batches', label: 'GET /api/v1/batches', icon: Package },
  { href: '#shipments', label: 'GET /api/v1/shipments', icon: Truck },
  { href: '#farms', label: 'GET /api/v1/farms', icon: Sprout },
  { href: '#api-keys', label: 'Managing API Keys', icon: Lock },
  { href: '#errors', label: 'Error Handling', icon: AlertCircle },
];

export default function ApiDocsContent() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <MarketingNav />

      <div className="relative pt-16">
        <HeroBackground />
        <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 md:py-28">
          <FadeIn>
            <div className="max-w-3xl">
              <span className="inline-block text-xs font-semibold tracking-widest text-emerald-600 dark:text-emerald-400 uppercase mb-4" data-testid="text-section-label">
                [ Developer Resources ]
              </span>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-5" data-testid="text-page-title">
                OriginTrace Enterprise API
              </h1>
              <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
                Programmatic access to your supply chain data. Integrate batches, shipments, and farm records directly into your systems with our RESTful API.
              </p>
              <div className="flex items-center gap-3 flex-wrap mt-8">
                <span className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                  <Shield className="w-4 h-4 text-emerald-500" />
                  Enterprise plans
                </span>
                <span className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                  <Zap className="w-4 h-4 text-emerald-500" />
                  RESTful JSON
                </span>
                <span className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                  <Key className="w-4 h-4 text-emerald-500" />
                  Bearer token auth
                </span>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pb-20">
        <div className="flex flex-col lg:flex-row gap-10">
          <aside className="lg:w-64 shrink-0" data-testid="nav-table-of-contents">
            <div className="lg:sticky lg:top-24">
              <p className="text-xs font-semibold tracking-widest text-slate-400 dark:text-slate-500 uppercase mb-4">On this page</p>
              <nav className="space-y-1">
                {tocItems.map(item => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2.5 text-sm text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 py-1.5 transition-colors"
                    data-testid={`link-toc-${item.href.slice(1)}`}
                  >
                    <item.icon className="w-3.5 h-3.5" />
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          <div className="flex-1 min-w-0 space-y-16">

            <FadeIn>
              <Section id="authentication" title="Authentication" icon={Key}>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  All API requests require a valid API key passed as a Bearer token in the Authorization header.
                  API keys are scoped to your organization and can be created from Settings.
                </p>
                <CodeBlock title="Request Header">{`Authorization: Bearer your-api-key-here`}</CodeBlock>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  API keys have scopes that control access. The <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs font-mono">read</code> scope
                  is required for all GET endpoints.
                </p>
              </Section>
            </FadeIn>

            <FadeIn>
              <Section id="rate-limiting" title="Rate Limiting" icon={Clock}>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  API requests are rate-limited per key. The default limit is 1,000 requests per hour.
                  Rate limit headers are included in every response.
                </p>
                <CodeBlock title="Rate Limit Headers">{`X-RateLimit-Remaining: 995
X-RateLimit-Reset: 1700000000`}</CodeBlock>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  When the limit is exceeded, the API returns a <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs font-mono">429</code> status
                  with a <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs font-mono">retry_after</code> field in seconds.
                </p>
              </Section>
            </FadeIn>

            <FadeIn>
              <div className="space-y-4">
                <span className="inline-block text-xs font-semibold tracking-widest text-emerald-600 dark:text-emerald-400 uppercase">
                  [ Endpoints ]
                </span>
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Available Endpoints</h2>
                <StaggerContainer className="grid gap-4 sm:grid-cols-3">
                  <StaggerItem>
                    <EndpointCard method="GET" path="/api/v1/batches" description="Retrieve collection batches with filtering and pagination" icon={Package} />
                  </StaggerItem>
                  <StaggerItem>
                    <EndpointCard method="GET" path="/api/v1/shipments" description="Access shipments with readiness scores and compliance data" icon={Truck} />
                  </StaggerItem>
                  <StaggerItem>
                    <EndpointCard method="GET" path="/api/v1/farms" description="Query registered farms with compliance status" icon={Sprout} />
                  </StaggerItem>
                </StaggerContainer>
              </div>
            </FadeIn>

            <FadeIn>
              <Section id="batches" title="GET /api/v1/batches" icon={Package}>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Retrieve collection batches for your organization. Supports filtering by status and pagination.
                </p>
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Query Parameters</h3>
                  <div className="text-sm space-y-2 text-slate-600 dark:text-slate-400">
                    <p><code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs font-mono">status</code> — Filter by batch status (collecting, completed, aggregated, shipped)</p>
                    <p><code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs font-mono">limit</code> — Number of results (default: 100, max: 500)</p>
                    <p><code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs font-mono">offset</code> — Offset for pagination (default: 0)</p>
                  </div>
                </div>
                <CodeBlock title="Example Request">{`curl -X GET "https://app.origintrace.io/api/v1/batches?status=completed&limit=50" \\
  -H "Authorization: Bearer fw_abc12345..."`}</CodeBlock>
                <CodeBlock title="Example Response">{`{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "farm_id": "...",
      "agent_id": "...",
      "status": "completed",
      "total_weight": 1250.5,
      "bag_count": 25,
      "notes": null,
      "collected_at": "2024-01-15T10:30:00Z",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "meta": {
    "total": 142,
    "limit": 50,
    "offset": 0
  }
}`}</CodeBlock>
              </Section>
            </FadeIn>

            <FadeIn>
              <Section id="shipments" title="GET /api/v1/shipments" icon={Truck}>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Retrieve shipments for your organization with readiness scores and compliance decisions.
                </p>
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Query Parameters</h3>
                  <div className="text-sm space-y-2 text-slate-600 dark:text-slate-400">
                    <p><code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs font-mono">status</code> — Filter by shipment status (draft, ready, shipped, cancelled)</p>
                    <p><code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs font-mono">limit</code> — Number of results (default: 100, max: 500)</p>
                    <p><code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs font-mono">offset</code> — Offset for pagination (default: 0)</p>
                  </div>
                </div>
                <CodeBlock title="Example Request">{`curl -X GET "https://app.origintrace.io/api/v1/shipments?status=ready" \\
  -H "Authorization: Bearer fw_abc12345..."`}</CodeBlock>
                <CodeBlock title="Example Response">{`{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "shipment_code": "SHP-ORG1-ABC123",
      "status": "ready",
      "destination_country": "Netherlands",
      "destination_port": "Rotterdam",
      "buyer_company": "Barry Callebaut",
      "commodity": "Cocoa",
      "total_weight_kg": 25000,
      "total_items": 50,
      "readiness_score": 92,
      "readiness_decision": "go",
      "estimated_ship_date": "2024-02-15",
      "created_at": "2024-01-20T08:00:00Z"
    }
  ],
  "meta": {
    "total": 12,
    "limit": 100,
    "offset": 0
  }
}`}</CodeBlock>
              </Section>
            </FadeIn>

            <FadeIn>
              <Section id="farms" title="GET /api/v1/farms" icon={Sprout}>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Retrieve registered farms for your organization with compliance status.
                </p>
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Query Parameters</h3>
                  <div className="text-sm space-y-2 text-slate-600 dark:text-slate-400">
                    <p><code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs font-mono">compliance_status</code> — Filter by compliance status (pending, approved, rejected)</p>
                    <p><code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs font-mono">limit</code> — Number of results (default: 100, max: 500)</p>
                    <p><code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs font-mono">offset</code> — Offset for pagination (default: 0)</p>
                  </div>
                </div>
                <CodeBlock title="Example Request">{`curl -X GET "https://app.origintrace.io/api/v1/farms?compliance_status=approved&limit=100" \\
  -H "Authorization: Bearer fw_abc12345..."`}</CodeBlock>
                <CodeBlock title="Example Response">{`{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "farmer_name": "Adebayo Ogundimu",
      "farmer_id": "NGA-12345",
      "phone": "+2348012345678",
      "community": "Ondo West",
      "area_hectares": 3.5,
      "commodity": "cocoa",
      "compliance_status": "approved",
      "created_at": "2024-01-10T12:00:00Z"
    }
  ],
  "meta": {
    "total": 320,
    "limit": 100,
    "offset": 0
  }
}`}</CodeBlock>
              </Section>
            </FadeIn>

            <FadeIn>
              <Section id="api-keys" title="Managing API Keys" icon={Lock}>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  API keys can be managed through the internal API (requires session authentication as an admin user).
                </p>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Create a Key</h3>
                    <CodeBlock title="POST /api/keys">{`curl -X POST "https://app.origintrace.io/api/keys" \\
  -H "Content-Type: application/json" \\
  -H "Cookie: <session-cookies>" \\
  -d '{
    "name": "Production Integration",
    "scopes": ["read"],
    "expires_in_days": 365,
    "rate_limit_per_hour": 2000
  }'

// Response includes the full key ONLY on creation:
{
  "key": { "id": "...", "key_prefix": "a1b2c3d4", "name": "Production Integration", ... },
  "secret": "a1b2c3d4e5f6...full-64-char-key",
  "message": "Store this key securely. It will not be shown again."
}`}</CodeBlock>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">List Keys</h3>
                    <CodeBlock title="GET /api/keys">{`curl "https://app.origintrace.io/api/keys" \\
  -H "Cookie: <session-cookies>"

// Response (key hash is never returned):
{
  "keys": [
    {
      "id": "...",
      "key_prefix": "a1b2c3d4",
      "name": "Production Integration",
      "scopes": ["read"],
      "last_used_at": "2024-01-20T15:30:00Z",
      "status": "active",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}`}</CodeBlock>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Revoke a Key</h3>
                    <CodeBlock title="DELETE /api/keys?id=...">{`curl -X DELETE "https://app.origintrace.io/api/keys?id=key-uuid-here" \\
  -H "Cookie: <session-cookies>"

// Response:
{ "success": true, "message": "API key revoked" }`}</CodeBlock>
                  </div>
                </div>
              </Section>
            </FadeIn>

            <FadeIn>
              <Section id="errors" title="Error Handling" icon={AlertCircle}>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  The API uses standard HTTP status codes. All error responses include a JSON body with an <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs font-mono">error</code> field.
                </p>
                <Card>
                  <CardContent className="p-0">
                    {[
                      { code: '401', desc: 'Invalid or missing API key' },
                      { code: '403', desc: 'Insufficient scope for the requested resource' },
                      { code: '429', desc: 'Rate limit exceeded — check retry_after field' },
                      { code: '500', desc: 'Internal server error' },
                    ].map((err, i, arr) => (
                      <div key={err.code} className={`flex items-center gap-4 px-5 py-3.5 ${i < arr.length - 1 ? 'border-b border-slate-100 dark:border-slate-800' : ''}`}>
                        <code className="text-xs font-mono font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2.5 py-1 rounded shrink-0">{err.code}</code>
                        <span className="text-sm text-slate-600 dark:text-slate-400">{err.desc}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <CodeBlock title="Error Response">{`{
  "error": "Invalid or expired API key"
}`}</CodeBlock>
              </Section>
            </FadeIn>

          </div>
        </div>
      </div>

      <section className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28 text-center">
          <FadeIn>
            <span className="inline-block text-xs font-semibold tracking-widest text-emerald-600 dark:text-emerald-400 uppercase mb-4">
              [ Get Started ]
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
              Ready to Integrate?
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto mb-8">
              Contact our team to enable API access for your organization and start building integrations today.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link href="/demo">
                <Button className="bg-emerald-600 text-white" data-testid="button-cta-demo">
                  Request Demo
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button variant="outline" data-testid="button-cta-signin">
                  Sign In to Dashboard
                </Button>
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
