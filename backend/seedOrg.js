require('dotenv').config();
const mongoose = require('mongoose');
const Organization = require('./models/Organization');
const connectDB = require('./config/db');

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

const seedOrg = async () => {
    try {
        await connectDB();

        // Check if orgs exist
        const count = await Organization.countDocuments();
        if (count > 0) {
            console.log('Org structure already exists. Skipping seed.');
            process.exit();
        }

        await Organization.insertMany(initialOrgs);
        console.log('✅ Organizational structure seeded successfully!');
        process.exit();
    } catch (err) {
        console.error('❌ Seed failed:', err.message);
        process.exit(1);
    }
};

seedOrg();
