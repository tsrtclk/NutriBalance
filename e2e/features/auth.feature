Feature: Authentication (É2)
  The auth-service is the only token issuer: register/login return a JWT pair,
  refresh rotates, logout revokes. Everything else on the platform verifies.

  Scenario: Register, use the token, refresh with rotation, logout revokes
    Given a unique email saved as "email"
    When "guest" sends POST "/auth/register" with body:
      """
      { "email": "{{email}}", "password": "S3cure-pass!", "full_name": "E2E Register" }
      """
    Then the response status should be 201
    And the response field "user.email" should equal "{{email}}"
    And remember the response field "user.id" as "userId"
    And remember the response field "tokens.access_token" as "access"
    And remember the response field "tokens.refresh_token" as "refresh"

    Given "alice" uses "{{access}}" as their bearer token
    When "alice" sends GET "/auth/me"
    Then the response is successful
    And the response field "email" should equal "{{email}}"

    When "guest" sends POST "/auth/refresh" with body:
      """
      { "refresh_token": "{{refresh}}" }
      """
    Then the response status should be 200
    And the response field "access_token" should exist

    # The rotated-out refresh token must be rejected (replay protection).
    When "guest" sends POST "/auth/refresh" with body:
      """
      { "refresh_token": "{{refresh}}" }
      """
    Then the response status should be 401

    When "alice" sends POST "/auth/logout"
    Then the response is successful

    # The blacklisted access token no longer works.
    When "alice" sends GET "/auth/me"
    Then the response status should be 401

  Scenario: Login with the wrong password is rejected
    Given a unique email saved as "email"
    When "guest" sends POST "/auth/register" with body:
      """
      { "email": "{{email}}", "password": "S3cure-pass!", "full_name": "E2E Login" }
      """
    Then the response status should be 201
    When "guest" sends POST "/auth/login" with body:
      """
      { "email": "{{email}}", "password": "wrong-password" }
      """
    Then the response status should be 401
    When "guest" sends POST "/auth/login" with body:
      """
      { "email": "{{email}}", "password": "S3cure-pass!" }
      """
    Then the response status should be 200
    And the response field "tokens.access_token" should exist

  Scenario: Duplicate registration is rejected
    Given a unique email saved as "email"
    When "guest" sends POST "/auth/register" with body:
      """
      { "email": "{{email}}", "password": "S3cure-pass!", "full_name": "E2E Dup" }
      """
    Then the response status should be 201
    When "guest" sends POST "/auth/register" with body:
      """
      { "email": "{{email}}", "password": "0ther-pass!!", "full_name": "E2E Dup 2" }
      """
    Then the response status should be 409

  Scenario: Guarded routes require a token
    When "anon" sends GET "/auth/me"
    Then the response status should be 401
