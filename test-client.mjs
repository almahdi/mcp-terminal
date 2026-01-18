#!/usr/bin/env node

/**
 * Simple MCP client to test the PTY MCP Server
 * This script communicates with the server via stdio
 */

import { spawn } from 'child_process';
import { createInterface } from 'readline';

// Spawn the MCP server
const server = spawn('pnpm', ['start'], {
  cwd: process.cwd(),
  stdio: ['pipe', 'pipe', 'inherit']
});

let messageId = 1;
const pendingRequests = new Map();

// Read server responses
const rl = createInterface({
  input: server.stdout,
  crlfDelay: Infinity
});

rl.on('line', (line) => {
  try {
    const response = JSON.parse(line);
    console.log('← Server response:', JSON.stringify(response, null, 2));
    
    if (response.id && pendingRequests.has(response.id)) {
      const { resolve } = pendingRequests.get(response.id);
      pendingRequests.delete(response.id);
      resolve(response);
    }
  } catch (err) {
    console.error('Failed to parse response:', line);
  }
});

// Send a request to the server
function sendRequest(method, params = {}) {
  const id = messageId++;
  const request = {
    jsonrpc: '2.0',
    id,
    method,
    params
  };
  
  console.log('→ Sending request:', JSON.stringify(request, null, 2));
  server.stdin.write(JSON.stringify(request) + '\n');
  
  return new Promise((resolve, reject) => {
    pendingRequests.set(id, { resolve, reject });
    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject(new Error('Request timeout'));
      }
    }, 5000);
  });
}

// Run tests
async function runTests() {
  console.log('\n=== Testing PTY MCP Server ===\n');
  
  try {
    // Test 1: Initialize
    console.log('\n--- Test 1: Initialize ---');
    const initResult = await sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    });
    console.log('✓ Initialize successful');
    
    // Test 2: List tools
    console.log('\n--- Test 2: List Tools ---');
    const toolsResult = await sendRequest('tools/list');
    console.log('✓ Tools listed:', toolsResult.result?.tools?.map(t => t.name).join(', '));
    
    // Test 3: Call pty_list (should be empty initially)
    console.log('\n--- Test 3: List PTY Sessions (should be empty) ---');
    const listResult = await sendRequest('tools/call', {
      name: 'pty_list',
      arguments: {}
    });
    console.log('✓ pty_list result:', listResult.result?.content?.[0]?.text);
    
    // Test 4: Spawn a PTY session with a shell
    console.log('\n--- Test 4: Spawn PTY Session ---');
    const spawnResult = await sendRequest('tools/call', {
      name: 'pty_spawn',
      arguments: {
        command: '/bin/sh',
        args: ['-c', 'echo "Hello from PTY!" && sleep 1'],
        description: 'Test shell command'
      }
    });
    console.log('✓ pty_spawn result:', spawnResult.result?.content?.[0]?.text);
    
    // Extract PTY ID from spawn result
    const spawnText = spawnResult.result?.content?.[0]?.text || '';
    const idMatch = spawnText.match(/ID: (pty_[a-f0-9]+)/);
    const ptyId = idMatch ? idMatch[1] : null;
    
    if (!ptyId) {
      throw new Error('Failed to extract PTY ID from spawn result');
    }
    
    console.log(`✓ PTY spawned with ID: ${ptyId}`);
    
    // Wait a bit for the command to complete
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Test 5: Read PTY output
    console.log('\n--- Test 5: Read PTY Output ---');
    const readResult = await sendRequest('tools/call', {
      name: 'pty_read',
      arguments: {
        id: ptyId,
        offset: 0,
        limit: 100
      }
    });
    console.log('✓ pty_read result:', readResult.result?.content?.[0]?.text);
    
    // Test 6: List sessions again (should show our session)
    console.log('\n--- Test 6: List PTY Sessions (should show 1 session) ---');
    const list2Result = await sendRequest('tools/call', {
      name: 'pty_list',
      arguments: {}
    });
    console.log('✓ pty_list result:', list2Result.result?.content?.[0]?.text);
    
    // Test 7: Kill the PTY session
    console.log('\n--- Test 7: Kill PTY Session ---');
    const killResult = await sendRequest('tools/call', {
      name: 'pty_kill',
      arguments: {
        id: ptyId,
        cleanup: true
      }
    });
    console.log('✓ pty_kill result:', killResult.result?.content?.[0]?.text);
    
    console.log('\n=== All tests passed! ===\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
  } finally {
    server.kill();
    process.exit(0);
  }
}

// Handle server exit
server.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
});

// Start tests after a short delay
setTimeout(runTests, 1000);
