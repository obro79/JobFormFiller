// Main content script - Orchestrates field matching, filling, and learning

(function() {
  'use strict';

  // Initialize learner's form listener
  window.Learner.setupFormListener();

  // Listen for messages from popup/background
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'fill') {
      handleFillRequest().then(sendResponse);
      return true; // Keep channel open for async response
    }

    if (message.action === 'saveCorrections') {
      window.Learner.saveCurrentCorrections().then(count => {
        sendResponse({ saved: count });
      });
      return true;
    }

    if (message.action === 'getStatus') {
      sendResponse({
        site: window.FieldMatcher.detectSite(),
        fieldsFound: window.FieldMatcher.findFormFields().length
      });
      return true;
    }
  });

  // Handle fill request
  async function handleFillRequest() {
    try {
      // Get profile and learned patterns
      const [profileResponse, patternsResponse] = await Promise.all([
        chrome.runtime.sendMessage({ action: 'getProfile' }),
        chrome.runtime.sendMessage({ action: 'getLearnedPatterns' })
      ]);

      const profile = profileResponse?.profile;
      const learnedPatterns = patternsResponse?.learnedPatterns || {};

      if (!profile) {
        return {
          success: false,
          error: 'No profile data found. Please set up your profile.'
        };
      }

      // Match fields
      const matchedFields = window.FieldMatcher.matchAllFields(learnedPatterns);

      // Fill fields
      const results = window.FormFiller.fillAllFields(matchedFields, profile);

      // Track for learning
      window.Learner.trackFilledFields(matchedFields);

      return {
        success: true,
        results,
        site: window.FieldMatcher.detectSite()
      };
    } catch (error) {
      console.error('Fill error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Log that content script is loaded
  console.log('Job Application Autofill loaded on', window.FieldMatcher.detectSite());
})();
