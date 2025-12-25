// Popup script - Handles UI interactions

document.addEventListener('DOMContentLoaded', async () => {
  const fillBtn = document.getElementById('fill-btn');
  const saveBtn = document.getElementById('save-btn');
  const statusDiv = document.getElementById('status');
  const errorDiv = document.getElementById('error');
  const siteBadge = document.getElementById('site-badge');
  const filledCount = document.getElementById('filled-count');
  const uncertainCount = document.getElementById('uncertain-count');
  const skippedCount = document.getElementById('skipped-count');

  // Check current site
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getStatus' });

    if (response?.site) {
      siteBadge.textContent = response.site;
      siteBadge.classList.add(response.site);
    }
  } catch (e) {
    siteBadge.textContent = 'Not supported';
  }

  // Fill button click
  fillBtn.addEventListener('click', async () => {
    fillBtn.disabled = true;
    fillBtn.textContent = 'Filling...';
    errorDiv.classList.add('hidden');
    statusDiv.classList.add('hidden');

    try {
      const response = await chrome.runtime.sendMessage({ action: 'fillForm' });

      if (response?.success) {
        const { results } = response;

        filledCount.textContent = results.filled;
        uncertainCount.textContent = results.uncertain;
        skippedCount.textContent = results.skipped;

        statusDiv.classList.remove('hidden');
        saveBtn.classList.remove('hidden');

        fillBtn.textContent = 'Fill Again';
      } else {
        throw new Error(response?.error || 'Failed to fill form');
      }
    } catch (error) {
      errorDiv.textContent = error.message;
      errorDiv.classList.remove('hidden');
      fillBtn.textContent = 'Fill Form';
    }

    fillBtn.disabled = false;
  });

  // Save corrections button click
  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'saveCorrections' });

      if (response?.saved > 0) {
        saveBtn.textContent = `Saved ${response.saved} correction(s)!`;
      } else {
        saveBtn.textContent = 'No corrections to save';
      }

      setTimeout(() => {
        saveBtn.textContent = 'Save Corrections';
        saveBtn.disabled = false;
      }, 2000);
    } catch (error) {
      saveBtn.textContent = 'Save failed';
      setTimeout(() => {
        saveBtn.textContent = 'Save Corrections';
        saveBtn.disabled = false;
      }, 2000);
    }
  });
});
