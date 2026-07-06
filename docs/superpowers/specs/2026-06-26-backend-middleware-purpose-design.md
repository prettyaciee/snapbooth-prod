# Backend Middleware Purpose Design

## Goal

Make `backend/src/middlewares` a real part of the backend architecture by moving cross-cutting HTTP concerns out of `src/app.ts` and out of individual route handlers.

The middleware layer should own request-pipeline behavior that applies broadly across the API or that protects route handlers from repetitive input-validation code.

## Current State

The backend currently has an empty `src/middlewares/` directory that contains only `.gitkeep`.

Actual middleware behavior is split across other files:

- `backend/src/app.ts` wires request logging, CORS, JSON parsing, and URL-encoded parsing inline
- `backend/src/routes/rooms.ts` performs `groupSize` request validation inside the route handler
- unknown routes do not have a dedicated JSON `404` handler
- thrown route errors do not flow through a dedicated JSON error handler

This leaves the middleware directory without a purpose and makes `app.ts` the place where transport concerns accumulate.

## Non-Goals

This work does not:

- add authentication or authorization
- add rate limiting
- add request schemas for every route
- redesign the room or websocket domain model
- introduce a large framework around a small Express app

## Approaches Considered

### 1. Thin extraction only

Move the existing inline `app.use(...)` calls into one helper under `src/middlewares/`, but keep validation and error behavior where they are today.

Pros:

- low risk
- minimal file churn

Cons:

- middleware folder still has weak ownership
- route-level validation remains mixed with business logic
- no consistent `404` or `500` JSON handling

### 2. Purposeful middleware layer

Use `src/middlewares/` for both global request-pipeline concerns and small route-specific guards.

Pros:

- gives the folder clear responsibility
- keeps `app.ts` focused on composition
- keeps route handlers focused on domain work
- adds missing HTTP boundary behavior without overengineering

Cons:

- introduces several small files

### 3. Generic middleware framework

Add reusable validation factories, request context objects, auth placeholders, and more future-facing abstractions.

Pros:

- flexible for a larger API surface

Cons:

- unnecessary complexity for the current backend
- likely to create dead abstractions

## Recommended Approach

Use approach 2.

The backend is small, so the right move is not to build a middleware framework. The right move is to give middleware a narrow, real job:

- register global HTTP middleware in one place
- provide consistent API boundary behavior for unknown routes and unexpected failures
- move request validation out of route handlers when it does not belong to the business action itself

## Final Design

### File Responsibilities

Create or populate these middleware files:

- `backend/src/middlewares/index.ts`
  - exports a single `registerMiddlewares(app)` composition function
  - applies global middleware in the correct order
  - attaches terminal `notFound` and `errorHandler` middleware after routes

- `backend/src/middlewares/requestLogger.ts`
  - owns the current `pino-http` setup now embedded in `app.ts`
  - keeps serializer behavior unchanged unless required by Express typing

- `backend/src/middlewares/notFound.ts`
  - returns JSON `404` responses for unmatched API routes
  - response shape should be stable and simple, for example `{ error: "Not found" }`

- `backend/src/middlewares/errorHandler.ts`
  - catches unhandled errors from route handlers and middleware
  - logs the error through the existing logger-backed request context
  - returns a JSON `500` response without leaking stack traces to clients

- `backend/src/middlewares/validateCreateRoom.ts`
  - validates `req.body.groupSize`
  - rejects invalid input before the create-room handler runs
  - stores the validated integer on the request object or `res.locals` so the route handler receives normalized data

### App Composition

`backend/src/app.ts` should become a thin composition root:

1. create the Express app
2. call `registerMiddlewares(app)` for the pre-route global stack
3. mount `/api` routes
4. register terminal `notFound` and `errorHandler` middleware through the same middleware module

This keeps the app entry focused on wiring, not transport-policy details.

### Route Design

`backend/src/routes/rooms.ts` should stop parsing and validating `groupSize` inline.

Instead:

- `POST /rooms` uses `validateCreateRoom`
- the route handler reads a validated integer from middleware-managed state
- the handler only creates the room, logs the result, and returns the response

`GET /rooms/:roomId` can stay in the route file because its current lookup logic is already simple and domain-oriented.

### Validation Boundary

Only move validation that is clearly request-boundary logic.

For this change, that means:

- numeric parsing of `groupSize`
- integer requirement
- allowed range `2..6`

Do not add a generic validator system yet. A single focused middleware is enough for the current API.

### Error Handling Behavior

The new middleware layer should establish two consistent API guarantees:

1. unknown HTTP routes return JSON `404`
2. unexpected thrown errors return JSON `500` and are logged once

This is useful even for a small backend because it makes the request boundary predictable and gives the middleware layer an obvious purpose.

### Request Logging

Request logging remains middleware-owned and should keep the current behavior:

- log method
- log URL path without query string
- include request id from `pino-http`
- log response status code

No broader logging redesign is required.

## Testing Strategy

This change should be implemented with TDD.

Required coverage:

- invalid `POST /api/rooms` payloads return `400` from middleware, not from route business logic
- valid `POST /api/rooms` payloads still return `201`
- unknown `/api/...` routes return JSON `404`
- thrown route errors are converted into JSON `500`

The backend currently has no visible HTTP test harness in this repo, so implementation planning must include selecting the smallest practical test setup for Express route verification.

## Risks

### Middleware ordering errors

If `notFound` or `errorHandler` are registered in the wrong order, valid routes may stop working or thrown errors may bypass the handler.

Mitigation:

- centralize middleware registration in one module
- test success, `404`, and `500` paths explicitly

### Over-abstraction

Trying to generalize validation too early would add code with no immediate consumer.

Mitigation:

- implement only `validateCreateRoom`
- avoid generic factories unless the tests show a real need

## Acceptance Criteria

This work is complete when all of the following are true:

- `backend/src/middlewares` contains real middleware modules instead of only `.gitkeep`
- `backend/src/app.ts` no longer owns the inline request middleware stack
- `POST /api/rooms` uses middleware for `groupSize` validation
- unknown API routes return JSON `404`
- unexpected route failures return JSON `500`
- automated tests cover the new middleware behavior
