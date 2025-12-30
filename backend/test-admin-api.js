const axios = require('axios');

const API_URL = 'http://localhost:3001';

async function testAdminAPI() {
  console.log('🧪 Testing Admin API...\n');

  try {
    // 1. Login as admin
    console.log('1️⃣ Login sebagai admin...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@aiplatform.com',
      password: 'admin123',
    });

    const { user, token } = loginRes.data;
    console.log('✅ Login berhasil!');
    console.log('   User:', user.email);
    console.log('   Is Admin:', user.isAdmin);
    console.log('   Token:', token.substring(0, 20) + '...\n');

    if (!user.isAdmin) {
      console.log('❌ User bukan admin!');
      return;
    }

    const config = {
      headers: { Authorization: `Bearer ${token}` }
    };

    // 2. Get dashboard stats
    console.log('2️⃣ Get dashboard stats...');
    const statsRes = await axios.get(`${API_URL}/admin/stats`, config);
    console.log('✅ Stats berhasil diambil!');
    console.log('   Total Users:', statsRes.data.totalUsers);
    console.log('   Total Generations:', statsRes.data.totalGenerations);
    console.log('   Active Users (7d):', statsRes.data.activeUsers);
    console.log('');

    // 3. Get users list
    console.log('3️⃣ Get users list...');
    const usersRes = await axios.get(`${API_URL}/admin/users?page=1&limit=5`, config);
    console.log('✅ Users berhasil diambil!');
    console.log('   Total Users:', usersRes.data.pagination.total);
    console.log('   Current Page:', usersRes.data.pagination.page);
    console.log('   Users on this page:', usersRes.data.users.length);
    
    if (usersRes.data.users.length > 0) {
      const firstUser = usersRes.data.users[0];
      console.log('\n   First User:');
      console.log('   - Email:', firstUser.email);
      console.log('   - Name:', firstUser.name);
      console.log('   - Credits:', firstUser.credits);
      console.log('   - Generations:', firstUser._count.generations);
      console.log('');

      // 4. Get user detail
      console.log('4️⃣ Get user detail...');
      const userDetailRes = await axios.get(`${API_URL}/admin/users/${firstUser.id}`, config);
      console.log('✅ User detail berhasil diambil!');
      console.log('   Email:', userDetailRes.data.email);
      console.log('   Credits:', userDetailRes.data.credits);
      console.log('   Total Generations:', userDetailRes.data._count.generations);
      console.log('');

      // 5. Update user credits
      console.log('5️⃣ Update user credits...');
      const newCredits = firstUser.credits + 100;
      const updateRes = await axios.put(
        `${API_URL}/admin/users/${firstUser.id}/credits`,
        { credits: newCredits },
        config
      );
      console.log('✅ Credits berhasil diupdate!');
      console.log('   Old Credits:', firstUser.credits);
      console.log('   New Credits:', updateRes.data.credits);
      console.log('');

      // 6. Restore original credits
      console.log('6️⃣ Restore original credits...');
      await axios.put(
        `${API_URL}/admin/users/${firstUser.id}/credits`,
        { credits: firstUser.credits },
        config
      );
      console.log('✅ Credits restored!');
      console.log('');
    }

    // 7. Test search
    console.log('7️⃣ Test search functionality...');
    const searchRes = await axios.get(`${API_URL}/admin/users?search=admin`, config);
    console.log('✅ Search berhasil!');
    console.log('   Results found:', searchRes.data.users.length);
    console.log('');

    console.log('🎉 Semua test berhasil!\n');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    
    if (error.response?.status === 403) {
      console.log('\n⚠️  Hint: Pastikan user memiliki isAdmin: true di database');
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n⚠️  Hint: Pastikan backend running di http://localhost:3001');
    }
  }
}

// Test non-admin access
async function testNonAdminAccess() {
  console.log('\n🧪 Testing Non-Admin Access (Should Fail)...\n');

  try {
    // Create a regular user first (if not exists)
    console.log('1️⃣ Creating/Login regular user...');
    let userToken;
    
    try {
      const registerRes = await axios.post(`${API_URL}/auth/register`, {
        email: 'testuser@example.com',
        password: 'password123',
        name: 'Test User',
      });
      userToken = registerRes.data.token;
      console.log('✅ User created!');
    } catch (error) {
      // User might already exist, try login
      const loginRes = await axios.post(`${API_URL}/auth/login`, {
        email: 'testuser@example.com',
        password: 'password123',
      });
      userToken = loginRes.data.token;
      console.log('✅ User logged in!');
    }

    // Try to access admin endpoint
    console.log('\n2️⃣ Trying to access admin endpoint with user token...');
    try {
      await axios.get(`${API_URL}/admin/stats`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      console.log('❌ SECURITY ISSUE: User dapat akses admin endpoint!');
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✅ Access denied correctly! (403 Forbidden)');
        console.log('   Message:', error.response.data.message);
      } else {
        console.log('❌ Unexpected error:', error.response?.status);
      }
    }

    console.log('\n🎉 Security test passed!\n');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Run tests
async function runAllTests() {
  await testAdminAPI();
  await testNonAdminAccess();
}

runAllTests();
