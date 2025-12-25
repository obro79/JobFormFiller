# Job Application Autofill

Chrome extension that auto-fills job application forms on Workday and Greenhouse with one click.

## Features

- **One-click form filling** - Click the extension icon and hit "Fill Form"
- **Smart field matching** - Recognizes common field labels across different sites
- **Confidence highlighting** - Green (confident), yellow (review), orange (best guess)
- **Learning system** - Remembers your corrections for next time

## Installation

1. Clone this repo
2. Open Chrome → `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select this folder

## Setup

1. Copy `data/profile.example.json` to `data/profile.json`
2. Edit `data/profile.json` with your information:
- Personal details (name, email, phone, address)
- Work history
- Education
- Skills
- EEO responses

## Usage

1. Navigate to a Workday or Greenhouse job application
2. Click the extension icon
3. Click "Fill Form"
4. Review highlighted fields and correct if needed
5. Click "Save Corrections" to teach the extension

## Supported Sites

- Workday (`*.workday.com`, `*.myworkdayjobs.com`)
- Greenhouse (`*.greenhouse.io`)
