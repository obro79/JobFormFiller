// Learner - Tracks corrections and learns from user input

const Learner = {
  // Track all autofilled fields for comparison
  trackedFields: [],

  // Start tracking filled fields
  trackFilledFields(matchedFields) {
    this.trackedFields = matchedFields
      .filter(f => f.element.dataset.autofillOriginal !== undefined)
      .map(f => ({
        element: f.element,
        labelText: f.labelText,
        originalValue: f.element.dataset.autofillOriginal,
        profileField: f.field,
        confidence: f.confidence
      }));
  },

  // Check for corrections (values that changed from what we filled)
  detectCorrections() {
    const corrections = [];
    const site = window.FieldMatcher.detectSite();

    this.trackedFields.forEach(tracked => {
      const currentValue = tracked.element.value;
      const originalValue = tracked.originalValue;

      // If value changed, user made a correction
      if (currentValue !== originalValue && currentValue.trim() !== '') {
        corrections.push({
          site,
          labelText: tracked.labelText,
          originalField: tracked.profileField,
          originalValue,
          correctedValue: currentValue,
          confidence: tracked.confidence
        });
      }
    });

    return corrections;
  },

  // Save corrections as learned patterns
  async saveCorrections(corrections) {
    for (const correction of corrections) {
      // Try to find what profile field matches the corrected value
      const matchedField = await this.findMatchingProfileField(correction.correctedValue);

      if (matchedField) {
        // Save the learned pattern
        await chrome.runtime.sendMessage({
          action: 'saveLearnedPattern',
          data: {
            site: correction.site,
            labelPattern: correction.labelText.toLowerCase(),
            profileField: matchedField
          }
        });

        console.log(`Learned: "${correction.labelText}" -> ${matchedField}`);
      }
    }
  },

  // Find which profile field matches a given value
  async findMatchingProfileField(value) {
    const { profile } = await chrome.runtime.sendMessage({ action: 'getProfile' });
    if (!profile) return null;

    const normalizedValue = value.toLowerCase().trim();

    // Check personal fields
    const personalChecks = [
      ['personal.firstName', profile.personal?.firstName],
      ['personal.lastName', profile.personal?.lastName],
      ['personal.email', profile.personal?.email],
      ['personal.phone', profile.personal?.phone],
      ['personal.phoneCountryCode', profile.personal?.phoneCountryCode],
      ['personal.phoneType', profile.personal?.phoneType],
      ['personal.address.street', profile.personal?.address?.street],
      ['personal.address.city', profile.personal?.address?.city],
      ['personal.address.state', profile.personal?.address?.state],
      ['personal.address.zip', profile.personal?.address?.zip],
      ['personal.address.country', profile.personal?.address?.country],
      ['personal.linkedin', profile.personal?.linkedin],
      ['personal.portfolio', profile.personal?.portfolio],
      ['personal.github', profile.personal?.github],
    ];

    for (const [field, profileValue] of personalChecks) {
      if (profileValue && profileValue.toLowerCase().trim() === normalizedValue) {
        return field;
      }
    }

    // Check work fields
    if (profile.work && profile.work[0]) {
      const workChecks = [
        ['work[0].company', profile.work[0].company],
        ['work[0].title', profile.work[0].title],
        ['work[0].startDate', profile.work[0].startDate],
        ['work[0].endDate', profile.work[0].endDate],
      ];

      for (const [field, profileValue] of workChecks) {
        if (profileValue && profileValue.toLowerCase().trim() === normalizedValue) {
          return field;
        }
      }
    }

    // Check education fields
    if (profile.education && profile.education[0]) {
      const eduChecks = [
        ['education[0].school', profile.education[0].school],
        ['education[0].degree', profile.education[0].degree],
        ['education[0].field', profile.education[0].field],
        ['education[0].gpa', profile.education[0].gpa],
      ];

      for (const [field, profileValue] of eduChecks) {
        if (profileValue && String(profileValue).toLowerCase().trim() === normalizedValue) {
          return field;
        }
      }
    }

    // Check additional info
    const additionalChecks = [
      ['additionalInfo.workAuthorization', profile.additionalInfo?.workAuthorization],
      ['additionalInfo.workAuthorizationText', profile.additionalInfo?.workAuthorizationText],
      ['additionalInfo.veteranStatus', profile.additionalInfo?.veteranStatus],
      ['additionalInfo.disability', profile.additionalInfo?.disability],
      ['additionalInfo.gender', profile.additionalInfo?.gender],
      ['additionalInfo.ethnicity', profile.additionalInfo?.ethnicity],
    ];

    for (const [field, profileValue] of additionalChecks) {
      if (profileValue && profileValue.toLowerCase().trim() === normalizedValue) {
        return field;
      }
    }

    return null;
  },

  // Set up form submission listener to learn from corrections
  setupFormListener() {
    // Listen for form submissions
    document.addEventListener('submit', async (e) => {
      const corrections = this.detectCorrections();
      if (corrections.length > 0) {
        await this.saveCorrections(corrections);
      }
    }, true);

    // Also listen for beforeunload in case form submits via JS
    window.addEventListener('beforeunload', async () => {
      const corrections = this.detectCorrections();
      if (corrections.length > 0) {
        await this.saveCorrections(corrections);
      }
    });
  },

  // Manual trigger to save corrections (called from popup)
  async saveCurrentCorrections() {
    const corrections = this.detectCorrections();
    if (corrections.length > 0) {
      await this.saveCorrections(corrections);
      return corrections.length;
    }
    return 0;
  }
};

// Make available globally
window.Learner = Learner;
