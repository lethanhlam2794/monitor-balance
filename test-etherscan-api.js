/**
 * Script test Etherscan API
 * Kiểm tra API key và test API calls
 */

const axios = require('axios');

// Test Etherscan API
const testEtherscanAPI = async () => {
  try {
    console.log('🔍 Testing Etherscan API...');
    
    // Lấy API key từ environment
    const apiKey = process.env.ETHERSCAN_API_KEY;
    
    if (!apiKey) {
      console.log('❌ ETHERSCAN_API_KEY not found in environment variables');
      return;
    }
    
    console.log(`✅ API Key found: ${apiKey.substring(0, 8)}...`);
    
    // Test API với địa chỉ ví test
    const testAddress = process.env.ADDRESS_BUY_CARD || '0x1234567890123456789012345678901234567890';
    const contractAddress = process.env.CONTRACT_ADDRESS_USDT || '0x55d398326f99059fF775485246999027B3197955'; // USDT BSC
    
    console.log(`\n📋 Test parameters:`);
    console.log(`   - Test Address: ${testAddress}`);
    console.log(`   - Contract Address: ${contractAddress}`);
    console.log(`   - Chain ID: 56 (BSC)`);
    
    const url = 'https://api.etherscan.io/v2/api';
    const params = {
      chainid: 56,
      module: 'account',
      action: 'tokenbalance',
      contractaddress: contractAddress,
      address: testAddress,
      tag: 'latest',
      apikey: apiKey,
    };
    
    console.log('\n🚀 Making API request...');
    const response = await axios.get(url, { params });
    
    console.log('\n📊 API Response:');
    console.log(`   - Status: ${response.data.status}`);
    console.log(`   - Message: ${response.data.message}`);
    console.log(`   - Result: ${response.data.result}`);
    
    if (response.data.status === '1' && response.data.message === 'OK') {
      console.log('✅ API call successful!');
    } else {
      console.log('❌ API call failed!');
      console.log(`   - Error: ${response.data.message}`);
    }
    
  } catch (error) {
    console.error('❌ Error testing Etherscan API:', error.message);
    
    if (error.response) {
      console.log(`   - Status: ${error.response.status}`);
      console.log(`   - Data: ${JSON.stringify(error.response.data)}`);
    }
  }
};

// Test với các địa chỉ khác nhau
const testMultipleAddresses = async () => {
  console.log('\n🔍 Testing with multiple addresses...');
  
  const testCases = [
    {
      name: 'Buy Card Address',
      address: process.env.ADDRESS_BUY_CARD,
      contract: process.env.CONTRACT_ADDRESS_USDT
    },
    {
      name: 'Master Fund Address',
      address: process.env.WALLET_DEPOSIT_MASTER_FUND,
      contract: process.env.CONTRACT_ADDRESS_USDT
    }
  ];
  
  for (const testCase of testCases) {
    if (!testCase.address || !testCase.contract) {
      console.log(`\n⏭️  Skipping ${testCase.name} - missing environment variables`);
      continue;
    }
    
    console.log(`\n📋 Testing ${testCase.name}:`);
    console.log(`   - Address: ${testCase.address}`);
    console.log(`   - Contract: ${testCase.contract}`);
    
    try {
      const url = 'https://api.etherscan.io/v2/api';
      const params = {
        chainid: 56,
        module: 'account',
        action: 'tokenbalance',
        contractaddress: testCase.contract,
        address: testCase.address,
        tag: 'latest',
        apikey: process.env.ETHERSCAN_API_KEY,
      };
      
      const response = await axios.get(url, { params });
      
      console.log(`   - Status: ${response.data.status}`);
      console.log(`   - Message: ${response.data.message}`);
      
      if (response.data.status === '1' && response.data.message === 'OK') {
        console.log('   ✅ Success');
      } else {
        console.log('   ❌ Failed');
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
};

// Main function
const main = async () => {
  console.log('🚀 Starting Etherscan API test...');
  
  // Load environment variables
  require('dotenv').config();
  
  await testEtherscanAPI();
  await testMultipleAddresses();
  
  console.log('\n✅ Test completed!');
};

// Chạy script
main().catch(console.error);
