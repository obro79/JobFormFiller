// Background service worker for Job Application Autofill

// Load profile data into Chrome storage on install
chrome.runtime.onInstalled.addListener(async () => {
  try {
    const response = await fetch(chrome.runtime.getURL('data/profile.json'));
    const profile = await response.json();
    await chrome.storage.local.set({ profile });
    console.log('Profile loaded into storage');
  } catch (error) {
    console.error('Failed to load profile:', error);
  }

  // Initialize empty learned patterns
  const { learnedPatterns } = await chrome.storage.local.get('learnedPatterns');
  if (!learnedPatterns) {
    await chrome.storage.local.set({ learnedPatterns: {} });
  }
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getProfile') {
    chrome.storage.local.get('profile').then(({ profile }) => {
      sendResponse({ profile });
    });
    return true; // Keep channel open for async response
  }

  if (message.action === 'getLearnedPatterns') {
    chrome.storage.local.get('learnedPatterns').then(({ learnedPatterns }) => {
      sendResponse({ learnedPatterns: learnedPatterns || {} });
    });
    return true;
  }

  if (message.action === 'saveLearnedPattern') {
    chrome.storage.local.get('learnedPatterns').then(async ({ learnedPatterns }) => {
      const patterns = learnedPatterns || {};
      const { site, labelPattern, profileField } = message.data;

      if (!patterns[site]) {
        patterns[site] = {};
      }
      patterns[site][labelPattern.toLowerCase()] = profileField;

      await chrome.storage.local.set({ learnedPatterns: patterns });
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.action === 'fillForm') {
    // Forward fill request to content script in active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'fill' }, (response) => {
          sendResponse(response);
        });
      }
    });
    return true;
  }

  if (message.action === 'updateProfile') {
    chrome.storage.local.get('profile').then(async ({ profile }) => {
      const updatedProfile = { ...profile, ...message.data };
      await chrome.storage.local.set({ profile: updatedProfile });
      sendResponse({ success: true });
    });
    return true;
  }
});
