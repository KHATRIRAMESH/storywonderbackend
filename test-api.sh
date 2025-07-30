#!/bin/bash

# Test script for the Storybook Server
echo "🧪 Testing Storybook Server..."

# Test health endpoint
echo "1. Testing health endpoint..."
curl -s http://localhost:8000/health | jq

echo -e "\n2. Testing get stories endpoint..."
curl -s -H "Authorization: Bearer test-token" http://localhost:8000/api/stories | jq

echo -e "\n3. Testing story creation..."
curl -s -X POST \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{
    "childName": "Emma",
    "childAge": 7,
    "childGender": "female",
    "interests": "unicorns and painting",
    "theme": "magical forest",
    "companions": "a talking rabbit",
    "pageCount": 5
  }' \
  http://localhost:8000/api/stories | jq

echo -e "\n4. Checking stories list again..."
sleep 2
curl -s -H "Authorization: Bearer test-token" http://localhost:8000/api/stories | jq

echo -e "\n✅ Test completed!"
