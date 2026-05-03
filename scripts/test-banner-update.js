// Test script to verify banner update functionality

async function testBannerUpdate() {
  try {
    console.log('🧪 Testing banner update functionality...');
    
    // Step 1: Login to get session
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
    
    // Get cookies from login response
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('🍪 Session cookies:', cookies);
    
    // Step 2: Get current promotional banner
    console.log('2. Getting current promotional banner...');
    const bannerResponse = await fetch('http://localhost:5000/api/banners/type/promotional', {
      headers: { 'Cookie': cookies }
    });
    
    if (!bannerResponse.ok) {
      throw new Error(`Failed to get banner: ${bannerResponse.statusText}`);
    }
    
    const banner = await bannerResponse.json();
    console.log('✅ Current banner:', banner);
    
    // Step 3: Update the banner
    console.log('3. Updating banner...');
    const updateResponse = await fetch(`http://localhost:5000/api/banners/${banner.id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({
        imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800',
        altText: 'Updated Daily Specials - Test'
      }),
    });
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Banner update failed: ${updateResponse.statusText} - ${errorText}`);
    }
    
    const updatedBanner = await updateResponse.json();
    console.log('✅ Banner updated successfully:', updatedBanner);
    
    console.log('🎉 Banner update test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testBannerUpdate();
