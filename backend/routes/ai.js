const express = require('express');
const router = express.Router();
const classifier = require('../ai/classifier');
const { authMiddleware, authorize } = require('../middleware/auth');

// Protect all AI routes - Supervisor/HR only
router.use(authMiddleware);
router.use(authorize('supervisor', 'hr'));

/**
 * Get all weighted rules
 * GET /api/ai/rules
 */
router.get('/rules', (req, res) => {
    try {
        const rules = classifier.getWeightedRules();
        res.json({ rules });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Add or update a weighted rule
 * POST /api/ai/rules
 * Body: { domain: 'linkedin.com', weight: 1, reason: 'Productive for HR recruiting' }
 */
router.post('/rules', async (req, res) => {
    try {
        const { domain, weight, reason } = req.body;

        if (!domain || weight === undefined) {
            return res.status(400).json({ error: 'Missing domain or weight' });
        }

        if (![1, -1, 0].includes(weight)) {
            return res.status(400).json({ error: 'Weight must be 1 (productive), -1 (non-productive), or 0 (neutral)' });
        }

        await classifier.addWeightedRule(domain, weight, reason || 'Custom rule');
        res.json({ success: true, message: `Rule added for ${domain}` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Remove a weighted rule
 * DELETE /api/ai/rules/:domain
 */
router.delete('/rules/:domain', async (req, res) => {
    try {
        const { domain } = req.params;
        await classifier.removeWeightedRule(domain);
        res.json({ success: true, message: `Rule removed for ${domain}` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Teach the AI with a new example
 * POST /api/ai/learn
 * Body: { text: 'YouTube React Tutorial', label: 'productive' }
 */
router.post('/learn', async (req, res) => {
    try {
        const { text, label } = req.body;

        if (!text || !label) {
            return res.status(400).json({ error: 'Missing text or label' });
        }

        if (!['productive', 'non-productive', 'neutral'].includes(label)) {
            return res.status(400).json({ error: 'Label must be productive, non-productive, or neutral' });
        }

        await classifier.learn(text, label);
        res.json({ success: true, message: 'AI has learned from this example' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Test classification
 * POST /api/ai/test
 * Body: { text: 'YouTube React Tutorial' }
 */
router.post('/test', async (req, res) => {
    try {
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Missing text' });
        }

        const result = await classifier.classify(text);
        res.json({ text, classification: result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
