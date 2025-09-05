// Test setup for Bun
import { beforeAll, afterAll } from 'bun:test';

// Global test setup
beforeAll(() => {
  console.log('Setting up tests with Bun...');
  // Set test environment
  process.env.NODE_ENV = 'test';
});

afterAll(() => {
  console.log('Cleaning up after tests...');
});
