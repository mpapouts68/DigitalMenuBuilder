// Test script to verify session fix

async function testSessionFix() {
  try {
    console.log('🧪 Testing session fix...');
    
    // Step 1: Login and capture session cookie
    console.log('1. Logging in...');
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.statusText}`);
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ Login successful:', loginData.message);
    
    // Get session cookie
    const setCookieHeader = loginResponse.headers.get('set-cookie');
    console.log('🍪 Set-Cookie header:', setCookieHeader);
    
    if (!setCookieHeader) {
      throw new Error('No session cookie received');
    }
    
    // Extract the session cookie
    const sessionCookie = setCookieHeader.split(';')[0];
    console.log('🍪 Session cookie:', sessionCookie);
    
    // Step 2: Test banner update with session cookie
    console.log('2. Testing banner update with session...');
    const updateResponse = await fetch('http://localhost:5000/api/banners/2', {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify({
        imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800',
        altText: 'Session Test Banner'
      }),
    });
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Banner update failed: ${updateResponse.statusText} - ${errorText}`);
    }
    
    const updatedBanner = await updateResponse.json();
    console.log('✅ Banner updated successfully:', updatedBanner);
    
    // Step 3: Test authentication check
    console.log('3. Testing authentication check...');
    const authResponse = await fetch('http://localhost:5000/api/auth/user', {
      headers: { 'Cookie': sessionCookie }
    });
    
    if (!authResponse.ok) {
      throw new Error(`Auth check failed: ${authResponse.statusText}`);
    }
    
    const authData = await authResponse.json();
    console.log('✅ Auth check successful:', authData);
    
    console.log('🎉 Session fix test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testSessionFix();
