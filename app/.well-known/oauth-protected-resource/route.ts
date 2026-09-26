import { NextResponse } from 'next/server';

function origin(request: Request) { return new URL(request.url).origin; }

export async function GET(request: Request) {
  const base = origin(request);
  return NextResponse.json({
    resource: `${base}/api/mcp`,
    authorization_servers: [base],
    scopes_supported: ['health:read', 'health:write'],
    resource_documentation: `${base}/login`,
  });
}
