# e2e — Cucumber harness

Drives the **live** API through Kong with a small, reusable Gherkin vocabulary
(`steps/common.steps.ts`): `Given a logged-in user "x"`,
`When "x" sends GET/POST/PATCH "/path" [with body: …]`, status/field/list
assertions, `remember … as "{{var}}"`, and a polling step for async/event state.

**Adding a feature test = write a `.feature` file** — you rarely need new steps.

## Wire it to your product

`support/auth.ts` `loginViaOtp()` is a **stub**: implement it against your auth
service (the skeleton's services are verify-only and don't issue tokens). Then:

```bash
npm run infra:up
npm run test:e2e        # parallel
```
