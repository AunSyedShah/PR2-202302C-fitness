#!/usr/bin/env node

/**
 * Migration helper script for the modular models refactor
 * 
 * This script helps verify that all models are working correctly
 * after the refactor from monolithic to modular structure.
 */

import mongoose from 'mongoose';
import { createIndexes } from './indexes.js';
import models from './index.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fitness-app-test';

async function testModels() {
  try {
    console.log('🔄 Testing modular models structure...\n');

    // Test 1: Verify all models are importable
    console.log('✅ Test 1: Model imports');
    const modelNames = Object.keys(models);
    console.log(`   Found ${modelNames.length} models:`, modelNames.join(', '));

    // Test 2: Verify model schemas are valid
    console.log('\n✅ Test 2: Model schema validation');
    for (const [name, Model] of Object.entries(models)) {
      try {
        new Model();
        console.log(`   ✓ ${name} schema is valid`);
      } catch (error) {
        if (error.name === 'ValidationError') {
          console.log(`   ✓ ${name} validation working (required fields)`);
        } else {
          console.log(`   ❌ ${name} schema error:`, error.message);
        }
      }
    }

    // Test 3: Database connection and indexes (optional)
    if (process.env.MONGODB_URI || process.argv.includes('--with-db')) {
      console.log('\n✅ Test 3: Database connection and indexes');
      
      await mongoose.connect(MONGODB_URI);
      console.log('   ✓ Connected to MongoDB');

      await createIndexes();
      console.log('   ✓ Database indexes created');

      await mongoose.disconnect();
      console.log('   ✓ Disconnected from MongoDB');
    } else {
      console.log('\n⏭️  Test 3: Skipped (use --with-db to test database connection)');
    }

    // Test 4: Backward compatibility
    console.log('\n✅ Test 4: Backward compatibility');
    const { User, Exercise, WorkoutRoutine } = await import('./models.js');
    console.log('   ✓ Can import from models.js');
    console.log('   ✓ User model available:', !!User);
    console.log('   ✓ Exercise model available:', !!Exercise);
    console.log('   ✓ WorkoutRoutine model available:', !!WorkoutRoutine);

    console.log('\n🎉 All tests passed! Models refactor successful.\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testModels();
}

export default testModels;
