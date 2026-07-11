Feature: Profile & daily targets (É1)
  Onboarding writes the profile; targets are derived on read
  (Mifflin-St Jeor BMR → TDEE → goal-paced calories → macros + water).

  Scenario: Onboard, read back, get computed targets
    Given a logged-in user "alice"
    When "alice" sends PUT "/profile" with body:
      """
      {
        "sex": "male",
        "birth_date": "1996-01-15",
        "height_cm": 180,
        "weight_kg": 80,
        "activity_level": "moderate",
        "goal": "lose",
        "target_weight_kg": 76,
        "training_level": "beginner",
        "equipment": "home"
      }
      """
    Then the response is successful
    And the response field "goal" should equal "lose"

    When "alice" sends GET "/profile"
    Then the response is successful
    And the response field "height_cm" should equal "180"

    When "alice" sends GET "/profile/targets"
    Then the response is successful
    # Mifflin-St Jeor for this profile is ~1780 kcal BMR, TDEE ~2759.
    And the response field "bmr_kcal" should be a number between 1700 and 1860
    And the response field "tdee_kcal" should be a number between 2650 and 2870
    And the response field "calories_kcal" should be a number between 1900 and 2300
    And the response field "protein_g" should be a number between 150 and 170
    And the response field "water_ml" should be a number between 3000 and 3600
    And the response field "breakdown.activity_factor" should exist

  Scenario: Updating the profile moves the targets
    Given a logged-in user "bob"
    When "bob" sends PUT "/profile" with body:
      """
      { "sex": "female", "birth_date": "1990-06-01", "height_cm": 165,
        "weight_kg": 60, "activity_level": "light", "goal": "maintain" }
      """
    Then the response is successful
    When "bob" sends GET "/profile/targets"
    Then the response is successful
    And the response field "weekly_rate_kg" should equal "0"
    When "bob" sends PUT "/profile" with body:
      """
      { "sex": "female", "birth_date": "1990-06-01", "height_cm": 165,
        "weight_kg": 60, "activity_level": "light", "goal": "gain" }
      """
    Then the response is successful
    When "bob" sends GET "/profile/targets"
    Then the response is successful
    And the response field "weekly_rate_kg" should be a number between 0 and 1

  Scenario: Targets without a profile answer 404, not a crash
    Given a logged-in user "carol"
    When "carol" sends GET "/profile/targets"
    Then the response status should be 404
