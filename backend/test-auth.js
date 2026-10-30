const http = require('http');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// Load controllers and models
const { registerUser, loginUser } = require('./controllers/authController');
const User = require('./models/User');

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
  }
}

async function runTests() {
  console.log('=== HOTEL PRO AUTH & BACKEND TEST SUITE ===\n');

  // 1. Password Hashing & Bcrypt Verification
  console.log('1. Testing Password Security (Bcrypt):');
  const plainPassword = 'SecretPassword123!';
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(plainPassword, salt);

  assert(hashedPassword !== plainPassword, 'Password is not stored in plain text');
  assert(hashedPassword.startsWith('$2'), 'Password is valid bcrypt hash');

  const matchCorrect = await bcrypt.compare(plainPassword, hashedPassword);
  assert(matchCorrect === true, 'bcrypt correctly validates matching password');

  const matchWrong = await bcrypt.compare('WrongPassword', hashedPassword);
  assert(matchWrong === false, 'bcrypt correctly rejects non-matching password');

  // 2. JWT Generation & Verification
  console.log('\n2. Testing JWT Authentication:');
  const mockUserId = '654321abcdef123456789012';
  const secret = process.env.JWT_SECRET || 'your_jwt_secret_key';
  const token = jwt.sign({ id: mockUserId, role: 'guest' }, secret, { expiresIn: '1h' });

  assert(typeof token === 'string' && token.split('.').length === 3, 'JWT token is properly formed (header.payload.signature)');

  const decoded = jwt.verify(token, secret);
  assert(decoded.id === mockUserId, 'Decoded JWT payload contains correct user id');
  assert(decoded.role === 'guest', 'Decoded JWT payload contains correct role');

  let invalidVerifyFailed = false;
  try {
    jwt.verify(token, 'wrong_secret');
  } catch (e) {
    invalidVerifyFailed = true;
  }
  assert(invalidVerifyFailed, 'JWT verification rejects invalid signature');

  // 3. Controller Input Validation
  console.log('\n3. Testing Controller Input Validation:');
  
  // Register with missing fields
  let registerRes = {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; }
  };
  await registerUser({ body: { name: 'Test User' } }, registerRes);
  assert(registerRes.statusCode === 400, 'Register returns 400 when email or password is missing');
  assert(registerRes.body.message.includes('Please provide'), 'Register returns helpful error message for missing fields');

  // Login with missing fields
  let loginRes = {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; }
  };
  await loginUser({ body: { email: 'test@example.com' } }, loginRes);
  assert(loginRes.statusCode === 400, 'Login returns 400 when password is missing');

  // 4. Controller Logic with Mocked Database
  console.log('\n4. Testing Full Auth Flow (Registration & Login Logic):');
  
  // Temporarily stub mongoose connection state to 1 (connected) for logic verification
  const originalReadyState = Object.getOwnPropertyDescriptor(mongoose.connection, 'readyState');
  Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });

  const mockUsers = [];
  const origFindOne = User.findOne;
  const origSave = User.prototype.save;

  User.findOne = async function(query) {
    return mockUsers.find(u => u.email === query.email) || null;
  };
  User.prototype.save = async function() {
    mockUsers.push(this);
    return this;
  };

  try {
    // Test A: User Registration
    let testRegRes = {
      statusCode: null,
      body: null,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.body = data; return this; }
    };
    await registerUser({
      body: { name: 'John Doe', email: 'john@example.com', password: 'password123' }
    }, testRegRes);

    assert(testRegRes.statusCode === 201, 'Successful registration returns 201 Created');
    assert(mockUsers.length === 1, 'New user is saved to database');
    assert(mockUsers[0].name === 'John Doe', 'Saved user has correct name');
    assert(mockUsers[0].password !== 'password123', 'Saved user password is encrypted');

    // Test B: Duplicate Registration
    let dupRegRes = {
      statusCode: null,
      body: null,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.body = data; return this; }
    };
    await registerUser({
      body: { name: 'John Dup', email: 'john@example.com', password: 'password123' }
    }, dupRegRes);
    assert(dupRegRes.statusCode === 400, 'Duplicate registration returns 400 Bad Request');
    assert(dupRegRes.body.message === 'User already exists', 'Duplicate returns "User already exists"');

    // Test C: Successful Login
    let testLoginRes = {
      statusCode: null,
      body: null,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.body = data; return this; }
    };
    await loginUser({
      body: { email: 'john@example.com', password: 'password123' }
    }, testLoginRes);
    assert(testLoginRes.statusCode === 200, 'Successful login returns 200 OK');
    assert(!!testLoginRes.body.token, 'Login returns JWT token');
    assert(testLoginRes.body.user.email === 'john@example.com', 'Login returns user email');
    assert(testLoginRes.body.user.name === 'John Doe', 'Login returns user name');

    // Test D: Login with Wrong Password
    let wrongPassRes = {
      statusCode: null,
      body: null,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.body = data; return this; }
    };
    await loginUser({
      body: { email: 'john@example.com', password: 'wrongpassword' }
    }, wrongPassRes);
    assert(wrongPassRes.statusCode === 400, 'Login with wrong password returns 400 Bad Request');
    assert(wrongPassRes.body.message === 'Invalid credentials', 'Login with wrong password returns "Invalid credentials"');

    // Test E: Login with Non-Existent Email
    let nonExistentRes = {
      statusCode: null,
      body: null,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.body = data; return this; }
    };
    await loginUser({
      body: { email: 'unknown@example.com', password: 'password123' }
    }, nonExistentRes);
    assert(nonExistentRes.statusCode === 400, 'Login with non-existent user returns 400 Bad Request');
    assert(nonExistentRes.body.message === 'Invalid credentials', 'Login with non-existent user returns "Invalid credentials"');

  } finally {
    // Restore originals
    User.findOne = origFindOne;
    User.prototype.save = origSave;
    if (originalReadyState) {
      Object.defineProperty(mongoose.connection, 'readyState', originalReadyState);
    }
  }

  // 5. HTTP Server, CORS, and Routes
  console.log('\n5. Testing Express Server & CORS Configuration:');
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/', (req, res) => {
    res.send('Hotel Pro Backend is running successfully!');
  });

  const authRoutes = require('./routes/authRoutes');
  app.use('/api/auth', authRoutes);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(5099, resolve));

  // Test GET /
  const getRoot = await fetch('http://localhost:5099/');
  const rootText = await getRoot.text();
  assert(getRoot.status === 200, 'GET / returns 200 OK');
  assert(rootText.includes('Hotel Pro Backend is running'), 'Root route returns backend status message');

  // Test CORS headers on /api/auth/register
  const optionsRes = await fetch('http://localhost:5099/api/auth/register', {
    method: 'OPTIONS',
    headers: {
      'Origin': 'http://localhost:5173',
      'Access-Control-Request-Method': 'POST',
    }
  });
  const allowOrigin = optionsRes.headers.get('access-control-allow-origin');
  assert(allowOrigin === '*' || allowOrigin === 'http://localhost:5173', 'CORS headers are present on /api/auth routes');

  // Test POST /api/auth/register with empty body
  const regPostRes = await fetch('http://localhost:5099/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const regPostData = await regPostRes.json();
  assert(regPostRes.status === 400, 'POST /api/auth/register returns 400 for empty body');
  assert(regPostData.message.length > 0, 'POST /api/auth/register returns JSON error message');

  // Test POST /api/auth/login with empty body
  const loginPostRes = await fetch('http://localhost:5099/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const loginPostData = await loginPostRes.json();
  assert(loginPostRes.status === 400, 'POST /api/auth/login returns 400 for empty body');
  assert(loginPostData.message.length > 0, 'POST /api/auth/login returns JSON error message');

  server.close();

  console.log(`\n=== SUMMARY: ${passedTests}/${totalTests} tests passed ===\n`);
  if (passedTests === totalTests) {
    console.log('All tests passed successfully!');
  } else {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
