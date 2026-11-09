// CloudNotes — Cloudflare Worker entry point
// This single Worker serves two responsibilities:
//   1. Routes /api/* requests to the REST API handlers (D1 database operations)
//   2. Falls through to Workers Static Assets for all other URLs (React SPA)
//
// Security note: The D1 binding (env.DB) is only accessible inside this Worker.
// It is never serialised to JSON or forwarded to the browser.

import type { Env } from './types';
import {
  handleGetNotes,
  handleGetNote,
  handleCreateNote,
  handleUpdateNote,
  handleDeleteNote,
  handleHealth,
} from './handlers';
import { errorResponse } from './helpers';

// Security headers injected into every response (API and static)
const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

function addSecurityHeaders(response: Response): Response {
  const newHeaders = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    newHeaders.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const { pathname, method } = url as { pathname: string; method?: string } & URL;
    const httpMethod = method ?? request.method;

    // ── API Router ────────────────────────────────────────────────────────────
    if (pathname.startsWith('/api/')) {
      let response: Response;

      // Block unsupported HTTP methods on the API
      const allowed = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'];
      if (!allowed.includes(httpMethod)) {
        response = errorResponse('Method not allowed', 405);
        return addSecurityHeaders(response);
      }

      // CORS preflight — single-origin app, permissive enough for local dev
      if (httpMethod === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400',
          },
        });
      }

      const pathParts = pathname.split('/').filter(Boolean);
      // pathParts[0] = 'api', pathParts[1] = resource, pathParts[2] = id

      try {
        // GET /api/health
        if (pathname === '/api/health') {
          response = await handleHealth(env);

        // GET /api/notes  or  GET /api/notes?q=search
        } else if (pathname === '/api/notes' && httpMethod === 'GET') {
          response = await handleGetNotes(request, env);

        // POST /api/notes
        } else if (pathname === '/api/notes' && httpMethod === 'POST') {
          response = await handleCreateNote(request, env);

        // GET /api/notes/:id
        } else if (pathParts.length === 3 && pathParts[1] === 'notes' && httpMethod === 'GET') {
          response = await handleGetNote(pathParts, env);

        // PUT /api/notes/:id
        } else if (pathParts.length === 3 && pathParts[1] === 'notes' && httpMethod === 'PUT') {
          response = await handleUpdateNote(request, pathParts, env);

        // DELETE /api/notes/:id
        } else if (pathParts.length === 3 && pathParts[1] === 'notes' && httpMethod === 'DELETE') {
          response = await handleDeleteNote(pathParts, env);

        } else {
          response = errorResponse('API endpoint not found', 404);
        }
      } catch (err) {
        // Last-resort catch — do not leak error details
        console.error('Unhandled Worker error:', err);
        response = errorResponse('Internal server error', 500);
      }

      return addSecurityHeaders(response);
    }

    // ── Static Assets — React SPA ─────────────────────────────────────────────
    // All non-API requests are forwarded to Workers Static Assets.
    // The `not_found_handling: single-page-application` setting in wrangler.jsonc
    // ensures that unknown paths serve index.html so React Router can handle them.
    const assetResponse = await env.ASSETS.fetch(request);
    return addSecurityHeaders(assetResponse);
  },
} satisfies ExportedHandler<Env>;
