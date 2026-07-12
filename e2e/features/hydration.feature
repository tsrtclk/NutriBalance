Feature: Hydration tracking (É4)
  Quick-add water entries build a daily total; the daily target itself comes
  from GET /profile/targets (water_ml).

  Scenario: Quick-add entries and read the day total
    Given a logged-in user "alice"
    When "alice" sends POST "/hydration" with body:
      """
      { "amount_ml": 250, "drunk_at": "2026-07-12T08:00:00Z" }
      """
    Then the response status should be 201
    And remember the response field "id" as "glassId"
    When "alice" sends POST "/hydration" with body:
      """
      { "amount_ml": 500, "drunk_at": "2026-07-12T12:30:00Z" }
      """
    Then the response status should be 201

    When "alice" sends GET "/hydration?date=2026-07-12"
    Then the response is successful
    And the response field "total_ml" should equal "750"

    # Entries from another day stay on their day.
    When "alice" sends GET "/hydration?date=2026-07-11"
    Then the response field "total_ml" should equal "0"

    When "alice" sends DELETE "/hydration/{{glassId}}"
    Then the response status should be 204
    When "alice" sends GET "/hydration?date=2026-07-12"
    Then the response field "total_ml" should equal "500"

  Scenario: Hydration entries are per-user
    Given a logged-in user "bob"
    When "bob" sends GET "/hydration?date=2026-07-12"
    Then the response is successful
    And the response field "total_ml" should equal "0"
