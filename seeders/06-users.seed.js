'use strict';

const bcrypt = require('bcrypt');
const { User } = require('../src/models');

async function seedUsers() {
  console.log('→ Seeding users...');

  const passwordHash = await bcrypt.hash('Password123', 10);

  const users = [
    // Admin users (one per major city for testing)
    { id: 1, name: 'Rajesh Kumar', email: 'admin@civictrack.gov.in', password_hash: passwordHash, city_id: 1 },
    { id: 2, name: 'Arvind Sharma', email: 'admin.jodhpur@civictrack.gov.in', password_hash: passwordHash, city_id: 2 },
    { id: 3, name: 'Deepak Joshi', email: 'admin.udaipur@civictrack.gov.in', password_hash: passwordHash, city_id: 3 },
    
    // Authority users - Jaipur (city_id: 1)
    { id: 4, name: 'Priya Sharma', email: 'priya.sharma@civictrack.gov.in', password_hash: passwordHash, city_id: 1 },
    { id: 5, name: 'Amit Patel', email: 'amit.patel@civictrack.gov.in', password_hash: passwordHash, city_id: 1 },
    { id: 6, name: 'Kavita Mathur', email: 'kavita.mathur@civictrack.gov.in', password_hash: passwordHash, city_id: 1 },
    
    // Authority users - Jodhpur (city_id: 2)
    { id: 7, name: 'Sunita Verma', email: 'sunita.verma@civictrack.gov.in', password_hash: passwordHash, city_id: 2 },
    { id: 8, name: 'Mohan Rathore', email: 'mohan.rathore@civictrack.gov.in', password_hash: passwordHash, city_id: 2 },
    
    // Authority users - Udaipur (city_id: 3)
    { id: 9, name: 'Rekha Meena', email: 'rekha.meena@civictrack.gov.in', password_hash: passwordHash, city_id: 3 },
    { id: 10, name: 'Suresh Choudhary', email: 'suresh.choudhary@civictrack.gov.in', password_hash: passwordHash, city_id: 3 },
    
    // Citizen users - Jaipur (city_id: 1)
    { id: 11, name: 'Sneha Mehta', email: 'sneha.mehta@example.com', password_hash: passwordHash, city_id: 1 },
    { id: 12, name: 'Vikram Singh', email: 'vikram.singh@example.com', password_hash: passwordHash, city_id: 1 },
    { id: 13, name: 'Anita Kumari', email: 'anita.kumari@example.com', password_hash: passwordHash, city_id: 1 },
    { id: 14, name: 'Rajan Malhotra', email: 'rajan.malhotra@example.com', password_hash: passwordHash, city_id: 1 },
    { id: 15, name: 'Pooja Agarwal', email: 'pooja.agarwal@example.com', password_hash: passwordHash, city_id: 1 },
    
    // Citizen users - Jodhpur (city_id: 2)
    { id: 16, name: 'Anjali Desai', email: 'anjali.desai@example.com', password_hash: passwordHash, city_id: 2 },
    { id: 17, name: 'Karan Bhati', email: 'karan.bhati@example.com', password_hash: passwordHash, city_id: 2 },
    { id: 18, name: 'Meera Solanki', email: 'meera.solanki@example.com', password_hash: passwordHash, city_id: 2 },
    { id: 19, name: 'Devendra Purohit', email: 'devendra.purohit@example.com', password_hash: passwordHash, city_id: 2 },
    
    // Citizen users - Udaipur (city_id: 3)
    { id: 20, name: 'Rahul Gupta', email: 'rahul.gupta@example.com', password_hash: passwordHash, city_id: 3 },
    { id: 21, name: 'Nisha Paliwal', email: 'nisha.paliwal@example.com', password_hash: passwordHash, city_id: 3 },
    { id: 22, name: 'Ashok Trivedi', email: 'ashok.trivedi@example.com', password_hash: passwordHash, city_id: 3 },
    { id: 23, name: 'Lakshmi Jain', email: 'lakshmi.jain@example.com', password_hash: passwordHash, city_id: 3 },
  ];

  await User.bulkCreate(users, { ignoreDuplicates: true });
  console.log(`  ✔ ${users.length} users seeded`);
  console.log('     Default password: Password123');
}

module.exports = seedUsers;
