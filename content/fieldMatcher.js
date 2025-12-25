// Field Matcher - Identifies form fields and maps them to profile data

const FieldMatcher = {
  // Field mapping patterns: regex pattern -> profile path
  fieldMappings: {
    // Personal - First Name
    'first\\s*name|given\\s*name|fname|vorname': 'personal.firstName',
    'legal\\s*first\\s*name': 'personal.firstName',

    // Personal - Last Name
    'last\\s*name|family\\s*name|surname|lname|nachname': 'personal.lastName',
    'legal\\s*last\\s*name': 'personal.lastName',

    // Personal - Full Name
    'full\\s*name|your\\s*name|^name$': 'personal.fullName',

    // Personal - Email
    'e-?mail|email\\s*address': 'personal.email',

    // Personal - Phone
    'phone|mobile|telephone|cell|tel(?:ephone)?\\s*number': 'personal.phone',
    'country\\s*code|phone\\s*country': 'personal.phoneCountryCode',
    'phone\\s*type|device\\s*type': 'personal.phoneType',

    // Personal - Address
    'street|address\\s*line\\s*1|address(?!.*(?:city|state|zip|postal))': 'personal.address.street',
    'address\\s*line\\s*2|apt|suite|unit': 'personal.address.street2',
    '^city$|city\\/town|municipality': 'personal.address.city',
    'state|province|region': 'personal.address.state',
    'zip|postal\\s*code|post\\s*code': 'personal.address.zip',
    '^country$|country\\/region': 'personal.address.country',

    // Personal - Links
    'linkedin|linked\\s*in': 'personal.linkedin',
    'portfolio|personal\\s*website|website\\s*url': 'personal.portfolio',
    'github': 'personal.github',

    // Work - Current/Most Recent
    'current\\s*company|company\\s*name|employer|organization': 'work[0].company',
    'current\\s*title|job\\s*title|title|position|role': 'work[0].title',
    'start\\s*date': 'work[0].startDate',
    'end\\s*date': 'work[0].endDate',

    // Education
    'school|university|college|institution': 'education[0].school',
    '^degree$|degree\\s*type|level\\s*of\\s*education': 'education[0].degree',
    'major|field\\s*of\\s*study|area\\s*of\\s*study|concentration': 'education[0].field',
    'gpa|grade\\s*point': 'education[0].gpa',

    // EEO / Additional Info
    'authorized.*work|legally.*work|work.*authorization|eligible.*work': 'additionalInfo.workAuthorization',
    'sponsor|visa\\s*sponsor|require.*sponsor': 'additionalInfo.sponsorshipRequired',
    'veteran|military': 'additionalInfo.veteranStatus',
    'disability|disabled': 'additionalInfo.disability',
    'gender|sex': 'additionalInfo.gender',
    'race|ethnic|ethnicity': 'additionalInfo.ethnicity',

    // Cover Letter
    'cover\\s*letter': 'coverLetter'
  },

  // Get label text for a form element
  getLabelText(element) {
    const labels = [];

    // Check for associated label element
    if (element.id) {
      const label = document.querySelector(`label[for="${element.id}"]`);
      if (label) labels.push(label.textContent.trim());
    }

    // Check for wrapping label
    const parentLabel = element.closest('label');
    if (parentLabel) {
      labels.push(parentLabel.textContent.trim());
    }

    // Check aria-label
    if (element.getAttribute('aria-label')) {
      labels.push(element.getAttribute('aria-label'));
    }

    // Check aria-labelledby
    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy) {
      const labelEl = document.getElementById(labelledBy);
      if (labelEl) labels.push(labelEl.textContent.trim());
    }

    // Check placeholder
    if (element.placeholder) {
      labels.push(element.placeholder);
    }

    // Check name attribute
    if (element.name) {
      labels.push(element.name.replace(/[_-]/g, ' '));
    }

    // Check preceding text/label siblings
    const prevSibling = element.previousElementSibling;
    if (prevSibling && (prevSibling.tagName === 'LABEL' || prevSibling.tagName === 'SPAN')) {
      labels.push(prevSibling.textContent.trim());
    }

    // Check parent container for label-like elements
    const parent = element.closest('div, fieldset, section');
    if (parent) {
      const labelLike = parent.querySelector('label, .label, [class*="label"], legend, h3, h4');
      if (labelLike && !labels.includes(labelLike.textContent.trim())) {
        labels.push(labelLike.textContent.trim());
      }
    }

    return labels.filter(l => l.length > 0).join(' | ');
  },

  // Detect which site we're on
  detectSite() {
    const hostname = window.location.hostname;
    if (hostname.includes('workday') || hostname.includes('myworkdayjobs')) {
      return 'workday';
    }
    if (hostname.includes('greenhouse')) {
      return 'greenhouse';
    }
    return 'unknown';
  },

  // Match a label to a profile field
  matchLabelToField(labelText, learnedPatterns = {}) {
    const site = this.detectSite();
    const normalizedLabel = labelText.toLowerCase().trim();

    // First check learned patterns for this site
    if (learnedPatterns[site] && learnedPatterns[site][normalizedLabel]) {
      return {
        field: learnedPatterns[site][normalizedLabel],
        confidence: 'high',
        source: 'learned'
      };
    }

    // Check built-in patterns
    for (const [pattern, field] of Object.entries(this.fieldMappings)) {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(normalizedLabel)) {
        // Determine confidence based on match quality
        const exactMatch = normalizedLabel.match(regex);
        const confidence = exactMatch && exactMatch[0].length > normalizedLabel.length * 0.5
          ? 'high'
          : 'medium';

        return { field, confidence, source: 'pattern' };
      }
    }

    return { field: null, confidence: 'low', source: 'none' };
  },

  // Find all form fields on the page
  findFormFields() {
    const fields = [];
    const selectors = [
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"])',
      'select',
      'textarea'
    ];

    const elements = document.querySelectorAll(selectors.join(', '));

    elements.forEach(element => {
      // Skip if not visible
      if (element.offsetParent === null && !element.closest('[aria-hidden="false"]')) {
        return;
      }

      const labelText = this.getLabelText(element);

      fields.push({
        element,
        labelText,
        type: element.tagName.toLowerCase(),
        inputType: element.type || null,
        name: element.name || null,
        id: element.id || null
      });
    });

    return fields;
  },

  // Match all fields on the page
  matchAllFields(learnedPatterns = {}) {
    const fields = this.findFormFields();

    return fields.map(field => {
      const match = this.matchLabelToField(field.labelText, learnedPatterns);
      return {
        ...field,
        ...match
      };
    });
  }
};

// Make available globally
window.FieldMatcher = FieldMatcher;
