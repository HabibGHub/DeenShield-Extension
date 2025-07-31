#!/bin/bash

# Professional testing suite for Deen Shield extension

set -e

echo "=========================================="
echo "     Deen Shield Extension Test Suite"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Test function
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo -n "Testing $test_name... "
    
    if eval "$test_command" &>/dev/null; then
        echo -e "${GREEN}PASS${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}FAIL${NC}"
        ((TESTS_FAILED++))
    fi
}

echo "?? Running validation tests..."
echo ""

# File existence tests
echo "?? File Structure Tests:"
run_test "manifest.json exists" "[ -f manifest.json ]"
run_test "manifest-v2.json exists" "[ -f manifest-v2.json ]"
run_test "popup.html exists" "[ -f popup.html ]"
run_test "popup.js exists" "[ -f popup.js ]"
run_test "background.js exists" "[ -f background.js ]"
run_test "background-v2.js exists" "[ -f background-v2.js ]"
run_test "polyfill.js exists" "[ -f polyfill.js ]"
run_test "package.json exists" "[ -f package.json ]"
run_test "LICENSE exists" "[ -f LICENSE ]"
run_test "PRIVACY_POLICY.md exists" "[ -f PRIVACY_POLICY.md ]"

echo ""

# Icon tests
echo "?? Icon Tests:"
run_test "icon16.png exists" "[ -f images/icon16.png ]"
run_test "icon32.png exists" "[ -f images/icon32.png ]"
run_test "icon48.png exists" "[ -f images/icon48.png ]"
run_test "icon128.png exists" "[ -f images/icon128.png ]"

echo ""

# JSON validation tests
echo "?? JSON Validation Tests:"
run_test "manifest.json valid JSON" "cat manifest.json | python -m json.tool"
run_test "manifest-v2.json valid JSON" "cat manifest-v2.json | python -m json.tool"
run_test "package.json valid JSON" "cat package.json | python -m json.tool"

echo ""

# Content validation tests
echo "?? Content Validation Tests:"
run_test "manifest has required name" "grep -q '\"name\".*Deen Shield' manifest.json"
run_test "manifest has version" "grep -q '\"version\"' manifest.json"
run_test "manifest has description" "grep -q '\"description\"' manifest.json"
run_test "manifest has permissions" "grep -q '\"permissions\"' manifest.json"
run_test "background.js has blocking logic" "grep -q 'updateBlockingRules' background.js"
run_test "popup.js has DOM ready" "grep -q 'DOMContentLoaded' popup.js"

echo ""

# Build tests
echo "?? Build Tests:"
if [ -f build-chrome.bat ]; then
    run_test "Chrome build script exists" "true"
else
    run_test "Chrome build script exists" "false"
fi

if [ -f build-firefox.bat ]; then
    run_test "Firefox build script exists" "true"
else
    run_test "Firefox build script exists" "false"
fi

echo ""

# Security tests
echo "?? Security Tests:"
run_test "No hardcoded passwords" "! grep -i 'password.*=' *.js"
run_test "No API keys in code" "! grep -i 'api_key\|apikey' *.js"
run_test "No eval() usage" "! grep -i 'eval(' *.js"

echo ""

# Performance tests
echo "? Performance Tests:"
run_test "manifest.json < 10KB" "[ $(stat -c%s manifest.json) -lt 10240 ]"
run_test "popup.html < 50KB" "[ $(stat -c%s popup.html) -lt 51200 ]"
run_test "background.js < 100KB" "[ $(stat -c%s background.js) -lt 102400 ]"

echo ""

# Web store compliance tests
echo "?? Web Store Compliance Tests:"
run_test "Privacy policy exists and not empty" "[ -s PRIVACY_POLICY.md ]"
run_test "License file exists" "[ -f LICENSE ]"
run_test "README.md exists" "[ -f README.md ]"
run_test "No excessive permissions" "[ $(grep -c '\"' manifest.json | grep permissions) -lt 10 ]"

echo ""

# Browser-specific tests
echo "?? Browser Compatibility Tests:"
run_test "Chrome manifest has service_worker" "grep -q 'service_worker' manifest.json"
run_test "Firefox manifest has background scripts" "grep -q 'scripts' manifest-v2.json"
run_test "Both manifests have same version" "[ $(grep version manifest.json | cut -d'\"' -f4) = $(grep version manifest-v2.json | cut -d'\"' -f4) ]"

echo ""
echo "=========================================="
echo "           Test Results Summary"
echo "=========================================="

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))

echo "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}?? All tests passed! Extension is ready for submission.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Run: npm run build"
    echo "2. Test manually in browsers"
    echo "3. Review WEBSTORE_SUBMISSION_GUIDE.md"
    echo "4. Submit to web stores"
    exit 0
else
    echo ""
    echo -e "${RED}? Some tests failed. Please fix issues before submission.${NC}"
    exit 1
fi