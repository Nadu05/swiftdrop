# SwiftDrop Frontend Agent Guidelines

**File:** `agent.frontend.md`\
**Purpose:** Establish the frontend architecture and coding rules for
developers and AI coding agents working on SwiftDrop.

> Before changing code, inspect the existing repository, package
> versions, routes, API contracts, and established patterns. Do not
> introduce competing libraries or perform broad refactors without
> approval.

## 1. Technology stack

  -----------------------------------------------------------------------
  Concern                             Standard
  ----------------------------------- -----------------------------------
  Framework and routing               Next.js App Router and
                                      filesystem-based routing

  Language                            TypeScript

  UI Library & Styling                shadcn/ui (built on Tailwind CSS 
                                      and Radix UI primitives)

  Remote/server state                 TanStack Query

  Shared client/UI state              Zustand

  Forms                               React Hook Form

  Validation                          Zod, integrated with React Hook
                                      Form using `@hookform/resolvers`

  HTTP                                Existing shared Axios client in
                                      `api/axios-client.ts`

  Backend access                      API Gateway; never connect browser
                                      code directly to databases or
                                      RabbitMQ
  -----------------------------------------------------------------------

Use versions already present in `package.json` and the lockfile. Do not
upgrade or replace dependencies without a clear reason.

## 2. Architecture principles

1.  **Routes:** Next.js pages and layouts live in the active App Router
    directory.
2.  **API:** HTTP request functions live in `api/`; do not put raw Axios
    calls in components or Zustand stores.
3.  **Server state:** TanStack Query handles backend data, caching,
    fetching, mutations, and invalidation.
4.  **Client state:** Zustand handles shared UI state and client-only
    workflows, not a duplicate copy of API data.
5.  **UI & Styling:** Base UI primitives from **shadcn/ui** live in `components/ui/` and are styled using Tailwind CSS classes via the shared `cn()` utility (`lib/utils.ts`).
6.  **Hooks:** Reusable hooks live in `hooks/`; TanStack Query hooks
    should be grouped under `hooks/api/`.
7.  **Forms:** React Hook Form manages form interaction; Zod schemas
    validate values.
8.  **Types:** Shared API/domain types live in `types/`; infer form
    types from Zod schemas where practical.
9.  **Schemas:** Reusable Zod schemas live in `schema/`.
10. **Components:** Reusable UI belongs in `components/`; route-specific
    page composition stays near its route.
11. **Utilities:** Shared, non-domain helpers belong in `lib/`.
12. Keep Next.js Server Components as the default. Add `"use client"`
    only when client-side state, event handlers, browser APIs, Zustand,
    React Hook Form, or TanStack Query hooks require it.
13. The frontend is not a security boundary. The backend must enforce
    authentication, permissions, ownership, and business rules.

## 3. Recommended folder structure

Keep the repository's existing structure and adapt it consistently:

``` text
app/                                  # OR src/app/ — use only the active App Router
  (public)/
  (customer)/
  (merchant)/
  (courier)/
  (admin)/
  layout.tsx
  providers.tsx
api/
  axios-client.ts
  endpoints.ts                     # Optional shared endpoint definitions
  services/
    auth.api.ts
    organization.api.ts
    orders.api.ts
    dispatch.api.ts
    notifications.api.ts
components/
  ui/                              # shadcn/ui components (button, dialog, input, etc.)
  layout/
  shared/
hooks/
  api/
    use-auth.ts
    use-orders.ts
    use-organization.ts
    use-dispatch.ts
  ui/
lib/
  utils.ts                         # Includes cn() helper for Tailwind/shadcn
  constants.ts
  query-client.ts
schema/
  auth.schema.ts
  order.schema.ts
  merchant.schema.ts
store/
  ui.store.ts
  delivery-draft.store.ts
types/
  api.types.ts
  auth.types.ts
  order.types.ts
  organization.types.ts
public/

**Important:** The provided project screenshot shows both `app/` and
`src/`. Inspect `next.config.*`, `package.json`, and the existing route
files to identify the active App Router. Do not create a second
competing `app/` tree. The example folders are a target pattern, not a
requirement to create every file immediately.

Use route groups such as `(customer)` and `(admin)` to organize layouts
without adding those group names to URLs. Use Next.js `page.tsx`,
`layout.tsx`, `loading.tsx`, `error.tsx`, and `not-found.tsx` where
appropriate. Do not add a separate client-side router.

## 4. API layer rules

### Shared Axios client

`api/axios-client.ts` owns shared Axios configuration: base URL,
timeout, common headers, and carefully designed interceptors.

-   Read the Gateway URL from the project's environment variable, for
    example `NEXT_PUBLIC_API_BASE_URL`; confirm the actual name before
    using it.
-   Do not hard-code `localhost`, deployment URLs, or individual service
    URLs in feature modules.
-   Browser code must not connect directly to PostgreSQL/Neon, RabbitMQ,
    or internal microservice ports.
-   Do not log credentials, tokens, sensitive request bodies, or
    personal information.
-   Never place secrets in `NEXT_PUBLIC_*` variables; these are exposed
    to browser bundles.
-   Reuse the existing authentication and refresh-token design rather
    than inventing a parallel mechanism.

### Domain API functions

Put HTTP functions in domain modules such as
`api/services/orders.api.ts`. They should perform requests and return
typed data. They must not contain React hooks, UI state, form markup, or
business presentation logic.

Example pattern (adapt exports, types, and paths to the actual
repository):

``` ts
import { apiClient } from "@/api/axios-client";
import type { CreateOrderInput, DeliveryOrder } from "@/types/order.types";

export async function getOrders(): Promise<DeliveryOrder[]> {
  const response = await apiClient.get<DeliveryOrder[]>("/orders");
  return response.data;
}

export async function createOrder(
  input: CreateOrderInput,
): Promise<DeliveryOrder> {
  const response = await apiClient.post<DeliveryOrder>("/orders", input);
  return response.data;
}
```

-   Keep modules separated by domain; avoid one giant `api.ts`.
-   Return typed response data rather than raw Axios responses unless
    metadata is needed.
-   Keep endpoint paths and error conventions consistent.
-   Check the backend contract and Gateway routes before adding an
    endpoint.
-   Do not duplicate API functions that already exist.

## 5. TanStack Query: remote state

Use TanStack Query for backend-owned data: orders, tracking, branches,
merchant profiles, approval queues, courier assignments, user profiles,
and all API mutations.

-   Put reusable query/mutation hooks in `hooks/api/`.
-   Use `useQuery` for reads and `useMutation` for commands/writes.
-   Use stable hierarchical query keys that include relevant IDs,
    filters, and pagination.
-   Invalidate or update the correct query keys after successful
    mutations.
-   Handle loading, empty, success, and error states explicitly.
-   Do not retry validation/authorization failures or unsafe
    non-idempotent writes blindly.
-   Use `enabled` when a query depends on a valid ID or prerequisite.
-   Use pagination or infinite queries for large lists.
-   Do not copy API response data into Zustand just to share it between
    components.
-   Configure `QueryClientProvider` in the appropriate client provider
    component using the installed TanStack Query version.
-   For App Router/SSR, do not share a mutable server-side QueryClient
    across requests; follow the appropriate per-request
    hydration/provider pattern.
-   Avoid optimistic updates for important delivery/assignment actions
    unless rollback and concurrency behavior are properly handled.

Example pattern:

``` ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createOrder, getOrders } from "@/api/services/orders.api";
import type { CreateOrderInput } from "@/types/order.types";

export const orderKeys = {
  all: ["orders"] as const,
  lists: () => [...orderKeys.all, "list"] as const,
};

export function useOrders() {
  return useQuery({
    queryKey: orderKeys.lists(),
    queryFn: getOrders,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateOrderInput) => createOrder(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}
```

## 6. Zustand: client state

Use Zustand for shared client-only state such as sidebar visibility, UI
preferences, temporary selections, or a multi-step delivery draft.

Do not use Zustand for: - API response caches already managed by
TanStack Query. - API fetching, retry, or cache invalidation logic. -
Form state already managed by React Hook Form. - Authorization decisions
that the backend must enforce. - Passwords, API secrets, or long-lived
sensitive tokens in persistent browser storage.

Create small, focused, typed stores. Avoid one giant global store and
avoid storing values that can be derived from other state. Persist only
when a clear product requirement exists. If persistence is used with
SSR, account for hydration and rendering mismatches.

Example:

``` ts
import { create } from "zustand";

type UiState = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
};

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
}));
```

## 7. Forms: React Hook Form + Zod

Use React Hook Form to manage form values, submission, touched/dirty
state, and field errors. Use Zod for schema validation and integrate it
with `zodResolver` from `@hookform/resolvers`.

-   Put reusable/non-trivial schemas in `schema/`, organized by feature.
-   Infer form types with `z.infer<typeof schema>` where practical.
-   Display accessible field-level validation messages and useful
    form-level server errors.
-   Disable duplicate submissions while a mutation is pending.
-   Submit through a TanStack Query mutation hook; do not embed raw
    Axios calls in the form component.
-   Explicitly handle trimming, optional values, numeric coercion,
    dates, and transformations.
-   Frontend validation improves UX; the backend must repeat all
    security-critical and business-critical validation.
-   Avoid defining duplicate interfaces when the Zod schema can provide
    the type.
-   Preserve form values after recoverable server errors where
    appropriate.

Example schema:

``` ts
import { z } from "zod";

export const createOrderSchema = z.object({
  pickupAddress: z.string().trim().min(1, "Pickup address is required"),
  dropoffAddress: z.string().trim().min(1, "Drop-off address is required"),
  weightKg: z.coerce.number().positive("Weight must be greater than zero"),
});

export type CreateOrderFormValues = z.infer<typeof createOrderSchema>;
```

Example form integration:

``` tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createOrderSchema,
  type CreateOrderFormValues,
} from "@/schema/order.schema";
import { useCreateOrder } from "@/hooks/api/use-orders";

export function CreateOrderForm() {
  const mutation = useCreateOrder();

  const form = useForm<CreateOrderFormValues>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      pickupAddress: "",
      dropoffAddress: "",
      weightKg: 1,
    },
  });

  return (
    <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      <label htmlFor="pickupAddress">Pickup address</label>
      <input id="pickupAddress" {...form.register("pickupAddress")} />
      {form.formState.errors.pickupAddress && (
        <p role="alert">{form.formState.errors.pickupAddress.message}</p>
      )}

      <label htmlFor="dropoffAddress">Drop-off address</label>
      <input id="dropoffAddress" {...form.register("dropoffAddress")} />
      {form.formState.errors.dropoffAddress && (
        <p role="alert">{form.formState.errors.dropoffAddress.message}</p>
      )}

      <label htmlFor="weightKg">Weight (kg)</label>
      <input id="weightKg" type="number" step="any" {...form.register("weightKg")} />
      {form.formState.errors.weightKg && (
        <p role="alert">{form.formState.errors.weightKg.message}</p>
      )}

      {mutation.isError && (
        <p role="alert">The order could not be created. Please try again.</p>
      )}

      <button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Creating..." : "Create delivery"}
      </button>
    </form>
  );
}
```

Adapt all example paths, exports, endpoint contracts, and error messages
to the existing codebase and installed library versions.

## 8. TypeScript and component standards

-   Follow the existing `tsconfig.json`; prefer strict typing and avoid
    `any`.
-   Keep backend DTO types distinct from UI view models when their
    shapes differ.
-   Do not assume an API response matches a TypeScript type without
    checking the contract.
-   Keep components small, focused, and composable.
-   Keep route pages focused on composition; move reusable UI into
    `components/`.
-   Follow the existing design system and styling approach; do not
    introduce a competing UI or CSS framework.
-   Use semantic HTML, accessible labels, keyboard interactions, visible
    focus states, and accessible error messages.
-   Keep domain logic out of low-level UI primitives.
-   Avoid adding `"use client"` to a whole route tree when only a small
    component requires it.

## 9. Authentication and role-aware UI

SwiftDrop supports customers, merchants, couriers, branch staff,
dispatchers, and administrators.

-   Reuse the current authentication integration.
-   Frontend route guards and hidden navigation items are UX controls,
    not security controls.
-   Do not trust role or merchant IDs from local storage or client
    input.
-   Enforce ownership and permissions in the backend for every protected
    operation.
-   Avoid storing sensitive tokens in `localStorage` unless the
    project's documented security design explicitly requires it; prefer
    secure HttpOnly cookies when supported by the backend design.
-   Handle expired sessions consistently without redirect loops or
    unsafe automatic retries.
-   Never expose privileged credentials or internal service URLs in
    client bundles.

## 10. Loading, errors, and feedback

For every data-driven feature, implement relevant loading, empty,
success, error, unauthorized/forbidden, and mutation-pending states.

-   Map API errors to safe, understandable messages.
-   Do not show raw stack traces, SQL errors, or internal exception
    details.
-   Do not show success before the backend confirms the operation.
-   Do not swallow errors silently.
-   Use accessible status and alert messages.
-   Do not automatically retry unsafe create, assign, approve, or reject
    operations unless idempotency is guaranteed.

## 11. Environment configuration

-   Use environment variables for the API Gateway base URL and
    non-secret public configuration.
-   `NEXT_PUBLIC_*` values are browser-visible and must never contain
    secrets.
-   Keep `.env.example` placeholders only; never commit `.env` or real
    credentials.
-   Keep local, test, staging, and production configuration separate.
-   Normal frontend requests should go through the Gateway.
-   Check the actual environment variable and Gateway route conventions
    before changing them.

## 12. Testing requirements

Use the testing tools already installed. Add tests for meaningful
behavior: - Zod schemas: valid/invalid inputs and transformations. -
Forms: validation, pending state, success, and API errors. - Query
hooks/components: loading, success, errors, and cache invalidation where
practical. - Zustand stores: initial state and important state
transitions. - Role-aware UI and route states. - Regression tests for
fixed bugs.

Do not depend on production credentials or live Neon data. Mock requests
at the network boundary or follow the existing test setup. Run lint,
type checking, and relevant tests after changes. Report results
accurately.

## 13. Agentic coding workflow

### Inspect

-   Read this file, README, `package.json`, lockfile, `tsconfig.json`,
    and Next.js configuration.
-   Identify whether `app/` or `src/app/` is the active route directory.
-   Inspect the existing Axios client, Query provider, stores, hooks,
    schemas, types, and design system.
-   Search for existing API functions, query keys, schemas, and
    components before creating duplicates.
-   Confirm backend endpoint paths and response contracts.

### Plan

Identify affected routes/components, API functions, query hooks, cache
invalidation, justified Zustand state, Zod schemas, form behavior, and
tests.

### Implement

-   API calls in `api/services/`.
-   Query/mutation hooks in `hooks/api/`.
-   Reusable UI in `components/`.
-   Zod schemas in `schema/`.
-   Client-only shared state in `store/`.
-   Shared types in `types/`.
-   Routes/layouts in the active App Router directory.
-   Do not introduce new libraries, duplicate route trees, or unrelated
    refactors without approval.

### Verify and report

Run applicable lint, type-check, and test commands. Verify API paths,
cache invalidation, form validation, error states, and absence of
secrets. Report files changed, behavior added, commands actually run,
results, and remaining limitations. Never claim a check passed unless it
was run.

## 14. Changes requiring approval

Obtain explicit approval before: - Replacing Next.js, TanStack Query,
Zustand, React Hook Form, Zod, or Axios. - Introducing competing
state-management, fetching, or form libraries. - Reorganizing the entire
route tree or creating a second App Router directory. - Changing
authentication/session architecture or breaking API contracts. -
Removing major features/tests or adding dependencies with significant
security/maintenance impact. - Exposing secrets or privileged backend
access to browser code.

## 15. Definition of done

-   [ ] Routes and components are in the correct locations.
-   [ ] HTTP calls are isolated in domain API modules.
-   [ ] TanStack Query manages remote state and mutation invalidation.
-   [ ] Zustand is limited to justified client-side shared state.
-   [ ] Forms use React Hook Form and Zod.
-   [ ] Types match the backend contract.
-   [ ] Loading, empty, success, and error states are handled.
-   [ ] Accessibility and role-aware UX are considered; backend
    authorization remains authoritative.
-   [ ] No secrets are exposed.
-   [ ] Relevant lint, type checks, and tests were run and results
    reported.
-   [ ] No unrelated refactors or unapproved dependency changes were
    introduced.

**Default rule:** Routes compose pages; API modules perform HTTP
requests; TanStack Query manages remote data; Zustand manages client
state; React Hook Form manages forms; Zod validates input; and shared
components keep the UI consistent.
