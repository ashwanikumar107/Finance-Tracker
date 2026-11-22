const bcrypt = require('bcrypt');
const db = require('./config/db');

async function seedDatabase() {
  console.log('🌱 Seeding database with realistic financial records and roles...');

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 1. Seed Users (Admin, User, Read-only)
  const usersToSeed = [
    { name: 'Aarav Sharma (Admin)', email: 'admin@pennywise.com', role: 'admin' },
    { name: 'Priya Patel (User)', email: 'priya@pennywise.com', role: 'user' },
    { name: 'Rohan Verma (Read-Only)', email: 'readonly@pennywise.com', role: 'read-only' },
  ];

  const userIds = {};

  for (const u of usersToSeed) {
    const existing = await db.query('SELECT id, role FROM users WHERE email = $1', [u.email]);
    if (existing.rows.length === 0) {
      const res = await db.query(
        `INSERT INTO users (name, email, password, role) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id`,
        [u.name, u.email, passwordHash, u.role]
      );
      userIds[u.email] = res.rows[0].id;
    } else {
      userIds[u.email] = existing.rows[0].id;
    }
  }

  const primaryUserId = userIds['priya@pennywise.com'];
  const adminUserId = userIds['admin@pennywise.com'];
  const readonlyUserId = userIds['readonly@pennywise.com'];

  // 2. Categories for primary user
  const categoriesToSeed = [
    // Expenses
    { name: 'Food & Dining', type: 'expense', color: '#EF4444' },
    { name: 'Transport & Fuel', type: 'expense', color: '#F97316' },
    { name: 'Shopping & Apparel', type: 'expense', color: '#8B5CF6' },
    { name: 'Entertainment & OTT', type: 'expense', color: '#EC4899' },
    { name: 'Bills & Utilities', type: 'expense', color: '#EAB308' },
    { name: 'Healthcare & Pharma', type: 'expense', color: '#06B6D4' },
    { name: 'Education & Courses', type: 'expense', color: '#3B82F6' },
    { name: 'Rent & Maintenance', type: 'expense', color: '#6366F1' },
    { name: 'Other Discretionary', type: 'expense', color: '#6B7280' },
    // Income
    { name: 'Monthly Salary', type: 'income', color: '#10B981' },
    { name: 'Freelance & Consulting', type: 'income', color: '#14B8A6' },
    { name: 'Mutual Fund Dividend', type: 'income', color: '#23845B' },
    { name: 'Business Revenue', type: 'income', color: '#059669' },
  ];

  const categoryIds = {};

  for (const c of categoriesToSeed) {
    // Seed for primary user
    const res = await db.query(
      `INSERT INTO categories (user_id, name, type, color)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, name, type) DO UPDATE SET color = EXCLUDED.color
       RETURNING id`,
      [primaryUserId, c.name, c.type, c.color]
    );
    categoryIds[c.name] = res.rows[0].id;

    // Seed also for admin and readonly users
    await db.query(
      `INSERT INTO categories (user_id, name, type, color)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, name, type) DO NOTHING`,
      [adminUserId, c.name, c.type, c.color]
    );
    await db.query(
      `INSERT INTO categories (user_id, name, type, color)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, name, type) DO NOTHING`,
      [readonlyUserId, c.name, c.type, c.color]
    );
  }

  // 3. Budgets for Current Month
  const now = new Date();
  const curMonth = now.getMonth() + 1;
  const curYear = now.getFullYear();

  const budgets = [
    { cat: 'Food & Dining', limit: 12000 },
    { cat: 'Transport & Fuel', limit: 5000 },
    { cat: 'Shopping & Apparel', limit: 8000 },
    { cat: 'Entertainment & OTT', limit: 3000 },
    { cat: 'Bills & Utilities', limit: 6000 },
    { cat: 'Healthcare & Pharma', limit: 4000 },
  ];

  for (const b of budgets) {
    if (categoryIds[b.cat]) {
      await db.query(
        `INSERT INTO budgets (user_id, category_id, monthly_limit, month, year)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, category_id, month, year) 
         DO UPDATE SET monthly_limit = EXCLUDED.monthly_limit`,
        [primaryUserId, categoryIds[b.cat], b.limit, curMonth, curYear]
      );
    }
  }

  // 4. Realistic Transactions across past 3-4 months
  const txnCountRes = await db.query('SELECT COUNT(*) FROM transactions WHERE user_id = $1', [primaryUserId]);
  if (parseInt(txnCountRes.rows[0].count, 10) === 0) {
    console.log('Seeding transaction records...');

    // Helper date generator
    const getFormattedDate = (daysAgo) => {
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      return d.toISOString().split('T')[0];
    };

    const realisticTransactions = [
      // Current Month Incomes
      { title: 'TechCorp Software Salary (November)', amount: 85000, type: 'income', cat: 'Monthly Salary', daysAgo: 2, method: 'Net Banking', desc: 'Direct employer payroll deposit' },
      { title: 'Freelance UI/UX Design Project', amount: 22000, type: 'income', cat: 'Freelance & Consulting', daysAgo: 10, method: 'UPI', desc: 'SaaS landing page redesign gig' },
      { title: 'Nifty 50 Index Mutual Fund Dividend', amount: 4500, type: 'income', cat: 'Mutual Fund Dividend', daysAgo: 14, method: 'Net Banking', desc: 'Quarterly dividend credit' },

      // Current Month Expenses
      { title: 'Apartment Monthly Rent & Society Maintenance', amount: 24000, type: 'expense', cat: 'Rent & Maintenance', daysAgo: 1, method: 'Net Banking', desc: 'Flat 402 monthly lease' },
      { title: 'Whole Foods Grocery Restock', amount: 4200, type: 'expense', cat: 'Food & Dining', daysAgo: 3, method: 'Card', desc: 'Weekly organic pantry & dairy' },
      { title: 'Metro Smart Card Recharge & Auto', amount: 850, type: 'expense', cat: 'Transport & Fuel', daysAgo: 4, method: 'UPI', desc: 'Commute passes' },
      { title: 'Zomato Gourmet Dinner with Friends', amount: 1850, type: 'expense', cat: 'Food & Dining', daysAgo: 5, method: 'UPI', desc: 'Weekend team dinner' },
      { title: 'Fiber Broadband & Electricity Bill', amount: 2800, type: 'expense', cat: 'Bills & Utilities', daysAgo: 7, method: 'UPI', desc: 'Airtel Broadband + BESCOM' },
      { title: 'Zara Winter Collection Jacket', amount: 5990, type: 'expense', cat: 'Shopping & Apparel', daysAgo: 8, method: 'Card', desc: 'Black overcoat purchase' },
      { title: 'Netflix & Spotify Family Premium', amount: 1199, type: 'expense', cat: 'Entertainment & OTT', daysAgo: 9, method: 'Card', desc: 'Monthly OTT recurring autopay' },
      { title: 'Apollo Pharmacy Prescriptions & Vitamins', amount: 1450, type: 'expense', cat: 'Healthcare & Pharma', daysAgo: 11, method: 'UPI', desc: 'Multivitamins and first aid' },
      { title: 'Barista Artisanal Coffee Roasters', amount: 620, type: 'expense', cat: 'Food & Dining', daysAgo: 12, method: 'UPI', desc: 'Espresso beans & pour-over' },
      { title: 'Shell Petrol Station Full Tank', amount: 3200, type: 'expense', cat: 'Transport & Fuel', daysAgo: 13, method: 'Card', desc: 'V-Power petrol refill' },
      { title: 'BookMyShow Weekend IMAX Movie', amount: 900, type: 'expense', cat: 'Entertainment & OTT', daysAgo: 15, method: 'UPI', desc: '2x IMAX tickets' },

      // Previous Month Incomes
      { title: 'TechCorp Software Salary (October)', amount: 85000, type: 'income', cat: 'Monthly Salary', daysAgo: 32, method: 'Net Banking', desc: 'October payroll' },
      { title: 'Mobile App Optimization Consulting', amount: 18000, type: 'income', cat: 'Freelance & Consulting', daysAgo: 40, method: 'UPI', desc: 'React Native performance tuning' },

      // Previous Month Expenses
      { title: 'Apartment Monthly Rent', amount: 24000, type: 'expense', cat: 'Rent & Maintenance', daysAgo: 31, method: 'Net Banking', desc: 'October flat lease' },
      { title: 'Diwali Festive Shopping & Gifts', amount: 14200, type: 'expense', cat: 'Shopping & Apparel', daysAgo: 35, method: 'Card', desc: 'Ethnic wear and sweets gifts' },
      { title: 'Gourmet Dining & Swiggy Deliveries', amount: 8400, type: 'expense', cat: 'Food & Dining', daysAgo: 38, method: 'UPI', desc: 'Diwali sweets and dining' },
      { title: 'Electricity & Gas Utility Bills', amount: 2600, type: 'expense', cat: 'Bills & Utilities', daysAgo: 42, method: 'UPI', desc: 'BESCOM + LPG refill' },
      { title: 'Car Servicing & Tyre Alignment', amount: 4800, type: 'expense', cat: 'Transport & Fuel', daysAgo: 45, method: 'Card', desc: 'Annual vehicle maintenance' },
      { title: 'Udemy Full-Stack Cloud Architecture Course', amount: 1299, type: 'expense', cat: 'Education & Courses', daysAgo: 48, method: 'Card', desc: 'Microservices certification' },

      // Month Before Last Incomes
      { title: 'TechCorp Software Salary (September)', amount: 85000, type: 'income', cat: 'Monthly Salary', daysAgo: 62, method: 'Net Banking', desc: 'September payroll' },

      // Month Before Last Expenses
      { title: 'Apartment Monthly Rent', amount: 24000, type: 'expense', cat: 'Rent & Maintenance', daysAgo: 61, method: 'Net Banking', desc: 'September flat lease' },
      { title: 'Supermarket Groceries', amount: 7600, type: 'expense', cat: 'Food & Dining', daysAgo: 65, method: 'Card', desc: 'Monthly groceries' },
      { title: 'Petrol & Uber Commutes', amount: 3900, type: 'expense', cat: 'Transport & Fuel', daysAgo: 68, method: 'UPI', desc: 'Daily commute' },
      { title: 'Ergonomic Desk Chair', amount: 8900, type: 'expense', cat: 'Shopping & Apparel', daysAgo: 72, method: 'Card', desc: 'Work from home upgrade' },
      { title: 'Dental Cleaning & Consultation', amount: 2000, type: 'expense', cat: 'Healthcare & Pharma', daysAgo: 75, method: 'UPI', desc: 'Bi-annual dental checkup' },
    ];

    for (const t of realisticTransactions) {
      const catId = categoryIds[t.cat];
      if (catId) {
        await db.query(
          `INSERT INTO transactions (user_id, title, amount, type, category_id, transaction_date, payment_method, description)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            primaryUserId,
            t.title,
            t.amount,
            t.type,
            catId,
            getFormattedDate(t.daysAgo),
            t.method,
            t.desc,
          ]
        );
      }
    }

    // Also copy 5 sample transactions to readonly user so they can view
    const readonlySample = realisticTransactions.slice(0, 6);
    for (const t of readonlySample) {
      const catRes = await db.query(
        'SELECT id FROM categories WHERE user_id = $1 AND name = $2 LIMIT 1',
        [readonlyUserId, t.cat]
      );
      if (catRes.rows.length > 0) {
        await db.query(
          `INSERT INTO transactions (user_id, title, amount, type, category_id, transaction_date, payment_method, description)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            readonlyUserId,
            t.title,
            t.amount,
            t.type,
            catRes.rows[0].id,
            getFormattedDate(t.daysAgo),
            t.method,
            t.desc,
          ]
        );
      }
    }
  }

  // 5. Seed Admin Audit Log
  const logCount = await db.query('SELECT COUNT(*) FROM admin_activity_logs');
  if (parseInt(logCount.rows[0].count, 10) === 0) {
    await db.query(
      `INSERT INTO admin_activity_logs (admin_id, action, target_type, target_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        adminUserId,
        'SYSTEM_INITIALIZED',
        'system',
        1,
        JSON.stringify({ note: 'Pennywise Personal Finance Tracker production seed initialized successfully' }),
        '127.0.0.1',
      ]
    );
  }

  console.log('✓ Seeding completed successfully!');
  console.log('----------------------------------------------------');
  console.log('Demo Accounts:');
  console.log('1. Admin:     admin@pennywise.com    / Password123!');
  console.log('2. User:      priya@pennywise.com    / Password123!');
  console.log('3. Read-Only: readonly@pennywise.com / Password123!');
  console.log('----------------------------------------------------');
}

module.exports = seedDatabase;
