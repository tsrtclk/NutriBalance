Feature: Weight progress (É7)
  Weight entries build the progress curve; the profile's current weight
  follows the newest measurement (backfills must not overwrite it).

  Scenario: Log weights and read the curve
    Given a logged-in user "dana"
    When "dana" sends PUT "/profile" with body:
      """
      { "sex": "male", "birth_date": "1992-03-10", "height_cm": 175,
        "weight_kg": 82, "activity_level": "active", "goal": "lose" }
      """
    Then the response is successful

    When "dana" sends POST "/weight-entries" with body:
      """
      { "weight_kg": 81.4 }
      """
    Then the response status should be 201

    # Backfilled older measurement — allowed, but must not become "current".
    When "dana" sends POST "/weight-entries" with body:
      """
      { "weight_kg": 82.6, "measured_at": "2026-01-01T08:00:00Z" }
      """
    Then the response status should be 201

    When "dana" sends GET "/weight-entries"
    Then the response is successful
    And the response list should not be empty
    And the response list should contain an item where "weight_kg" equals "81.4"
    And the response list should contain an item where "weight_kg" equals "82.6"

    When "dana" sends GET "/profile"
    Then the response field "weight_kg" should equal "81.4"

  Scenario: Weight entries are per-user
    Given a logged-in user "erin"
    When "erin" sends GET "/weight-entries"
    Then the response is successful
    And the response list should not contain an item where "weight_kg" equals "81.4"
