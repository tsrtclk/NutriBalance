Feature: Supplements (É5)
  A personal supplement list (dosage + horaires de prise) with an intake
  history; deactivation keeps the history but refuses new intakes.

  Scenario: Manage the list and log intakes
    Given a logged-in user "alice"
    When "alice" sends POST "/supplements" with body:
      """
      { "name": "Créatine e2e", "dosage": "5 g", "times": ["08:00"] }
      """
    Then the response status should be 201
    And the response field "active" should equal "true"
    And remember the response field "id" as "creatineId"

    When "alice" sends GET "/supplements"
    Then the response list should contain an item where "id" equals "{{creatineId}}"

    When "alice" sends POST "/supplements/{{creatineId}}/intake" with body:
      """
      {}
      """
    Then the response status should be 201
    And the response field "supplement_name" should equal "Créatine e2e"

    When "alice" sends GET "/supplements/{{creatineId}}/intakes"
    Then the response is successful
    And the response list should not be empty

    # Deactivate: gone from the list, history kept, new intakes refused.
    When "alice" sends DELETE "/supplements/{{creatineId}}"
    Then the response status should be 204
    When "alice" sends GET "/supplements"
    Then the response list should not contain an item where "id" equals "{{creatineId}}"
    When "alice" sends GET "/supplements/{{creatineId}}/intakes"
    Then the response list should not be empty
    When "alice" sends POST "/supplements/{{creatineId}}/intake" with body:
      """
      {}
      """
    Then the response status should be 409

  Scenario: Bad schedule times are rejected by validation
    Given a logged-in user "carol"
    When "carol" sends POST "/supplements" with body:
      """
      { "name": "Vitamine D", "dosage": "1 gélule", "times": ["25:99"] }
      """
    Then the response status should be 400

  Scenario: Supplements are per-user
    Given a logged-in user "dave"
    When "dave" sends POST "/supplements" with body:
      """
      { "name": "Oméga 3", "dosage": "2 gélules", "times": ["12:00"] }
      """
    Then the response status should be 201
    And remember the response field "id" as "omegaId"
    Given a logged-in user "eve"
    When "eve" sends POST "/supplements/{{omegaId}}/intake" with body:
      """
      {}
      """
    Then the response status should be 404
