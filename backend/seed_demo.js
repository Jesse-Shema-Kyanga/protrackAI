/**
 * DEVELOPMENT SEED DATA
 * ---------------------
 * This file populates the database with dummy data for testing purposes.
 * The credentials found here are NOT real and are only for local development.
 */

const mongoose = require('mongoose');
const User = require('./models/User');
const Organization = require('./models/Organization');
require('dotenv').config();

const mongoURI = 'mongodb://127.0.0.1:27017/protrackai';

const initialOrgs = [
    {
        name: "Information Technology",
        description: "Core technical infrastructure and software development.",
        teams: ["Engineering", "Infrastructure", "Cybersecurity"]
    },
    {
        name: "Finance",
        description: "Financial planning, accounting, and budgeting.",
        teams: ["Accounting", "Payroll", "Accounts Receivable"]
    },
    {
        name: "Human Resources",
        description: "Personnel management and organizational development.",
        teams: ["Recruitment", "Employee Relations"]
    },
    {
        name: "Sales & Distribution",
        description: "Revenue generation and supply chain management.",
        teams: ["Regional Sales", "Marketing", "Logistics"]
    }
];

const seedDemo = async () => {
    try {
        await mongoose.connect(mongoURI);
        console.log('✅ Connected to MongoDB');

        // Seed Orgs
        const orgCount = await Organization.countDocuments();
        if (orgCount === 0) {
            await Organization.insertMany(initialOrgs);
            console.log('✅ Organizations seeded');
        } else {
            console.log('ℹ️  Organizations already exist');
        }

        // Seed Users
        const usersToCheck = [
            {
                id: 'sup1', // Supervisor
                name: "Demo Supervisor",
                email: "sup@demo.com",
                role: "supervisor",
                team: "Engineering",
                dept: "Information Technology",
                pos: "Team Lead",
                password: "password123"
            },
            {
                id: 'emp1', // Employee
                name: "Demo Employee",
                email: "emp@demo.com",
                role: "employee",
                team: "Engineering",
                dept: "Information Technology",
                pos: "Software Engineer",
                password: "password123"
            },
            {
                id: 'hr1', // HR
                name: "Demo HR",
                email: "hr@demo.com",
                role: "hr",
                team: "Recruitment",
                dept: "Human Resources",
                pos: "HR Manager",
                password: "password123"
            }
        ];

        for (const user of usersToCheck) {
            const exists = await User.findOne({ email: user.email });
            if (!exists) {
                await new User(user).save();
                console.log(`✅ Created user: ${user.name} (${user.email})`);
            } else {
                console.log(`ℹ️  User already exists: ${user.email}`);
            }
        }

        console.log('\n🎉 DEMO DATA READY!');
        console.log('-----------------------------------');
        console.log('Supervisor Login: sup@demo.com  / password123');
        console.log('Employee Login:   emp@demo.com  / password123');
        console.log('HR Login:         hr@demo.com   / password123');
        console.log('-----------------------------------');

        process.exit(0);
    } catch (err) {
        console.error('❌ Seed Failed:', err);
        process.exit(1);
    }
};

seedDemo();
