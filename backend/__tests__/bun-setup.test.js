import { test, expect } from 'bun:test';

test('Bun setup verification', () => {
  expect(1 + 1).toBe(2);
  expect(typeof Bun).toBe('object');
  console.log('✅ Bun is working correctly!');
});

test('Environment variables', () => {
  expect(process.env.NODE_ENV).toBeDefined();
  console.log('✅ Environment variables loaded!');
});

test('ES modules support', async () => {
  const fs = await import('fs');
  expect(typeof fs.readFileSync).toBe('function');
  console.log('✅ ES modules working!');
});
