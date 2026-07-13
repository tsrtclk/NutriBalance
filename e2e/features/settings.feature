Feature: Réglages (É12)
  Display units are a stored preference — the API stays metric (D13) and
  clients convert. Account deletion (RGPD, D14) re-confirms the password,
  cascades over every user-owned table and kills the session.

  Scenario: Units default to metric and can be switched
    Given a logged-in user "alice"
    When "alice" sends GET "/settings"
    Then the response is successful
    And the response field "weight_unit" should equal "kg"
    And the response field "height_unit" should equal "cm"

    When "alice" sends PUT "/settings" with body:
      """
      { "weight_unit": "lb", "height_unit": "in" }
      """
    Then the response is successful
    When "alice" sends GET "/settings"
    Then the response field "weight_unit" should equal "lb"
    And the response field "height_unit" should equal "in"

  Scenario: An unknown unit is rejected
    Given a logged-in user "bob"
    When "bob" sends PUT "/settings" with body:
      """
      { "weight_unit": "stone" }
      """
    Then the response status should be 400

  Scenario: Account deletion re-confirms the password, then wipes everything
    Given a logged-in user "carol"
    When "carol" sends PUT "/profile" with body:
      """
      { "sex": "female", "birth_date": "1994-05-20", "height_cm": 170,
        "weight_kg": 65, "activity_level": "moderate", "goal": "maintain" }
      """
    Then the response is successful

    # Wrong password → nothing happens.
    When "carol" sends DELETE "/auth/account" with body:
      """
      { "password": "not-the-password" }
      """
    Then the response status should be 401
    When "carol" sends GET "/auth/me"
    Then the response is successful

    # Right password → account gone, token blacklisted.
    When "carol" sends DELETE "/auth/account" with body:
      """
      { "password": "E2e-test-pass-1" }
      """
    Then the response is successful
    And the response field "deleted" should equal "true"
    When "carol" sends GET "/auth/me"
    Then the response status should be 401
