require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Organization = require('./models/Organization');

const cleanup = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/protrackai');
        console.log('Connected to DB');

        // 1. Sanitize Roles, Depts, Teams (Trim whitespace and newlines)
        const users = await User.find();
        for (let user of users) {
            let updated = false;
            if (user.role && user.role !== user.role.trim()) {
                user.role = user.role.trim();
                updated = true;
            }
            if (user.dept && user.dept !== user.dept.trim()) {
                user.dept = user.dept.trim();
                updated = true;
            }
            if (user.team && user.team !== user.team.trim()) {
                user.team = user.team.trim();
                updated = true;
            }
            if (updated) await user.save();
        }
        console.log('✅ Sanitized user roles/depts/teams.');

        // 2. Re-seed default MTNRwanda Orgs if missing
        const defaults = [
            { name: "Information Technology", teams: ["Engineering", "Operations & Support", "Cybersecurity", "Infrastructure"] },
            { name: "Finance", teams: ["Accounting", "Payroll", "Accounts Receivable"] },
            { name: "Human Resources", teams: ["Recruitment", "Employee Relations", "Training"] },
            { name: "Sales & Distribution", teams: ["Regional Sales", "Marketing", "Logistics"] },
            { name: "Legal & Corporate", teams: ["Compliance", "Corporate Affairs"] }
        ];

        for (let def of defaults) {
            const exists = await Organization.findOne({ name: def.name });
            if (!exists) {
                await Organization.create(def);
                console.log(`Created missing dept: ${def.name}`);
            } else {
                // Ensure teams match
                const newTeams = [...new Set([...exists.teams, ...def.teams])];
                if (newTeams.length !== exists.teams.length) {
                    exists.teams = newTeams;
                    await exists.save();
                    console.log(`Updated teams for ${def.name}`);
                }
            }
        }

        // 3. Reconcile Users with Depts based on Teams
        // Find users with null dept but valid team
        const orphanUsers = await User.find({ dept: { $in: [null, ""] }, team: { $ne: null, $ne: "" } });
        for (let user of orphanUsers) {
            const org = await Organization.findOne({ teams: user.team });
            if (org) {
                user.dept = org.name;
                await user.save();
                console.log(`Reassigned ${user.name} to Dept: ${org.name} based on Team: ${user.team}`);
            }
        }

        console.log('✅ Data reconciliation complete!');
        process.exit();
    } catch (err) {
        console.error('Cleanup failed:', err);
        process.exit(1);
    }
};

cleanup();
