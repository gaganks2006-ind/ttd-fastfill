/**
 * TTD FastFill - Background Service Worker
 */

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[TTD FastFill] Extension installed or updated.');

  // Set default sample profile if none exists
  const existing = await chrome.storage.local.get(['ttd_profiles', 'ttd_active_profile', 'ttd_settings']);
  
  if (!existing.ttd_profiles) {
    const defaultProfiles = {
      default: [
        {
          name: 'RAMESH KUMAR',
          age: '42',
          gender: 'Male',
          idType: 'Aadhaar Card',
          idNumber: '234567890123'
        },
        {
          name: 'GEETHA KUMAR',
          age: '38',
          gender: 'Female',
          idType: 'Aadhaar Card',
          idNumber: '345678901234'
        }
      ]
    };

    const defaultSettings = {
      extraLaddus: 2,
      hundiAmount: '',
      autoCheckAgreements: true,
      autoSelectSlot: true,
      autoClickContinue: false,
      autoTriggerOnLoad: false
    };

    await chrome.storage.local.set({
      ttd_profiles: defaultProfiles,
      ttd_active_profile: 'default',
      ttd_settings: defaultSettings
    });

    console.log('[TTD FastFill] Initialized default sample profile.');
  }
});
