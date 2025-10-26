/**
 * Playwright Electron Test for Autocomplete Feature
 * 
 * This test uses Playwright's experimental Electron support to test
 * the autocomplete feature in the actual Electron app context.
 * 
 * Run with: node test-electron-autocomplete.js
 */

const { _electron: electron } = require('playwright');
const path = require('path');

async function testAutocomplete() {
  console.log('Starting Electron app...');
  
  // Launch Electron app
  const electronApp = await electron.launch({
    args: [path.join(__dirname, 'out/main/index.js')],
    env: {
      ...process.env,
      NODE_ENV: 'development'
    }
  });

  // Get the first window
  const window = await electronApp.firstWindow();
  
  console.log('Electron app launched, waiting for page to load...');
  
  // Wait for the page to load
  await window.waitForLoadState('domcontentloaded');
  await window.waitForTimeout(2000);
  
  console.log('Page loaded, taking screenshot...');
  await window.screenshot({ path: 'electron-app-loaded.png' });
  
  // Check if electron API is available
  const hasElectronAPI = await window.evaluate(() => {
    return typeof window.electron !== 'undefined' && 
           typeof window.electron.autocompleteTask === 'function';
  });
  
  console.log('Electron API available:', hasElectronAPI);
  
  if (!hasElectronAPI) {
    console.error('❌ Electron API is NOT available in the renderer!');
    await electronApp.close();
    return;
  }
  
  console.log('✅ Electron API is available!');
  
  // Look for checklist items
  const checklistExists = await window.locator('#checklist-detail-view').count() > 0;
  console.log('Checklist view exists:', checklistExists);
  
  if (checklistExists) {
    // Try to find an autocomplete button
    const autocompleteButtons = await window.locator('button[id^="autocomplete-btn-"]').count();
    console.log('Found autocomplete buttons:', autocompleteButtons);
    
    if (autocompleteButtons > 0) {
      console.log('Clicking first autocomplete button...');
      await window.screenshot({ path: 'before-autocomplete-click.png' });
      
      // Click the first autocomplete button
      await window.locator('button[id^="autocomplete-btn-"]').first().click();
      
      console.log('Button clicked, waiting for response...');
      await window.waitForTimeout(3000);
      
      await window.screenshot({ path: 'after-autocomplete-click.png' });
      
      // Check console logs
      console.log('\n📋 Console logs from Electron app:');
      window.on('console', msg => {
        console.log(`  [${msg.type()}] ${msg.text()}`);
      });
    } else {
      console.log('No autocomplete buttons found. Creating a checklist first...');
      
      // Click "Create Your First Checklist" or "+ New Checklist"
      const createButton = await window.locator('button:has-text("Create")').first();
      if (await createButton.count() > 0) {
        await createButton.click();
        await window.waitForTimeout(1000);
        console.log('Clicked create checklist button');
      }
    }
  }
  
  console.log('\n✅ Test completed! Check the screenshots.');
  console.log('Press Ctrl+C to close the Electron app...');
  
  // Keep the app open for manual inspection
  await window.waitForTimeout(30000);
  
  // Close the app
  await electronApp.close();
}

// Run the test
testAutocomplete().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
