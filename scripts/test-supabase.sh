#!/bin/bash
# Diagnostic script to test Supabase connection from Vercel environment

echo "=== Testing Supabase Connection ===" 

# Test 1: Check if variables are set
echo "✓ Checking environment variables..."
if [ -z "$VITE_SUPABASE_URL" ]; then
  echo "❌ VITE_SUPABASE_URL is not set"
  exit 1
fi

if [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
  echo "❌ VITE_SUPABASE_ANON_KEY is not set"
  exit 1
fi

echo "✓ Variables are set"

# Test 2: Test basic connection with curl
echo "✓ Testing connection to Supabase..."
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  "${VITE_SUPABASE_URL}/rest/v1/inspection_results?limit=1" 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✓ Successfully connected and fetched data"
  echo "Response: $BODY"
elif [ "$HTTP_CODE" = "401" ]; then
  echo "❌ 401 Unauthorized - Check if VITE_SUPABASE_ANON_KEY is correct"
  exit 1
elif [ "$HTTP_CODE" = "403" ]; then
  echo "❌ 403 Forbidden - RLS policy might be blocking access"
  echo "Check Supabase Dashboard > SQL Editor > Policies on inspection_results table"
  exit 1
else
  echo "❌ HTTP $HTTP_CODE"
  echo "Response: $BODY"
  exit 1
fi

echo "✓ All tests passed!"
