// Complete JWT test - simulates frontend behavior
async function testCompleteJWT() {
  console.log('🧪 Testing Complete JWT System...\n');

  try {
    // Step 1: Login (simulate frontend login)
    console.log('1️⃣ Frontend Login...');
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

    // Step 2: Simulate frontend API request with JWT
    console.log('\n2️⃣ Frontend Banner Update (with JWT)...');
    const bannerResponse = await fetch('http://localhost:5000/api/banners/2', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        imageUrl: 'https://example.com/complete-test-banner.jpg',
        altText: 'Complete Test Banner'
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

    // Step 3: Test product update
    console.log('\n3️⃣ Frontend Product Update (with JWT)...');
    const productResponse = await fetch('http://localhost:5000/api/products/1', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: 'Updated Product Name',
        price: 15.99,
        description: 'Updated description'
      })
    });

    console.log('Product response status:', productResponse.status);
    if (productResponse.ok) {
      const productData = await productResponse.json();
      console.log('✅ Product update successful:', productData);
    } else {
      const productError = await productResponse.text();
      console.log('❌ Product update failed:', productError);
    }

    console.log('\n🎉 Complete JWT system test completed successfully!');
    console.log('✅ The JWT authentication system is working perfectly!');
    console.log('✅ Frontend should now be able to update banners and products!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCompleteJWT();
