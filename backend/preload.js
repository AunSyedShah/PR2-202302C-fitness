// Bun preload script for optimizations
import { spawn } from 'bun';

// Optimize for development
if (process.env.NODE_ENV === 'development') {
  // Enable fast refresh and hot reloading
  process.env.BUN_HOT = '1';
}

// Preload commonly used modules for faster startup
// This helps Bun cache and optimize module loading
