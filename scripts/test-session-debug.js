// Test session debugging

async function testSessionDebug() {
  console.log('🧪 Testing session debugging...\n');

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

    // Get the session cookie
    const setCookieHeader = loginResponse.headers.get('set-cookie');
    console.log('🍪 Set-Cookie header:', setCookieHeader);

    if (!setCookieHeader) {
      throw new Error('No session cookie received');
    }

    // Extract the session cookie
    const sessionCookie = setCookieHeader.split(';')[0];
    console.log('🍪 Session cookie:', sessionCookie);

    // Step 2: Test auth endpoint immediately
    console.log('\n2️⃣ Testing auth endpoint immediately...');
    const authResponse = await fetch('http://localhost:5000/api/auth/user', {
      headers: {
        'Cookie': sessionCookie
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
        'Cookie': sessionCookie
      },
      body: JSON.stringify({
        imageUrl: 'https://example.com/test-banner.jpg',
        altText: 'Test banner'
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

    // Step 4: Wait a moment and test again
    console.log('\n4️⃣ Waiting 2 seconds and testing again...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    const authResponse2 = await fetch('http://localhost:5000/api/auth/user', {
      headers: {
        'Cookie': sessionCookie
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

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSessionDebug();
