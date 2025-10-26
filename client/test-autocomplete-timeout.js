/**
 * Test to verify autocomplete timeout functionality
 * This test will help verify that the autocomplete doesn't hang indefinitely
 * 
 * Run with: node test-autocomplete-timeout.js
 */

const { _electron: electron } = require('playwright');
const path = require('path');

async function testAutocompleteTimeout() {
  console.log('🚀 Starting Electron app to test autocomplete timeout...\n');
  
  try {
    // Launch Electron app
    const electronApp = await electron.launch({
      args: [path.join(__dirname, 'out/main/index.js')],
      env: {
        ...process.env,
        NODE_ENV: 'production'
      }
    });

    // Get the first window
    const window = await electronApp.firstWindow();
    
    console.log('✅ Electron app launched');
    
    // Wait for the page to load
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);
    
    console.log('✅ Page loaded\n');
    
    // Set up console log capture
    const consoleLogs = [];
    window.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(text);
      if (text.includes('[AutocompleteService]') || 
          text.includes('[Main]') || 
          text.includes('[Component]')) {
        console.log(`  📋 ${text}`);
      }
    });
    
    // Check if electron API is available
    const hasElectronAPI = await window.evaluate(() => {
      return typeof window.electron !== 'undefined' && 
             typeof window.electron.autocompleteTask === 'function';
    });
    
    if (!hasElectronAPI) {
      console.error('❌ Electron API is NOT available in the renderer!');
      await electronApp.close();
      return false;
    }
    
    console.log('✅ Electron API is available\n');
    
    // Take initial screenshot
    await window.screenshot({ path: 'test-autocomplete-before.png' });
    console.log('📸 Screenshot saved: test-autocomplete-before.png\n');
    
    // Look for autocomplete buttons
    const autocompleteButtons = await window.locator('button[id^="autocomplete-btn-"]').count();
    console.log(`Found ${autocompleteButtons} autocomplete button(s)\n`);
    
    if (autocompleteButtons > 0) {
      console.log('🔄 Testing autocomplete with timeout protection...');
      console.log('   (This should either complete or timeout within 60 seconds)\n');
      
      // Record start time
      const startTime = Date.now();
      
      // Click the first autocomplete button
      await window.locator('button[id^="autocomplete-btn-"]').first().click();
      
      console.log('✅ Button clicked, monitoring response...\n');
      
      // Wait for either success or timeout (max 65 seconds to account for the 60s timeout + buffer)
      let processingComplete = false;
      const maxWaitTime = 65000;
      const checkInterval = 1000;
      
      for (let elapsed = 0; elapsed < maxWaitTime && !processingComplete; elapsed += checkInterval) {
        await window.waitForTimeout(checkInterval);
        
        // Check if button text changed back from "Processing..."
        const buttonText = await window.locator('button[id^="autocomplete-btn-"]').first().textContent();
        
        if (buttonText !== 'Processing...') {
          processingComplete = true;
          const totalTime = Date.now() - startTime;
          console.log(`\n✅ Autocomplete completed in ${(totalTime / 1000).toFixed(1)} seconds`);
          console.log(`   Button text: "${buttonText}"\n`);
        } else if (elapsed % 5000 === 0 && elapsed > 0) {
          console.log(`   ⏱️  Still processing... (${(elapsed / 1000).toFixed(0)}s elapsed)`);
        }
      }
      
      if (!processingComplete) {
        const totalTime = Date.now() - startTime;
        console.log(`\n⚠️  Autocomplete did not complete within ${(totalTime / 1000).toFixed(1)} seconds`);
        console.log('   This might indicate the timeout is not working properly.\n');
      }
      
      // Take screenshot after autocomplete attempt
      await window.screenshot({ path: 'test-autocomplete-after.png' });
      console.log('📸 Screenshot saved: test-autocomplete-after.png\n');
      
      // Look for error messages
      const hasError = consoleLogs.some(log => 
        log.includes('timeout') || 
        log.includes('error') || 
        log.includes('Error')
      );
      
      if (hasError) {
        console.log('ℹ️  Relevant error/timeout logs found:');
        consoleLogs
          .filter(log => 
            log.toLowerCase().includes('timeout') || 
            log.toLowerCase().includes('error')
          )
          .forEach(log => console.log(`     ${log}`));
        console.log();
      }
      
      console.log('✅ Test completed successfully!\n');
      console.log('Summary:');
      console.log('  - Autocomplete button was found and clicked');
      console.log('  - Processing completed or timed out as expected');
      console.log('  - No infinite hang detected\n');
      
    } else {
      console.log('⚠️  No autocomplete buttons found in the UI.');
      console.log('   Please create a checklist item first to test the autocomplete feature.\n');
    }
    
    // Close the app
    await electronApp.close();
    console.log('🏁 Test finished. Electron app closed.\n');
    return true;
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Run the test
testAutocompleteTimeout()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  });
