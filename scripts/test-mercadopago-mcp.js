import dotenv from 'dotenv';
dotenv.config();

const mpToken = process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN || '';

async function testMercadoPagoMcp() {
  console.log('==================================================');
  console.log('Testing Mercado Pago Official MCP Server Connection...');
  console.log('MCP Endpoint: https://mcp.mercadopago.com/mcp');
  console.log('Access Token Provided:', mpToken ? `${mpToken.substring(0, 15)}...` : 'NOT FOUND IN .ENV');

  try {
    // 1. Send JSON-RPC initialize request
    const initPayload = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'antigravity-agent',
          version: '1.0.0'
        }
      }
    };

    const headers = {
      'Content-Type': 'application/json'
    };
    if (mpToken) {
      headers['Authorization'] = `Bearer ${mpToken}`;
    }

    console.log('\n--> Sending initialize request to MCP Server...');
    const initRes = await fetch('https://mcp.mercadopago.com/mcp', {
      method: 'POST',
      headers,
      body: JSON.stringify(initPayload)
    });

    console.log('HTTP Status:', initRes.status, initRes.statusText);
    const initText = await initRes.text();
    console.log('Initialize Response:', initText.substring(0, 500));

    // 2. Discover Tools (tools/list)
    const listToolsPayload = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    };

    console.log('\n--> Sending tools/list request to MCP Server...');
    const toolsRes = await fetch('https://mcp.mercadopago.com/mcp', {
      method: 'POST',
      headers,
      body: JSON.stringify(listToolsPayload)
    });

    console.log('Tools HTTP Status:', toolsRes.status, toolsRes.statusText);
    const toolsText = await toolsRes.text();
    console.log('Tools/List Response:', toolsText);

  } catch (err) {
    console.error('❌ Error connecting to Mercado Pago MCP Server:', err.message);
  }
}

testMercadoPagoMcp();
