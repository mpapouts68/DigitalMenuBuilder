// Test JWT authentication system
async function testJWTAuth() {
  console.log('🧪 Testing JWT authentication system...\n');

  try {
    // Step 1: Login
    console.log('1️⃣ Logging in...');
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login successful:', loginData);

    if (!loginData.token) {
      throw new Error('No JWT token received');
    }

    const token = loginData.token;
    console.log('🔑 JWT Token received:', token.substring(0, 50) + '...');

    // Step 2: Test auth endpoint
    console.log('\n2️⃣ Testing auth endpoint...');
    const authResponse = await fetch('http://localhost:5000/api/auth/user', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('Auth response status:', authResponse.status);
    if (authResponse.ok) {
      const authData = await authResponse.json();
      console.log('✅ Auth check successful:', authData);
    } else {
      const authError = await authResponse.text();
      console.log('❌ Auth check failed:', authError);
    }

    // Step 3: Test banner update
    console.log('\n3️⃣ Testing banner update...');
    const bannerResponse = await fetch('http://localhost:5000/api/banners/2', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        imageUrl: 'https://example.com/jwt-test-banner.jpg',
        altText: 'JWT Test banner'
      })
    });

    console.log('Banner response status:', bannerResponse.status);
    if (bannerResponse.ok) {
      const bannerData = await bannerResponse.json();
      console.log('✅ Banner update successful:', bannerData);
    } else {
      const bannerError = await bannerResponse.text();
      console.log('❌ Banner update failed:', bannerError);
    }

    // Step 4: Wait and test again
    console.log('\n4️⃣ Waiting 2 seconds and testing again...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    const authResponse2 = await fetch('http://localhost:5000/api/auth/user', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('Auth response 2 status:', authResponse2.status);
    if (authResponse2.ok) {
      const authData2 = await authResponse2.json();
      console.log('✅ Auth check 2 successful:', authData2);
    } else {
      const authError2 = await authResponse2.text();
      console.log('❌ Auth check 2 failed:', authError2);
    }

    console.log('\n🎉 JWT authentication system test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testJWTAuth();
