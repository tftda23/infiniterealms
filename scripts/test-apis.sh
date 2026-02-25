#!/bin/bash

# Comprehensive API Test Script
# Collects all errors to fix in batch

BASE_URL="${1:-http://localhost:3001}"
ERRORS=()

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_test() {
    echo -e "${YELLOW}TEST:${NC} $1"
}

log_pass() {
    echo -e "${GREEN}PASS:${NC} $1"
}

log_fail() {
    echo -e "${RED}FAIL:${NC} $1"
    ERRORS+=("$1")
}

test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=$4
    local desc=$5

    log_test "$desc"

    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint" 2>&1)
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$BASE_URL$endpoint" 2>&1)
    fi

    status=$(echo "$response" | tail -1)
    body=$(echo "$response" | sed '$d')

    if [ "$status" = "$expected_status" ]; then
        log_pass "$desc (status: $status)"
        echo "$body" | head -1
    else
        log_fail "$desc - Expected $expected_status, got $status"
        echo "Response: $body" | head -3
    fi
    echo ""
}

echo "=========================================="
echo "  D&D Solo API Comprehensive Test Suite"
echo "=========================================="
echo "Base URL: $BASE_URL"
echo ""

# ===========================================
# 1. Database Health Check
# ===========================================
echo "--- DATABASE TESTS ---"
test_endpoint "GET" "/api/db/setup" "" "200" "DB Health Check"

# ===========================================
# 2. Campaign API Tests
# ===========================================
echo "--- CAMPAIGN API TESTS ---"

# List campaigns (should work even if empty)
test_endpoint "GET" "/api/campaigns" "" "200" "List all campaigns"

# Create campaign - valid
test_endpoint "POST" "/api/campaigns" \
    '{"name":"Test Campaign","description":"A test campaign","worldSetting":"Forgotten Realms"}' \
    "201" "Create campaign - valid data"

# Create campaign - missing name (should fail validation)
test_endpoint "POST" "/api/campaigns" \
    '{"description":"No name provided"}' \
    "400" "Create campaign - missing required field (validation)"

# Create campaign - empty name (should fail)
test_endpoint "POST" "/api/campaigns" \
    '{"name":"","description":"Empty name"}' \
    "400" "Create campaign - empty name (validation)"

# Get campaign - invalid UUID format
test_endpoint "GET" "/api/campaigns/not-a-uuid" "" "400" "Get campaign - invalid UUID format"

# Get campaign - valid but non-existent UUID
test_endpoint "GET" "/api/campaigns/00000000-0000-0000-0000-000000000000" "" "404" "Get campaign - non-existent UUID"

# Update campaign - invalid UUID
test_endpoint "PATCH" "/api/campaigns/invalid-uuid" \
    '{"name":"Updated"}' \
    "400" "Update campaign - invalid UUID"

# Delete campaign - invalid UUID
test_endpoint "DELETE" "/api/campaigns/not-valid" "" "400" "Delete campaign - invalid UUID"

# ===========================================
# 3. Character API Tests
# ===========================================
echo "--- CHARACTER API TESTS ---"

# Get characters - missing campaignId
test_endpoint "GET" "/api/characters" "" "400" "Get characters - missing campaignId"

# Get characters - invalid UUID
test_endpoint "GET" "/api/characters?campaignId=invalid" "" "400" "Get characters - invalid campaignId"

# Create character - missing required fields
test_endpoint "POST" "/api/characters" \
    '{"name":"Test Hero"}' \
    "400" "Create character - missing required fields"

# Create character - invalid campaignId
test_endpoint "POST" "/api/characters" \
    '{"campaignId":"not-a-uuid","name":"Hero","race":"Human","class":"Fighter"}' \
    "400" "Create character - invalid campaignId format"

# Create character - valid campaignId but non-existent
test_endpoint "POST" "/api/characters" \
    '{"campaignId":"00000000-0000-0000-0000-000000000000","name":"Hero","race":"Human","class":"Fighter"}' \
    "500" "Create character - non-existent campaign (FK violation)"

# Get character - invalid ID
test_endpoint "GET" "/api/characters/invalid-uuid" "" "400" "Get character - invalid ID"

# Update character - invalid ability scores
test_endpoint "PATCH" "/api/characters/00000000-0000-0000-0000-000000000000" \
    '{"abilityScores":{"strength":100}}' \
    "400" "Update character - ability score out of range"

# ===========================================
# 4. Game State API Tests
# ===========================================
echo "--- GAME STATE API TESTS ---"

# Get game state - missing campaignId
test_endpoint "GET" "/api/game-state" "" "400" "Get game state - missing campaignId"

# Get game state - invalid UUID
test_endpoint "GET" "/api/game-state?campaignId=invalid" "" "400" "Get game state - invalid campaignId"

# Update game state - invalid data
test_endpoint "PATCH" "/api/game-state?campaignId=00000000-0000-0000-0000-000000000000" \
    '{"partyGold":-100}' \
    "400" "Update game state - negative gold (validation)"

# Update game state - invalid time of day
test_endpoint "PATCH" "/api/game-state?campaignId=00000000-0000-0000-0000-000000000000" \
    '{"timeOfDay":"invalid-time"}' \
    "400" "Update game state - invalid timeOfDay enum"

# ===========================================
# 5. Chat API Tests
# ===========================================
echo "--- CHAT API TESTS ---"

# Get chat - missing campaignId
test_endpoint "GET" "/api/chat" "" "400" "Get chat - missing campaignId"

# Get chat - invalid UUID
test_endpoint "GET" "/api/chat?campaignId=invalid-uuid" "" "400" "Get chat - invalid campaignId"

# Post chat - missing message
test_endpoint "POST" "/api/chat" \
    '{"campaignId":"00000000-0000-0000-0000-000000000000"}' \
    "400" "Post chat - missing message"

# Post chat - empty message
test_endpoint "POST" "/api/chat" \
    '{"campaignId":"00000000-0000-0000-0000-000000000000","message":""}' \
    "400" "Post chat - empty message"

# Post chat - message too long (over 10000 chars)
LONG_MSG=$(printf 'x%.0s' {1..10001})
test_endpoint "POST" "/api/chat" \
    "{\"campaignId\":\"00000000-0000-0000-0000-000000000000\",\"message\":\"$LONG_MSG\"}" \
    "400" "Post chat - message too long"

# ===========================================
# 6. Scene Image API Tests
# ===========================================
echo "--- SCENE IMAGE API TESTS ---"

# Generate image - missing campaignId
test_endpoint "POST" "/api/scene-image" \
    '{"description":"A dark forest"}' \
    "400" "Scene image - missing campaignId"

# Generate image - invalid theme
test_endpoint "POST" "/api/scene-image" \
    '{"campaignId":"00000000-0000-0000-0000-000000000000","description":"Test","theme":"invalid-theme"}' \
    "400" "Scene image - invalid theme enum"

# Generate image - empty description
test_endpoint "POST" "/api/scene-image" \
    '{"campaignId":"00000000-0000-0000-0000-000000000000","description":""}' \
    "400" "Scene image - empty description"

# ===========================================
# 7. Integration Tests - Full Flow
# ===========================================
echo "--- INTEGRATION TESTS ---"

# Create a campaign for integration tests
log_test "Creating test campaign for integration..."
CAMPAIGN_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{"name":"Integration Test Campaign","description":"For testing"}' \
    "$BASE_URL/api/campaigns")
CAMPAIGN_ID=$(echo "$CAMPAIGN_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$CAMPAIGN_ID" ]; then
    log_pass "Created campaign: $CAMPAIGN_ID"

    # Test getting the campaign
    test_endpoint "GET" "/api/campaigns/$CAMPAIGN_ID" "" "200" "Integration - Get created campaign"

    # Test creating a character
    CHARACTER_RESPONSE=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{\"campaignId\":\"$CAMPAIGN_ID\",\"name\":\"Test Hero\",\"race\":\"Human\",\"class\":\"Fighter\",\"level\":1,\"maxHp\":12}" \
        "$BASE_URL/api/characters")
    CHARACTER_ID=$(echo "$CHARACTER_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

    if [ -n "$CHARACTER_ID" ]; then
        log_pass "Created character: $CHARACTER_ID"

        # Test getting the character
        test_endpoint "GET" "/api/characters/$CHARACTER_ID" "" "200" "Integration - Get created character"

        # Test updating character HP
        test_endpoint "PATCH" "/api/characters/$CHARACTER_ID" \
            '{"currentHp":8}' \
            "200" "Integration - Update character HP"

        # Test getting characters for campaign
        test_endpoint "GET" "/api/characters?campaignId=$CAMPAIGN_ID" "" "200" "Integration - Get campaign characters"
    else
        log_fail "Failed to create character for integration test"
    fi

    # Test game state
    test_endpoint "GET" "/api/game-state?campaignId=$CAMPAIGN_ID" "" "200" "Integration - Get game state"

    test_endpoint "PATCH" "/api/game-state?campaignId=$CAMPAIGN_ID" \
        '{"partyGold":100,"timeOfDay":"evening","weather":"rainy"}' \
        "200" "Integration - Update game state"

    # Test chat history
    test_endpoint "GET" "/api/chat?campaignId=$CAMPAIGN_ID" "" "200" "Integration - Get chat history"

    # Cleanup - delete test data
    if [ -n "$CHARACTER_ID" ]; then
        curl -s -X DELETE "$BASE_URL/api/characters/$CHARACTER_ID" > /dev/null
        log_pass "Cleaned up test character"
    fi
    curl -s -X DELETE "$BASE_URL/api/campaigns/$CAMPAIGN_ID" > /dev/null
    log_pass "Cleaned up test campaign"
else
    log_fail "Failed to create campaign for integration test"
fi

# ===========================================
# Summary
# ===========================================
echo ""
echo "=========================================="
echo "  TEST SUMMARY"
echo "=========================================="
echo "Total errors found: ${#ERRORS[@]}"

if [ ${#ERRORS[@]} -gt 0 ]; then
    echo ""
    echo "Failed tests:"
    for err in "${ERRORS[@]}"; do
        echo "  - $err"
    done
    exit 1
else
    echo "All tests passed!"
    exit 0
fi
