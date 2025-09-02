const axios = require("axios");

const BASE_URL = "http://localhost:5000/api";

// Test function to check if routes are working
async function testRoutes() {
  console.log("🧪 Testing API Routes...\n");

  try {
    // Test health endpoint
    console.log("1. Testing health endpoint...");
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log("✅ Health check:", healthResponse.data);
  } catch (error) {
    console.log("❌ Health check failed:", error.message);
  }

  try {
    // Test 404 endpoint
    console.log("\n2. Testing 404 endpoint...");
    await axios.get(`${BASE_URL}/nonexistent`);
  } catch (error) {
    if (error.response?.status === 404) {
      console.log("✅ 404 handling works correctly");
    } else {
      console.log("❌ 404 handling failed:", error.message);
    }
  }

  try {
    // Test expense routes (without auth - should get 401)
    console.log("\n3. Testing expense routes (should get 401)...");
    await axios.get(`${BASE_URL}/expenses/groups/test-group-id/expenses`);
  } catch (error) {
    if (error.response?.status === 401) {
      console.log("✅ Auth protection works correctly");
    } else {
      console.log("❌ Auth protection failed:", error.message);
    }
  }

  try {
    // Test expense summary route (without auth - should get 401)
    console.log("\n4. Testing expense summary route (should get 401)...");
    await axios.get(
      `${BASE_URL}/expenses/groups/test-group-id/expenses/summary`
    );
  } catch (error) {
    if (error.response?.status === 401) {
      console.log("✅ Summary route auth protection works correctly");
    } else {
      console.log("❌ Summary route auth protection failed:", error.message);
    }
  }

  console.log("\n🎉 Route testing completed!");
}

// Run the test
testRoutes().catch(console.error);
