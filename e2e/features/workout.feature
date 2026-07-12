Feature: Workout tracking (É6)
  The seeded exercise library filters by muscle group and equipment; a session
  collects séries × reps × poids, completion estimates calories from RPE, and
  history feeds the progression curve and the next-session suggestion.

  Scenario: Browse the library, run a session, complete it with RPE
    Given a logged-in user "alice"
    # Profile gives the kcal estimate a real body weight + a training level.
    When "alice" sends PUT "/profile" with body:
      """
      { "sex": "male", "birth_date": "1994-05-20", "height_cm": 178,
        "weight_kg": 80, "activity_level": "moderate", "goal": "gain",
        "training_level": "intermediate", "equipment": "gym" }
      """
    Then the response is successful

    When "alice" sends GET "/exercises?equipment=none"
    Then the response is successful
    And the response list should contain an item where "name" equals "Pompes"
    And the response list should not contain an item where "name" equals "Squat barre"

    When "alice" sends GET "/exercises?muscle_group=chest&equipment=gym"
    Then the response is successful
    And the response list should contain an item where "name" equals "Développé couché barre"
    And remember the first item field "id" as "benchId"

    When "alice" sends POST "/workouts" with body:
      """
      { "split_day": "push" }
      """
    Then the response status should be 201
    And remember the response field "id" as "workoutId"

    When "alice" sends POST "/workouts/{{workoutId}}/sets" with body:
      """
      { "exercise_id": "{{benchId}}", "reps": 8, "weight_kg": 60, "rest_sec": 120 }
      """
    Then the response is successful
    When "alice" sends POST "/workouts/{{workoutId}}/sets" with body:
      """
      { "exercise_id": "{{benchId}}", "reps": 6, "weight_kg": 70 }
      """
    Then the response is successful
    And the response field "set_count" should equal "2"
    # Volume = 8×60 + 6×70 = 900 kg
    And the response field "total_volume_kg" should equal "900"

    When "alice" sends POST "/workouts/{{workoutId}}/complete" with body:
      """
      { "rpe": 8 }
      """
    Then the response status should be 200
    And the response field "ended_at" should exist
    And the response field "est_kcal" should be a number between 1 and 2000

    # A completed session refuses more sets.
    When "alice" sends POST "/workouts/{{workoutId}}/sets" with body:
      """
      { "exercise_id": "{{benchId}}", "reps": 5, "weight_kg": 70 }
      """
    Then the response status should be 409

    When "alice" sends GET "/workouts/progression?exercise_id={{benchId}}"
    Then the response is successful
    And the response list should contain an item where "top_weight_kg" equals "70"

    # Push done < 48h ago → rotation suggests pull, chest flagged for recovery.
    When "alice" sends GET "/workouts/suggestion"
    Then the response is successful
    And the response field "suggested_focus" should equal "pull"

    When "alice" sends GET "/workouts"
    Then the response list should contain an item where "id" equals "{{workoutId}}"

  Scenario: Suggestion for a brand-new user is full body
    Given a logged-in user "bob"
    When "bob" sends GET "/workouts/suggestion"
    Then the response is successful
    And the response field "suggested_focus" should equal "full_body"

  Scenario: Custom exercises are private to their creator
    Given a logged-in user "carol"
    When "carol" sends POST "/exercises" with body:
      """
      { "name": "Élastique face pull e2e", "muscle_group": "shoulders", "equipment": "home" }
      """
    Then the response status should be 201
    And remember the response field "id" as "customId"
    When "carol" sends GET "/exercises?muscle_group=shoulders"
    Then the response list should contain an item where "id" equals "{{customId}}"
    Given a logged-in user "dave"
    When "dave" sends GET "/exercises?muscle_group=shoulders"
    Then the response list should not contain an item where "id" equals "{{customId}}"

  Scenario: Workouts are per-user
    Given a logged-in user "erin"
    When "erin" sends POST "/workouts" with body:
      """
      { "split_day": "legs" }
      """
    Then the response status should be 201
    And remember the response field "id" as "erinWorkoutId"
    Given a logged-in user "frank"
    When "frank" sends GET "/workouts/{{erinWorkoutId}}"
    Then the response status should be 404
    When "frank" sends GET "/workouts"
    Then the response list should not contain an item where "id" equals "{{erinWorkoutId}}"
