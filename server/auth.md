# Authentication and school users

All endpoints are under `/api/v1`. Login and refresh set opaque access and
refresh tokens in HttpOnly cookies; token values are not returned in JSON.
The access cookie is scoped to `/api/v1`, and the refresh cookie to
`/api/v1/auth/refresh`. Access tokens expire after 15 minutes. Refresh tokens
expire after 30 days and are rotated on every successful refresh. Browser
clients must send requests with credentials enabled.

Cookies use `SameSite=Lax` by default and `Secure` in production. For a
cross-site frontend, set `AUTH_COOKIE_SAME_SITE=none` (which also enables
`Secure`) and configure `ALLOWED_ORIGINS`. The origin guard validates
state-changing requests.

## School registration

`POST /auth/register` creates a school, its branches and curricula, the
branch-to-curriculum offerings, and the first `ADMIN` account in one database
transaction. At least one branch and one curriculum are required. Branch curricula
must be a subset of the school's curricula.

```json
{
  "school": {
    "name": "Example Academy",
    "type": "PRIVATE",
    "email": "office@example.test",
    "phone": "+254700000000",
    "curricula": ["CBC", "CAMBRIDGE"],
    "branches": [
      {
        "name": "North Campus",
        "county": "Nairobi",
        "subCounty": "Westlands",
        "ward": "Parklands",
        "area": "Parklands",
        "curricula": ["CBC"]
      },
      {
        "name": "South Campus",
        "county": "Nairobi",
        "subCounty": "Langata",
        "ward": "Karen",
        "area": "Karen",
        "curricula": ["CAMBRIDGE"]
      }
    ]
  },
  "admin": {
    "fullName": "School Administrator",
    "email": "admin@example.test",
    "password": "choose-a-unique-password"
  }
}
```

Registration returns `201 Created`. The administrator then signs in through
`POST /auth/login`; registration does not return a session. Email addresses are
case-insensitive, and passwords must contain at least 12 characters.

## Sessions

- `POST /auth/login` accepts `email`, `password`, and optional `schoolId`. If
  the account belongs to multiple schools and no school is provided, the
  response lists the active memberships and sets a session cookie so the client
  can continue with `POST /auth/select-school` and `{ "schoolId": "..." }`.
- `POST /auth/refresh` reads the refresh-token cookie. Reusing a rotated
  refresh token revokes its token family.
- `GET /auth/me` returns the authenticated user and current school membership,
  including assigned branch/curriculum pairs.
- `POST /auth/select-school` switches the authenticated user to another active
  school membership.
- `POST /auth/logout` revokes the current access/refresh token pair.
- `POST /auth/change-password` accepts `currentPassword` and `newPassword`.
  Changing a password revokes all of the user's sessions.

## School users

All `/users` endpoints require an active school `ADMIN` membership. The
access cookie fixes the active school; clients cannot choose a different
tenant using request parameters.

- `GET /users` lists members of the active school.
- `POST /users` creates a new member account with a password and branch/
  curriculum assignments.
- `PATCH /users/:membershipId` updates the member's name, school role, or
  branch/curriculum assignments. Administrator memberships cannot be changed
  through this endpoint.
- `DELETE /users/:membershipId` removes a non-administrator membership. The
  user account remains active if it has another active school membership.

Member scope uses `branches: [{ "branchId": "...", "curricula": ["CBC"] }]`.
Every branch and curriculum combination must already be configured for that
school.

## School management

Authenticated members can read their school and assigned branches through
`GET /school` and `GET /school/branches`. School `ADMIN` members can create,
update, and delete branches and configure school/branch curricula. A standalone
school is represented by one main branch. Curriculum offerings can be shared
or branch specific.

## Deployment notes

Apply the migrations in `drizzle/20261113222500_auth_access_scope` and
`drizzle/20261114015000_tenant_row_level_security` before starting the updated
server. Public registration and login have IP-based rate limits. Email
verification and email-based password recovery are not included in this first
release; add those controls before enabling public registration in production.
