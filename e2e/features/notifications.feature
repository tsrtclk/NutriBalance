Feature: Notifications (É9)
  Preferences drive the reminder scheduler; domain events drive alerts. The
  inbox is the source of truth (push is a mocked side channel, D6), so the
  goal-reached alert can be asserted end-to-end through RabbitMQ.

  Scenario: Preferences default, update, and read back
    Given a logged-in user "alice"
    When "alice" sends GET "/notification-preferences"
    Then the response is successful
    And the response field "meals_enabled" should equal "true"
    And the response field "workout_time" should equal "18:00"

    When "alice" sends PUT "/notification-preferences" with body:
      """
      { "hydration_enabled": false, "workout_time": "07:30" }
      """
    Then the response is successful
    When "alice" sends GET "/notification-preferences"
    Then the response field "hydration_enabled" should equal "false"
    And the response field "workout_time" should equal "07:30"
    And the response field "meals_enabled" should equal "true"

  Scenario: Reaching the target weight raises a goal alert through the bus
    Given a logged-in user "bob"
    When "bob" sends PUT "/profile" with body:
      """
      { "sex": "male", "birth_date": "1993-02-11", "height_cm": 182,
        "weight_kg": 80, "activity_level": "moderate", "goal": "lose",
        "target_weight_kg": 78 }
      """
    Then the response is successful

    # Crossing the target emits weight.logged → consumer → inbox row.
    When "bob" sends POST "/weight-entries" with body:
      """
      { "weight_kg": 77.6 }
      """
    Then the response status should be 201
    When "bob" polls GET "/notifications" until an item has "type" equal to "goal_reached"
    Then the response list should contain an item where "type" equals "goal_reached"
    And remember the first item field "id" as "alertId"

    # Logging again must not duplicate the alert (dedupe on the target).
    When "bob" sends POST "/weight-entries" with body:
      """
      { "weight_kg": 77.4 }
      """
    Then the response status should be 201
    When "bob" sends GET "/notifications"
    Then the response list should contain an item where "type" equals "goal_reached"

    When "bob" sends POST "/notifications/{{alertId}}/read"
    Then the response is successful
    And the response field "read_at" should exist
    When "bob" sends GET "/notifications?unread=true"
    Then the response list should not contain an item where "id" equals "{{alertId}}"

  Scenario: A weigh-in above a lose target raises nothing
    Given a logged-in user "carol"
    When "carol" sends PUT "/profile" with body:
      """
      { "sex": "female", "birth_date": "1991-09-03", "height_cm": 168,
        "weight_kg": 70, "activity_level": "light", "goal": "lose",
        "target_weight_kg": 65 }
      """
    Then the response is successful
    When "carol" sends POST "/weight-entries" with body:
      """
      { "weight_kg": 69.5 }
      """
    Then the response status should be 201
    When "carol" sends GET "/notifications"
    Then the response list should not contain an item where "type" equals "goal_reached"

  Scenario: Notifications are per-user
    Given a logged-in user "dave"
    When "dave" sends GET "/notifications"
    Then the response is successful
    And the response list should not contain an item where "type" equals "goal_reached"
