Feature: Food journal (É3)
  Foods come from the provider (barcode/search, cached locally) or are created
  manually; journal entries snapshot kcal/macros at log time and the daily
  view sums totals per meal.

  Scenario: Create a custom food, search it, journal it, check day totals
    Given a logged-in user "alice"
    When "alice" sends POST "/foods" with body:
      """
      { "name": "Omelette maison e2e", "kcal_per_100g": 154,
        "protein_per_100g": 11, "carbs_per_100g": 1, "fat_per_100g": 12 }
      """
    Then the response status should be 201
    And the response field "source" should equal "custom"
    And remember the response field "id" as "foodId"

    When "alice" sends GET "/foods/search?q=omelette%20maison"
    Then the response is successful
    And the response list should contain an item where "id" equals "{{foodId}}"

    When "alice" sends POST "/journal" with body:
      """
      { "food_item_id": "{{foodId}}", "meal": "breakfast",
        "quantity_g": 200, "eaten_on": "2026-07-10" }
      """
    Then the response status should be 201
    # 154 kcal/100g × 200g = 308 kcal, snapshotted on the entry
    And the response field "kcal" should equal "308"
    And remember the response field "id" as "entryId"

    When "alice" sends GET "/journal?date=2026-07-10"
    Then the response is successful
    And the response field "totals.kcal" should equal "308"
    And the response field "totals.protein_g" should equal "22"

    When "alice" sends DELETE "/journal/{{entryId}}"
    Then the response status should be 204
    When "alice" sends GET "/journal?date=2026-07-10"
    Then the response field "totals.kcal" should equal "0"

  Scenario: Barcode scan resolves through the provider and is cached
    Given a logged-in user "bob"
    # The compose stack binds the deterministic mock provider (D3).
    When "bob" sends GET "/foods/barcode/3017620422003"
    Then the response is successful
    And the response field "off_barcode" should equal "3017620422003"
    And the response field "source" should equal "off"
    And remember the response field "id" as "scannedId"

    # Scanning again returns the same cached row.
    When "bob" sends GET "/foods/barcode/3017620422003"
    Then the response is successful
    And the response field "id" should equal "{{scannedId}}"

    When "bob" sends GET "/foods/barcode/0000000000000"
    Then the response status should be 404

  Scenario: Favorites and recents power quick-add
    Given a logged-in user "carol"
    When "carol" sends POST "/foods" with body:
      """
      { "name": "Skyr vanille e2e", "kcal_per_100g": 62,
        "protein_per_100g": 10, "carbs_per_100g": 4.6, "fat_per_100g": 0.2 }
      """
    Then the response status should be 201
    And remember the response field "id" as "skyrId"

    When "carol" sends POST "/foods/{{skyrId}}/favorite"
    Then the response status should be 204
    When "carol" sends GET "/foods/favorites"
    Then the response list should contain an item where "id" equals "{{skyrId}}"

    When "carol" sends POST "/journal" with body:
      """
      { "food_item_id": "{{skyrId}}", "meal": "snack", "quantity_g": 150 }
      """
    Then the response status should be 201
    When "carol" sends GET "/foods/recent"
    Then the response list should contain an item where "id" equals "{{skyrId}}"

    When "carol" sends DELETE "/foods/{{skyrId}}/favorite"
    Then the response status should be 204
    When "carol" sends GET "/foods/favorites"
    Then the response list should not contain an item where "id" equals "{{skyrId}}"

  Scenario: A private custom food is not journalable by another user
    Given a logged-in user "dave"
    When "dave" sends POST "/foods" with body:
      """
      { "name": "Secret shake e2e", "kcal_per_100g": 400,
        "protein_per_100g": 30, "carbs_per_100g": 40, "fat_per_100g": 10 }
      """
    Then the response status should be 201
    And remember the response field "id" as "secretId"
    Given a logged-in user "eve"
    When "eve" sends POST "/journal" with body:
      """
      { "food_item_id": "{{secretId}}", "meal": "lunch", "quantity_g": 100 }
      """
    Then the response status should be 403
