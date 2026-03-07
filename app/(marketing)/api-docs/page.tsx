import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API Documentation | OriginTrace',
  description: 'Enterprise API documentation for OriginTrace - access batches, shipments, and farms data programmatically.',
};

function CodeBlock({ children, title }: { children: string; title?: string }) {
  return (
    <div className="rounded-md border bg-muted/30 overflow-hidden" data-testid={title ? `code-block-${title.toLowerCase().replace(/\s+/g, '-')}` : undefined}>
      {title && (
        <div className="px-4 py-2 border-b bg-muted/50 text-xs font-medium text-muted-foreground">
          {title}
        </div>
      )}
      <pre className="p-4 overflow-x-auto text-sm">
        <code>{children}</code>
      </pre>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="space-y-4" data-testid={`section-${id}`}>
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

export default function ApiDocsPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
          OriginTrace Enterprise API
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Programmatic access to your supply chain data. Available on Enterprise plans.
        </p>
      </div>

      <nav className="space-y-1" data-testid="nav-table-of-contents">
        <p className="text-sm font-medium text-muted-foreground mb-2">Table of Contents</p>
        {[
          { href: '#authentication', label: 'Authentication' },
          { href: '#rate-limiting', label: 'Rate Limiting' },
          { href: '#batches', label: 'GET /api/v1/batches' },
          { href: '#shipments', label: 'GET /api/v1/shipments' },
          { href: '#farms', label: 'GET /api/v1/farms' },
          { href: '#api-keys', label: 'Managing API Keys' },
          { href: '#errors', label: 'Error Handling' },
        ].map(item => (
          <a
            key={item.href}
            href={item.href}
            className="block text-sm text-muted-foreground hover:text-foreground py-1"
            data-testid={`link-toc-${item.href.slice(1)}`}
          >
            {item.label}
          </a>
        ))}
      </nav>

      <Section id="authentication" title="Authentication">
        <p className="text-sm text-muted-foreground">
          All API requests require a valid API key passed as a Bearer token in the Authorization header.
          API keys are scoped to your organization and can be created from Settings.
        </p>
        <CodeBlock title="Request Header">{`Authorization: Bearer your-api-key-here`}</CodeBlock>
        <p className="text-sm text-muted-foreground">
          API keys have scopes that control access. The <code className="bg-muted px-1 rounded text-xs">read</code> scope
          is required for all GET endpoints.
        </p>
      </Section>

      <Section id="rate-limiting" title="Rate Limiting">
        <p className="text-sm text-muted-foreground">
          API requests are rate-limited per key. The default limit is 1,000 requests per hour.
          Rate limit headers are included in every response.
        </p>
        <CodeBlock title="Rate Limit Headers">{`X-RateLimit-Remaining: 995
X-RateLimit-Reset: 1700000000`}</CodeBlock>
        <p className="text-sm text-muted-foreground">
          When the limit is exceeded, the API returns a <code className="bg-muted px-1 rounded text-xs">429</code> status
          with a <code className="bg-muted px-1 rounded text-xs">retry_after</code> field in seconds.
        </p>
      </Section>

      <Section id="batches" title="GET /api/v1/batches">
        <p className="text-sm text-muted-foreground">
          Retrieve collection batches for your organization. Supports filtering by status and pagination.
        </p>
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Query Parameters</h3>
          <div className="text-sm space-y-1 text-muted-foreground">
            <p><code className="bg-muted px-1 rounded text-xs">status</code> - Filter by batch status (collecting, completed, aggregated, shipped)</p>
            <p><code className="bg-muted px-1 rounded text-xs">limit</code> - Number of results (default: 100, max: 500)</p>
            <p><code className="bg-muted px-1 rounded text-xs">offset</code> - Offset for pagination (default: 0)</p>
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

      <Section id="shipments" title="GET /api/v1/shipments">
        <p className="text-sm text-muted-foreground">
          Retrieve shipments for your organization with readiness scores and compliance decisions.
        </p>
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Query Parameters</h3>
          <div className="text-sm space-y-1 text-muted-foreground">
            <p><code className="bg-muted px-1 rounded text-xs">status</code> - Filter by shipment status (draft, ready, shipped, cancelled)</p>
            <p><code className="bg-muted px-1 rounded text-xs">limit</code> - Number of results (default: 100, max: 500)</p>
            <p><code className="bg-muted px-1 rounded text-xs">offset</code> - Offset for pagination (default: 0)</p>
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

      <Section id="farms" title="GET /api/v1/farms">
        <p className="text-sm text-muted-foreground">
          Retrieve registered farms for your organization with compliance status.
        </p>
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Query Parameters</h3>
          <div className="text-sm space-y-1 text-muted-foreground">
            <p><code className="bg-muted px-1 rounded text-xs">compliance_status</code> - Filter by compliance status (pending, approved, rejected)</p>
            <p><code className="bg-muted px-1 rounded text-xs">limit</code> - Number of results (default: 100, max: 500)</p>
            <p><code className="bg-muted px-1 rounded text-xs">offset</code> - Offset for pagination (default: 0)</p>
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

      <Section id="api-keys" title="Managing API Keys">
        <p className="text-sm text-muted-foreground">
          API keys can be managed through the internal API (requires session authentication as an admin user).
        </p>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-2">Create a Key</h3>
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
            <h3 className="text-sm font-medium mb-2">List Keys</h3>
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
            <h3 className="text-sm font-medium mb-2">Revoke a Key</h3>
            <CodeBlock title="DELETE /api/keys?id=...">{`curl -X DELETE "https://app.origintrace.io/api/keys?id=key-uuid-here" \\
  -H "Cookie: <session-cookies>"

// Response:
{ "success": true, "message": "API key revoked" }`}</CodeBlock>
          </div>
        </div>
      </Section>

      <Section id="errors" title="Error Handling">
        <p className="text-sm text-muted-foreground">
          The API uses standard HTTP status codes. All error responses include a JSON body with an <code className="bg-muted px-1 rounded text-xs">error</code> field.
        </p>
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-3 py-2 border-b">
            <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono shrink-0">401</code>
            <span className="text-muted-foreground">Invalid or missing API key</span>
          </div>
          <div className="flex items-start gap-3 py-2 border-b">
            <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono shrink-0">403</code>
            <span className="text-muted-foreground">Insufficient scope for the requested resource</span>
          </div>
          <div className="flex items-start gap-3 py-2 border-b">
            <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono shrink-0">429</code>
            <span className="text-muted-foreground">Rate limit exceeded - check retry_after field</span>
          </div>
          <div className="flex items-start gap-3 py-2">
            <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono shrink-0">500</code>
            <span className="text-muted-foreground">Internal server error</span>
          </div>
        </div>
        <CodeBlock title="Error Response">{`{
  "error": "Invalid or expired API key"
}`}</CodeBlock>
      </Section>

      <div className="border-t pt-8 text-center text-sm text-muted-foreground" data-testid="section-footer">
        <p>Need help? Contact support or visit the OriginTrace dashboard to manage your API keys.</p>
      </div>
    </div>
  );
}
