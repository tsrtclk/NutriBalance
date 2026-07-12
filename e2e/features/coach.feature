Feature: AI coach (É8)
  The coach aggregates the day's journal/hydration/workouts against the
  profile targets and answers through a swappable LLM provider — the compose
  stack binds the deterministic mock (D9), so content is assertable.

  Scenario: Daily advice reflects journal vs targets, then serves from cache
    Given a logged-in user "alice"
    When "alice" sends PUT "/profile" with body:
      """
      { "sex": "male", "birth_date": "1994-02-14", "height_cm": 180,
        "weight_kg": 80, "activity_level": "moderate", "goal": "lose" }
      """
    Then the response is successful

    When "alice" sends POST "/foods" with body:
      """
      { "name": "Bowl coach e2e", "kcal_per_100g": 154,
        "protein_per_100g": 11, "carbs_per_100g": 12, "fat_per_100g": 6 }
      """
    Then the response status should be 201
    And remember the response field "id" as "foodId"
    When "alice" sends POST "/journal" with body:
      """
      { "food_item_id": "{{foodId}}", "meal": "breakfast",
        "quantity_g": 200, "eaten_on": "2026-07-12" }
      """
    Then the response status should be 201

    When "alice" sends GET "/coach/daily-advice?date=2026-07-12"
    Then the response is successful
    And the response field "provider" should equal "mock"
    And the response field "cached" should equal "false"
    And the response field "advice" should exist
    And the response field "facts.today.kcal" should equal "308"
    And the response field "facts.targets.calories_kcal" should be a number between 1900 and 2300

    # Same day again → served from the Redis cache.
    When "alice" sends GET "/coach/daily-advice?date=2026-07-12"
    Then the response field "cached" should equal "true"

  Scenario: Coach chat persists the conversation
    Given a logged-in user "bob"
    When "bob" sends POST "/coach/chat" with body:
      """
      { "message": "Comment progresser au développé couché ?" }
      """
    Then the response status should be 201
    And the response field "reply" should exist
    When "bob" sends GET "/coach/chat"
    Then the response list should contain an item where "role" equals "user"
    And the response list should contain an item where "role" equals "assistant"

  Scenario: Weekly report aggregates the week
    Given a logged-in user "carol"
    When "carol" sends GET "/coach/weekly-report?week_start=2026-07-06"
    Then the response is successful
    And the response field "report" should exist
    And the response field "facts.days_logged" should equal "0"
    And the response field "provider" should equal "mock"

  Scenario: The coach is guarded
    When "anon" sends GET "/coach/daily-advice"
    Then the response status should be 401
