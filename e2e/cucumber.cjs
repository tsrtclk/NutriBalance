// Cucumber config. Runs the .feature files against the live stack (Kong on
// :8000 by default; override with API_BASE_URL). Step defs are TypeScript,
// loaded via ts-node.
//
// Scenarios are fully isolated (each creates its own users/tools via unique
// phone numbers), so they run in parallel by default. The local/e2e Docker
// stack relaxes the OTP rate limit (AUTH_OTP_*_LIMIT) so parallel logins
// aren't throttled. Use the `serial` profile to debug one scenario at a time.
const common = {
  requireModule: ['ts-node/register'],
  require: ['support/**/*.ts', 'steps/**/*.ts'],
  paths: ['features/**/*.feature'],
  format: ['progress'],
};

module.exports = {
  default: { ...common, parallel: 4 },
  serial: { ...common },
};
