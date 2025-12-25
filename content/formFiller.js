// Form Filler - Fills form fields with profile data and applies highlights

const FormFiller = {
  // Get a value from profile using dot notation path
  getProfileValue(profile, path) {
    if (!path) return null;

    // Handle special computed fields
    if (path === 'personal.fullName') {
      return `${profile.personal?.firstName || ''} ${profile.personal?.lastName || ''}`.trim();
    }

    // Handle array notation like work[0].company
    const arrayMatch = path.match(/^(.+)\[(\d+)\]\.(.+)$/);
    if (arrayMatch) {
      const [, arrayPath, index, field] = arrayMatch;
      const array = this.getNestedValue(profile, arrayPath);
      if (Array.isArray(array) && array[parseInt(index)]) {
        return array[parseInt(index)][field];
      }
      return null;
    }

    return this.getNestedValue(profile, path);
  },

  // Get nested value from object using dot notation
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  },

  // Fill a single field
  fillField(element, value, confidence) {
    if (value === null || value === undefined || value === '') {
      return false;
    }

    const tagName = element.tagName.toLowerCase();

    try {
      if (tagName === 'select') {
        return this.fillSelect(element, value, confidence);
      } else if (tagName === 'textarea') {
        return this.fillTextarea(element, value, confidence);
      } else if (element.type === 'checkbox') {
        return this.fillCheckbox(element, value, confidence);
      } else if (element.type === 'radio') {
        return this.fillRadio(element, value, confidence);
      } else {
        return this.fillInput(element, value, confidence);
      }
    } catch (error) {
      console.error('Error filling field:', error);
      return false;
    }
  },

  // Fill text input
  fillInput(element, value, confidence) {
    // Don't overwrite if already has value
    if (element.value && element.value.trim() !== '') {
      return false;
    }

    element.value = String(value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));

    this.applyHighlight(element, confidence);
    return true;
  },

  // Fill textarea
  fillTextarea(element, value, confidence) {
    if (element.value && element.value.trim() !== '') {
      return false;
    }

    element.value = String(value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));

    this.applyHighlight(element, confidence);
    return true;
  },

  // Fill select dropdown
  fillSelect(element, value, confidence) {
    const valueStr = String(value).toLowerCase();

    // Try to find matching option
    let matched = false;
    for (const option of element.options) {
      const optionText = option.textContent.toLowerCase().trim();
      const optionValue = option.value.toLowerCase();

      if (optionText.includes(valueStr) || valueStr.includes(optionText) ||
          optionValue.includes(valueStr) || valueStr.includes(optionValue) ||
          optionText === valueStr || optionValue === valueStr) {
        element.value = option.value;
        matched = true;
        break;
      }
    }

    // Handle boolean values for yes/no dropdowns
    if (!matched && typeof value === 'boolean') {
      const searchTerm = value ? 'yes' : 'no';
      for (const option of element.options) {
        if (option.textContent.toLowerCase().includes(searchTerm)) {
          element.value = option.value;
          matched = true;
          break;
        }
      }
    }

    if (matched) {
      element.dispatchEvent(new Event('change', { bubbles: true }));
      this.applyHighlight(element, confidence);
      return true;
    }

    return false;
  },

  // Fill checkbox
  fillCheckbox(element, value, confidence) {
    const shouldCheck = value === true || value === 'true' || value === 'yes' || value === 'Yes';

    if (element.checked !== shouldCheck) {
      element.checked = shouldCheck;
      element.dispatchEvent(new Event('change', { bubbles: true }));
      this.applyHighlight(element, confidence);
      return true;
    }

    return false;
  },

  // Fill radio button
  fillRadio(element, value, confidence) {
    const valueStr = String(value).toLowerCase();
    const elementValue = element.value.toLowerCase();
    const label = window.FieldMatcher.getLabelText(element).toLowerCase();

    if (elementValue.includes(valueStr) || label.includes(valueStr) ||
        valueStr.includes(elementValue) || valueStr.includes(label)) {
      element.checked = true;
      element.dispatchEvent(new Event('change', { bubbles: true }));
      this.applyHighlight(element, confidence);
      return true;
    }

    return false;
  },

  // Apply visual highlight based on confidence
  applyHighlight(element, confidence) {
    element.classList.remove('autofill-high', 'autofill-medium', 'autofill-low');

    if (confidence === 'high') {
      element.classList.add('autofill-high');
    } else if (confidence === 'medium') {
      element.classList.add('autofill-medium');
    } else {
      element.classList.add('autofill-low');
    }

    // Store original value for learning
    element.dataset.autofillOriginal = element.value;
    element.dataset.autofillConfidence = confidence;
  },

  // Fill all matched fields
  fillAllFields(matchedFields, profile) {
    const results = {
      filled: 0,
      skipped: 0,
      uncertain: 0,
      failed: 0
    };

    matchedFields.forEach(field => {
      if (!field.field) {
        results.skipped++;
        return;
      }

      const value = this.getProfileValue(profile, field.field);

      if (value === null || value === undefined) {
        results.skipped++;
        return;
      }

      const success = this.fillField(field.element, value, field.confidence);

      if (success) {
        results.filled++;
        if (field.confidence !== 'high') {
          results.uncertain++;
        }
      } else {
        results.failed++;
      }
    });

    return results;
  }
};

// Make available globally
window.FormFiller = FormFiller;
