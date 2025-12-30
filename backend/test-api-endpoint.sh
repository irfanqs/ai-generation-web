#!/bin/bash

# Test script untuk API endpoint
# Ganti TOKEN dengan JWT token Anda

echo "Testing text-to-image endpoint..."
echo ""

# Ambil token dari login
echo "Step 1: Login to get token..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }')

echo "Login response: $LOGIN_RESPONSE"
echo ""

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get token. Please register first or check credentials."
  exit 1
fi

echo "✅ Token obtained: ${TOKEN:0:20}..."
echo ""

# Test text-to-image
echo "Step 2: Testing text-to-image..."
curl -X POST http://localhost:3001/generation/text-to-image \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "prompt": "A cute cat sitting on a chair"
  }' | jq .

echo ""
echo "Done! Check backend logs for details."
