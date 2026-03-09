/**
 * Verification Script for Spotify Override Precedence
 * 
 * Verifies that custom weighted rules take precedence over 
 * hardcoded entertainment app lists in classifier.js
 */

const classifier = require('../ai/classifier');

async function verify() {
    console.log('\n🧪 Starting Verification: Spotify Override Precedence\n');

    // 1. Initialize Classifier
    console.log('🔄 Loading Classifier...');
    await classifier.train();
    console.log('✅ Classifier Loaded.\n');

    // 2. Check Weighted Rules
    const rules = classifier.getWeightedRules();
    console.log('📋 Current Weighted Rules:', JSON.stringify(rules, null, 2));

    if (!rules.Spotify || rules.Spotify.weight !== 0) {
        console.error('❌ ERROR: Spotify rule not found or weight is not 0 (neutral) in weighted_rules.json');
        process.exit(1);
    }

    // 3. Test Classification
    const testText = "Spotify - My Favorite Playlist";
    console.log(`🔍 Testing classification for: "${testText}"`);
    
    const result = await classifier.classify(testText);
    console.log('✅ Result:', JSON.stringify(result, null, 2));

    if (result.category === 'neutral') {
        console.log('\n🏆 SUCCESS: Spotify is correctly classified as NEUTRAL based on the weighted rule override!');
    } else {
        console.error(`\n❌ FAILURE: Spotify was classified as ${result.category.toUpperCase()} instead of NEUTRAL.`);
        console.error('Reason:', result.reason);
        process.exit(1);
    }

    // 4. Test a non-overridden entertainment app to ensure defaults still work
    const netflixText = "Netflix - Stranger Things";
    console.log(`\n🔍 Testing classification for: "${netflixText}" (No override)`);
    const netflixResult = await classifier.classify(netflixText);
    console.log('✅ Result:', JSON.stringify(netflixResult, null, 2));

    if (netflixResult.category === 'non-productive') {
        console.log('🏆 SUCCESS: Netflix correctly remains NON-PRODUCTIVE.');
    } else {
        console.error(`❌ FAILURE: Netflix was incorrectly classified as ${netflixResult.category.toUpperCase()}.`);
        process.exit(1);
    }

    console.log('\n✨ All tests passed!\n');
    process.exit(0);
}

verify().catch(err => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
});
