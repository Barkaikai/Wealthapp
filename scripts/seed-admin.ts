#!/usr/bin/env node
/**
 * Seed Admin User and Access Passes
 * Run with: tsx scripts/seed-admin.ts
 */

import { db } from '../server/db';
import { users, accessPasses, subscriptionPlans } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function seedAdmin() {
  console.log('🌱 Seeding admin user and access passes...');

  try {
    // Admin email - replace with actual owner email
    const ADMIN_EMAIL = 'admin@barkaibrinsonllc.com';
    
    // Find or create admin user (note: actual user created on first login via Replit Auth)
    // This just updates existing users to be admin
    const existingUsers = await db.select().from(users).where(eq(users.email, ADMIN_EMAIL));
    
    if (existingUsers.length > 0) {
      // Update existing user to admin
      await db.update(users)
        .set({ 
          isAdmin: 'true',
          hasUnlimitedAccess: 'true'
        })
        .where(eq(users.email, ADMIN_EMAIL));
      console.log(`✅ Updated ${ADMIN_EMAIL} to admin with unlimited access`);
    } else {
      console.log(`⚠️  User ${ADMIN_EMAIL} not found. Admin privileges will be granted on first login.`);
      console.log(`   Please log in with ${ADMIN_EMAIL} first, then run this script again.`);
    }

    // Get admin user ID for creating passes (use first admin or create placeholder)
    const adminUsers = await db.select().from(users).where(eq(users.isAdmin, 'true'));
    let adminId = adminUsers.length > 0 ? adminUsers[0].id : 'system-admin';

    // Check if access passes already exist
    const existingPasses = await db.select().from(accessPasses).limit(1);
    
    if (existingPasses.length === 0) {
      console.log('📦 Creating access passes...');
      
      // Generate unique codes
      const generateCode = (prefix: string, index: number) => 
        `${prefix}-${Math.random().toString(36).substring(2, 10).toUpperCase()}-${index}`;

      const passes = [];

      // 1. Create 20 FREE passes (100% off)
      console.log('  Creating 20 free passes (100% off)...');
      for (let i = 1; i <= 20; i++) {
        passes.push({
          code: generateCode('FREE', i),
          discountPercent: 100,
          tier: 'free',
          createdBy: adminId,
          note: `Free access pass ${i}/20`,
        });
      }

      // 2. Create 2000 HALF OFF passes (50% off)
      console.log('  Creating 2000 half-off passes (50% off)...');
      for (let i = 1; i <= 2000; i++) {
        passes.push({
          code: generateCode('HALF', i),
          discountPercent: 50,
          tier: 'half_off',
          createdBy: adminId,
          note: `50% discount pass ${i}/2000`,
        });
      }

      // 3. Create 10000 DISCOUNT passes (20% off)
      console.log('  Creating 10,000 discount passes (20% off)...');
      for (let i = 1; i <= 10000; i++) {
        passes.push({
          code: generateCode('SAVE', i),
          discountPercent: 20,
          tier: 'discount_20',
          createdBy: adminId,
          note: `20% discount pass ${i}/10000`,
        });
      }

      // Insert in batches to avoid memory issues
      const batchSize = 1000;
      for (let i = 0; i < passes.length; i += batchSize) {
        const batch = passes.slice(i, i + batchSize);
        await db.insert(accessPasses).values(batch);
        console.log(`  ✓ Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(passes.length / batchSize)}`);
      }

      console.log(`✅ Created ${passes.length} access passes`);
      console.log(`   - 20 free passes (100% off)`);
      console.log(`   - 2,000 passes at 50% discount`);
      console.log(`   - 10,000 passes at 20% discount`);
    } else {
      console.log('⚠️  Access passes already exist, skipping creation');
    }

    // Ensure subscription plan exists at $24.99/month
    const existingPlans = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.tier, 'premium'));
    
    if (existingPlans.length === 0) {
      await db.insert(subscriptionPlans).values({
        name: 'Premium',
        description: 'Full access to Wealth Automation Platform',
        tier: 'premium',
        monthlyPrice: 24.99,
        annualPrice: 249.99, // ~17% discount for annual
        currency: 'USD',
        features: JSON.stringify([
          'AI-powered daily briefings',
          'Unlimited portfolio tracking',
          'Advanced analytics',
          'Email automation',
          'Health monitoring',
          'CRM integration',
          'Digital accountant',
          'NFT vault',
          'Discord AI manager',
          'Wealth Forge tokens',
        ]),
        limits: JSON.stringify({
          assets: -1, // unlimited
          tasks: -1,
          notes: -1,
          emails: -1,
        }),
        isActive: 'true',
        sortOrder: 1,
      });
      console.log('✅ Created Premium subscription plan at $24.99/month');
    } else {
      console.log('✅ Subscription plan already exists');
    }

    console.log('\n🎉 Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

seedAdmin();
