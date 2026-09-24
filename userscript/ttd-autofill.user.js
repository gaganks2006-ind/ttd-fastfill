// ==UserScript==
// @name         TTD FastFill - Special Entry Darshan Assistant
// @namespace    https://ttdevasthanams.ap.gov.in/
// @version      1.2.0
// @description  Instant autofill for TTD Special Entry Darshan (₹300) booking on Desktop & Mobile.
// @author       Gagan K S
// @match        https://ttdevasthanams.ap.gov.in/*
// @match        https://*.ttdevasthanams.ap.gov.in/*
// @match        https://tirupatibalaji.ap.gov.in/*
// @match        https://*.tirupatibalaji.ap.gov.in/*
// @match        *://*/*mock-ttd-booking.html*
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  // Default pilgrim configuration
  const DEFAULT_DATA = {
    pilgrims: [
      { name: 'GAGAN K S', age: '25', gender: 'Male', idType: 'Aadhaar Card', idNumber: '987654321012' }
    ],
    general: {
      email: 'gagan@example.com',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      pincode: '560001'
    }
  };

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function setInputValue(input, val) {
    if (!input) return;
    input.focus();
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    if (nativeSetter) {
      nativeSetter.call(input, val);
    } else {
      input.value = val;
    }
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  async function fillTTDForm() {
    console.log('[TTD FastFill Userscript] Starting fill...');

    const stored = typeof GM_getValue === 'function' ? GM_getValue('ttd_data', DEFAULT_DATA) : DEFAULT_DATA;
    const pilgrims = stored.pilgrims || DEFAULT_DATA.pilgrims;
    const general = stored.general || DEFAULT_DATA.general;

    const names = document.querySelectorAll('input[name="fname"]');
    const ages = document.querySelectorAll('input[name="age"]');
    const genders = document.querySelectorAll('input[name="gender"]');
    const idTypes = document.querySelectorAll('input[name="photoIdType"]');

    let filledCount = 0;

    for (let i = 0; i < pilgrims.length; i++) {
      const p = pilgrims[i];

      // 1. Name
      if (names[i] && p.name) setInputValue(names[i], p.name.toUpperCase());

      // 2. Age
      if (ages[i] && p.age) setInputValue(ages[i], p.age);

      // 3. Gender
      if (genders[i] && p.gender) {
        genders[i].click();
        await sleep(100);
        const maleOpt = Array.from(document.querySelectorAll('li, div[role="option"]')).find(li =>
          (li.innerText || li.textContent || '').trim().toLowerCase() === p.gender.toLowerCase()
        );
        if (maleOpt) maleOpt.click();
        await sleep(100);
      }

      // 4. Photo ID Type
      if (idTypes[i] && p.idType) {
        idTypes[i].click();
        await sleep(100);
        const idOpt = Array.from(document.querySelectorAll('li, div[role="option"]')).find(li =>
          (li.innerText || li.textContent || '').toLowerCase().includes(p.idType.toLowerCase().slice(0, 4))
        );
        if (idOpt) idOpt.click();
        await sleep(120);
      }

      // 5. Photo ID Number (Enabled after ID proof selected)
      const refreshedIdNums = document.querySelectorAll('input[name="idProofNumber"]');
      if (refreshedIdNums[i] && p.idNumber) {
        setInputValue(refreshedIdNums[i], p.idNumber);
        filledCount++;
      }
    }

    // General Details
    if (general) {
      setInputValue(document.querySelector('input[name="emailId"]'), general.email);
      setInputValue(document.querySelector('input[name="city"]'), general.city);
      setInputValue(document.querySelector('input[name="state"]'), general.state);
      setInputValue(document.querySelector('input[name="country"]'), general.country || 'India');
      setInputValue(document.querySelector('input[name="pincode"]'), general.pincode);
    }

    // Agreements Checkboxes
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      if (!cb.checked && !cb.disabled) cb.click();
    });

    console.log(`[TTD FastFill Userscript] Successfully filled ${filledCount} pilgrims and general details!`);
  }

  // Inject a small floating trigger button on the page
  function injectFloatingButton() {
    if (document.getElementById('ttd-userscript-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'ttd-userscript-btn';
    btn.innerHTML = '⚡ <b>TTD FastFill</b> (Alt+F)';
    btn.style.cssText = `
      position: fixed;
      bottom: 25px;
      right: 25px;
      z-index: 9999999;
      background: linear-gradient(180deg, #ff8c00 0%, #e65100 100%);
      color: #fff;
      border: 2px solid #ffd700;
      border-radius: 28px;
      padding: 12px 20px;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(0,0,0,0.5);
    `;

    btn.onclick = async () => {
      btn.innerHTML = '⏳ Filling...';
      await fillTTDForm();
      btn.innerHTML = '✅ Done!';
      setTimeout(() => { btn.innerHTML = '⚡ <b>TTD FastFill</b> (Alt+F)'; }, 3000);
    };

    document.body.appendChild(btn);

    // Keyboard shortcut Alt + F
    document.addEventListener('keydown', (e) => {
      if (e.altKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        btn.click();
      }
    });
  }

  // Initialize
  setTimeout(injectFloatingButton, 800);
})();
