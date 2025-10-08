import axios from 'axios';
import 'dotenv/config';

async function main() {
  const apiKey = process.env.ETHERSCAN_API_KEY || '';
  if (!apiKey) {
    console.error('ETHERSCAN_API_KEY is empty');
    process.exit(1);
  }

  // Test params
  const address =
    process.env.ADDRESS_BUY_CARD ||
    '0x6d344BaE0e16B3086B06DE186D5c2d0696c3082C';
  const contractAddress =
    process.env.CONTRACT_ADDRESS_USDT ||
    '0x55d398326f99059fF775485246999027B3197955';
  const chainId = 56; // BSC

  const url = 'https://api.etherscan.io/v2/api';
  const baseParams = {
    chainid: chainId,
    module: 'account',
    action: 'tokenbalance',
    contractaddress: contractAddress,
    address,
    tag: 'latest',
    apikey: apiKey,
  } as const;

  console.log(
    'Testing Etherscan API call with primary key:',
    apiKey.substring(0, 8) + '...',
  );
  console.log('Address:', address);
  console.log('Contract:', contractAddress);
  console.log('Chain ID:', chainId);

  const ts = new Date().toISOString();
  try {
    const res = await axios.get(url, { params: baseParams });
    const ok = res.data?.status === '1' && res.data?.message === 'OK';
    console.log(`[${ts}] Status: ${res.status} | OK=${ok}`);

    if (ok) {
      const balance = res.data?.result;
      console.log('✅ API call successful!');
      console.log('Balance (wei):', balance);
      console.log(
        'Balance (USDT):',
        (parseInt(balance) / Math.pow(10, 18)).toFixed(6),
      );
    } else {
      console.error('❌ API returned error message:', res.data?.message);
      console.error('Raw response:', JSON.stringify(res.data, null, 2));
      process.exit(1);
    }
  } catch (err: any) {
    console.error(`[${ts}] HTTP error:`, err?.message);
    if (err?.response) {
      console.error('Response status:', err.response.status);
      console.error(
        'Response data:',
        JSON.stringify(err.response.data, null, 2),
      );
    }
    process.exit(1);
  }
}

main();
