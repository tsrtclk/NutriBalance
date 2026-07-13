Feature: Gamification (É10)
  Streaks, badges and défis hebdo are driven entirely by the event bus: the
  same journal/hydration/workout/supplement events the other épics already
  publish. Reads are per-user and instant; writes arrive asynchronously.

  Scenario: Logging water starts a hydration streak and earns the first badge
    Given a logged-in user "alice"
    When "alice" sends GET "/gamification/streaks"
    Then the response is successful
    And the response field "hydration.current" should equal "0"

    When "alice" sends POST "/hydration" with body:
      """
      { "amount_ml": 250 }
      """
    Then the response status should be 201
    When "alice" polls GET "/gamification/streaks" until field "hydration.current" is at least 1
    Then the response field "hydration.best" should equal "1"

    # Same-day repeat counts the event but the chain stays at 1 (D10).
    When "alice" sends POST "/hydration" with body:
      """
      { "amount_ml": 300 }
      """
    Then the response status should be 201
    When "alice" polls GET "/gamification/streaks" until field "hydration.events_total" is at least 2
    Then the response field "hydration.current" should equal "1"

    When "alice" polls GET "/gamification/badges" until an item has "code" equal to "first_hydration"
    Then the response list should contain an item where "code" equals "first_hydration"

    # The badge celebration reaches the notification inbox through the bus.
    When "alice" polls GET "/notifications" until an item has "type" equal to "badge_earned"
    Then the response list should contain an item where "type" equals "badge_earned"

  Scenario: The weekly challenge is deterministic and readable before any event
    Given a logged-in user "bob"
    When "bob" sends GET "/gamification/challenge"
    Then the response is successful
    And the response field "code" should exist
    And the response field "week_start" should exist
    And the response field "target" should exist
    And the response field "progress" should equal "0"
    And the response field "completed" should equal "false"

  Scenario: Streaks are per-user
    Given a logged-in user "carol"
    When "carol" sends GET "/gamification/streaks"
    Then the response is successful
    And the response field "hydration.events_total" should equal "0"
    And the response field "journal.current" should equal "0"
