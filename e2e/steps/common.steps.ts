import { Given, When, Then, DataTable } from "@cucumber/cucumber";
import assert from "node:assert/strict";

import { PlatformWorld } from "../support/world";
import { registerAndLogin, uniqueEmail } from "../support/auth";

function getPath(obj: any, path: string): any {
  return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

// --- Auth ------------------------------------------------------------------

Given(
  "a logged-in user {string}",
  async function (this: PlatformWorld, actor: string) {
    const email = uniqueEmail();
    const { token, userId } = await registerAndLogin(
      this.baseUrl,
      email,
      `e2e-${actor}-device`,
    );
    this.tokens[actor] = token;
    this.userIds[actor] = userId;
  },
);

// Same as above, but also stash the email so other steps can address this user.
Given(
  "a logged-in user {string} whose email is saved as {string}",
  async function (this: PlatformWorld, actor: string, varName: string) {
    const email = uniqueEmail();
    const { token, userId } = await registerAndLogin(
      this.baseUrl,
      email,
      `e2e-${actor}-device`,
    );
    this.tokens[actor] = token;
    this.userIds[actor] = userId;
    this.vars[varName] = email;
  },
);

// A fresh unique identifier for scenarios that drive registration explicitly.
Given(
  "a unique email saved as {string}",
  function (this: PlatformWorld, varName: string) {
    this.vars[varName] = uniqueEmail();
  },
);

// Adopt a token captured from an earlier response (e.g. register/refresh) so
// later authenticated steps can act as that user.
Given(
  "{string} uses {string} as their bearer token",
  function (this: PlatformWorld, actor: string, token: string) {
    this.tokens[actor] = this.interpolate(token);
  },
);

// --- Requests --------------------------------------------------------------

When(
  "{string} sends {word} {string}",
  async function (
    this: PlatformWorld,
    actor: string,
    method: string,
    path: string,
  ) {
    this.lastResponse = await this.http.request({
      method,
      url: this.interpolate(path),
      headers: this.authHeader(actor),
    });
  },
);

When(
  "{string} sends {word} {string} with body:",
  async function (
    this: PlatformWorld,
    actor: string,
    method: string,
    path: string,
    body: string,
  ) {
    this.lastResponse = await this.http.request({
      method,
      url: this.interpolate(path),
      headers: this.authHeader(actor),
      data: JSON.parse(this.interpolate(body)),
    });
  },
);

// Poll a GET endpoint until a list item matches — for asynchronously-delivered
// state such as events that travel through RabbitMQ.
When(
  "{string} polls GET {string} until an item has {string} equal to {string}",
  async function (
    this: PlatformWorld,
    actor: string,
    pth: string,
    field: string,
    expected: string,
  ) {
    const want = this.interpolate(expected);
    for (let i = 0; i < 30; i++) {
      this.lastResponse = await this.http.request({
        method: "GET",
        url: this.interpolate(pth),
        headers: this.authHeader(actor),
      });
      const arr = this.data;
      if (
        Array.isArray(arr) &&
        arr.some((it) => String(getPath(it, field)) === want)
      )
        return;
      await new Promise((r) => setTimeout(r, 500));
    }
    assert.fail(`no item with ${field}=${want} at ${pth} after polling`);
  },
);

// --- Assertions ------------------------------------------------------------

Then(
  "the response status should be {int}",
  function (this: PlatformWorld, code: number) {
    assert.equal(
      this.lastResponse?.status,
      code,
      `expected ${code}, got ${this.lastResponse?.status}: ${JSON.stringify(this.lastResponse?.data)}`,
    );
  },
);

Then("the response is successful", function (this: PlatformWorld) {
  const s = this.lastResponse?.status ?? 0;
  assert.ok(
    s >= 200 && s < 300,
    `expected 2xx, got ${s}: ${JSON.stringify(this.lastResponse?.data)}`,
  );
});

Then(
  "the response field {string} should equal {string}",
  function (this: PlatformWorld, field: string, expected: string) {
    const actual = getPath(this.data, field);
    assert.equal(String(actual), this.interpolate(expected), `field ${field}`);
  },
);

Then(
  "the response field {string} should exist",
  function (this: PlatformWorld, field: string) {
    assert.ok(getPath(this.data, field) != null, `field ${field} missing`);
  },
);

// For non-JSON (binary/text) responses such as a document download.
Then(
  "the response body contains {string}",
  function (this: PlatformWorld, expected: string) {
    assert.ok(
      String(this.data).includes(this.interpolate(expected)),
      `response body did not contain ${expected}`,
    );
  },
);

Then("the response list should not be empty", function (this: PlatformWorld) {
  assert.ok(
    Array.isArray(this.data) && this.data.length > 0,
    "expected non-empty list",
  );
});

Then(
  "the response list should contain an item where {string} equals {string}",
  function (this: PlatformWorld, field: string, expected: string) {
    const want = this.interpolate(expected);
    const found = (this.data as any[]).some(
      (it) => String(getPath(it, field)) === want,
    );
    assert.ok(
      found,
      `no item with ${field}=${want} in ${JSON.stringify(this.data)}`,
    );
  },
);

Then(
  "the response list should not contain an item where {string} equals {string}",
  function (this: PlatformWorld, field: string, expected: string) {
    const want = this.interpolate(expected);
    const found = (this.data as any[]).some(
      (it) => String(getPath(it, field)) === want,
    );
    assert.ok(!found, `unexpected item with ${field}=${want}`);
  },
);

// --- Capture for later steps ----------------------------------------------

Then(
  "remember the response field {string} as {string}",
  function (this: PlatformWorld, field: string, name: string) {
    const v = getPath(this.data, field);
    assert.ok(v != null, `cannot remember missing field ${field}`);
    this.vars[name] = String(v);
  },
);

Then(
  "remember the first item field {string} as {string}",
  function (this: PlatformWorld, field: string, name: string) {
    const first = (this.data as any[])[0];
    const v = getPath(first, field);
    assert.ok(
      v != null,
      `cannot remember missing field ${field} on first item`,
    );
    this.vars[name] = String(v);
  },
);

// Silence unused import in some runs.
void DataTable;

// Poll a GET endpoint until a scalar response field reaches a threshold — for
// per-user aggregates that update asynchronously as bus events are consumed.
When(
  "{string} polls GET {string} until field {string} is at least {int}",
  async function (
    this: PlatformWorld,
    actor: string,
    pth: string,
    field: string,
    min: number,
  ) {
    for (let i = 0; i < 30; i++) {
      this.lastResponse = await this.http.request({
        method: "GET",
        url: this.interpolate(pth),
        headers: this.authHeader(actor),
      });
      const v = Number(getPath(this.data, field));
      if (Number.isFinite(v) && v >= min) return;
      await new Promise((r) => setTimeout(r, 500));
    }
    assert.fail(`field ${field} never reached ${min} at ${pth}`);
  },
);

Then(
  "the response field {string} should be a number between {int} and {int}",
  function (this: PlatformWorld, field: string, lo: number, hi: number) {
    const v = Number(getPath(this.data, field));
    assert.ok(
      Number.isFinite(v) && v >= lo && v <= hi,
      `field ${field}=${v} not in [${lo}, ${hi}]`,
    );
  },
);
