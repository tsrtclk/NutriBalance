---
name: nestjs-layered-module
description:
  Add a NestJS feature module with the layered controller → service → repository
  pattern (DI of ORM/cache/event-bus, class-validator DTOs, response DTOs). Use
  when scaffolding a module/endpoint in a NestJS service. Project-agnostic; copy
  an existing module for the repo's exact imports.
---

# NestJS layered module

A reusable scaffold for a feature module in a NestJS service. Always copy an
existing module in the target repo first to get its real import paths (shared
ORM/cache/event modules, filters, interceptors).

## Layout

```
modules/<module-name>/
├── <module-name>.module.ts       # @Module — providers + imports
├── <module-name>.controller.ts   # @Controller — HTTP routes, binds DTOs
├── <module-name>.service.ts      # business logic; injects deps
├── <module-name>.repository.ts   # (optional) data access; split out when queries grow
└── dto/
    ├── create-<thing>.dto.ts     # class-validator request shapes
    ├── update-<thing>.dto.ts
    └── <thing>-response.dto.ts   # explicit response shape (never return raw ORM models)
```

## Order of work

1. **DTOs** — request shapes with `class-validator`; a `*-response.dto.ts` for
   output. Controllers run with whitelist/forbidNonWhitelisted, so DTOs are the
   contract.
2. **Repository** (if needed) — ORM queries; convert ORM decimals/JSON at the
   boundary.
3. **Service** — `@Injectable()`, constructor DI (ORM client, cache, event bus,
   config). Validate → query → emit domain event → return a response DTO. Never
   log secrets.
4. **Controller** — `@Controller('<kebab>')`, thin: bind DTO → call service.
   Apply the repo's exception filter + transform interceptor + auth guard.
5. **Module** — register controller + providers; import the shared modules.
6. **Register** the module in `app.module.ts` `imports`.

## Verify

```bash
# (generate ORM client first if the schema changed)
turbo run typecheck lint test --filter=<service>      # or the repo's equivalent
```

## Don't

- Don't put business logic in controllers; don't return raw ORM models.
- Don't make a new module when an existing one is the natural home.
- For cross-service signals, emit a **domain event** (the bus), not direct HTTP.
- Keep secrets out of logs; keep config behind a typed config service.
