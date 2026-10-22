# ADR-001: Backend Authentication Boundary & Perimeter Strategy

## Status
**Accepted** (2026-10-22)

## Context
DC VISION is an operations portal built for NOC engineers and System Administrators to monitor physical Data Center rack elevations and Zabbix alerts.
The portal operates within an internal trusted enterprise network (Private Subnet / Operations VPN).

There was an architectural consideration of whether to build a standard JWT User/Roles Authentication System (User tables in PostgreSQL, password hashing with bcrypt, JWT token generation, refresh tokens, login forms).

## Decision
1. **No Application-Level JWT System:**
   - We explicitly decide **NOT** to build a JWT authentication and user management database layer in DC VISION.
   - Adding JWT user tables introduces substantial maintenance overhead (password resets, credential databases, session expiry handling) with zero functional benefit for internal NOC tools.
2. **Perimeter-First Security Architecture:**
   - Security and access control are delegated to the **Network / Perimeter layer**:
     - Operational VPN / Private Subnet isolation
     - Reverse Proxy / Ingress Controller (Nginx, Traefik, Cloudflare Access, or Corporate SSO)
3. **Open Health & Liveness Probes:**
   - Both `/health` and `/api/v1/health` must remain unauthenticated, publicly accessible endpoints.
   - Container orchestrators (Docker Compose healthcheck, Kubernetes liveness/readiness probes) require unauthenticated 200 OK responses to gauge backend health.
4. **Lightweight Perimeter API Key (Opt-in):**
   - For environments requiring API protection without reverse-proxy authentication, an optional `API_KEY_ENABLED=true` setting is available via `X-API-Key` HTTP header.
   - It is disabled by default (`API_KEY_ENABLED=false`) to ensure local development, CI test suites, and internal monitoring operate smoothly.

## Consequences
- **Positive:** Zero friction for local development and CI; container health checks never fail due to expired sessions; codebase remains lightweight and laser-focused on DCIM + Zabbix integration.
- **Negative:** If public exposure over the raw internet is ever required, an Ingress Reverse Proxy with SSO/Basic Auth or enabling `API_KEY_ENABLED=true` must be configured.
