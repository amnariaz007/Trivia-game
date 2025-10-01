#!/usr/bin/env node

/**
 * Clear Terminal Script
 * 
 * This script clears the terminal for easier debugging.
 * Can be run manually or called from other scripts.
 */

function clearTerminal() {
  // Clear terminal using ANSI escape codes
  process.stdout.write('\x1B[2J\x1B[0f');
  console.log('🧹 Terminal cleared for debugging');
  console.log('='.repeat(80));
  console.log('🔧 MANUAL TERMINAL CLEAR - SCRIPT EXECUTION');
  console.log('='.repeat(80));
  console.log(`⏰ Cleared at: ${new Date().toISOString()}`);
  console.log('='.repeat(80));
}

// Run if called directly
if (require.main === module) {
  clearTerminal();
}

module.exports = { clearTerminal };
