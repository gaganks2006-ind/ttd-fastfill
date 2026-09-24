/**
 * TTD FastFill - Mobile App Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  // Register Service Worker for PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  // DOM Elements
  const tabItems = document.querySelectorAll('.tab-item');
  const viewPanels = document.querySelectorAll('.view-panel');
  const devoteesListEl = document.getElementById('mobile-devotees-list');
  const quotaPill = document.getElementById('header-quota-pill');
  const heroSubtext = document.getElementById('hero-subtext');
  const btnSelectAll = document.getElementById('btn-select-all-mobile');
  const btnAddDevotee = document.getElementById('btn-add-devotee-mobile');
  const btnCopyFastFill = document.getElementById('btn-copy-fastfill');
  const btnBottomFastFill = document.getElementById('btn-bottom-fastfill');
  const copySuccessBanner = document.getElementById('copy-success-banner');
  const btnSaveAddress = document.getElementById('btn-save-address');

  // Address Inputs
  const emailInput = document.getElementById('mob-email');
  const cityInput = document.getElementById('mob-city');
  const stateInput = document.getElementById('mob-state');
  const countryInput = document.getElementById('mob-country');
  const pincodeInput = document.getElementById('mob-pincode');

  // Settings Toggles
  const setTerms = document.getElementById('set-mob-terms');
  const setAudio = document.getElementById('set-mob-audio');
  const setContinue = document.getElementById('set-mob-continue');

  // State initialization from LocalStorage
  let state = {
    devotees: JSON.parse(localStorage.getItem('ttd_mobile_devotees')) || [
      { name: 'GAGAN K S', age: '25', gender: 'Male', idType: 'Aadhaar Card', idNumber: '987654321012', active: true },
      { name: 'RAMESH KUMAR', age: '48', gender: 'Male', idType: 'Aadhaar Card', idNumber: '234567890123', active: false }
    ],
    address: JSON.parse(localStorage.getItem('ttd_mobile_address')) || {
      email: 'gagan@example.com',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      pincode: '560001'
    },
    settings: JSON.parse(localStorage.getItem('ttd_mobile_settings')) || {
      terms: true,
      audio: true,
      autoContinue: true
    }
  };

  // Populate address inputs
  emailInput.value = state.address.email || '';
  cityInput.value = state.address.city || '';
  stateInput.value = state.address.state || '';
  countryInput.value = state.address.country || 'India';
  pincodeInput.value = state.address.pincode || '';

  setTerms.checked = state.settings.terms !== false;
  setAudio.checked = state.settings.audio !== false;
  setContinue.checked = state.settings.autoContinue !== false;

  // Tab Navigation
  tabItems.forEach(tab => {
    tab.addEventListener('click', () => {
      tabItems.forEach(t => t.classList.remove('active'));
      viewPanels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const targetView = document.getElementById(`view-${tab.dataset.view}`);
      if (targetView) targetView.classList.add('active');
    });
  });

  // Save State
  function saveState() {
    localStorage.setItem('ttd_mobile_devotees', JSON.stringify(state.devotees));
    localStorage.setItem('ttd_mobile_address', JSON.stringify(state.address));
    localStorage.setItem('ttd_mobile_settings', JSON.stringify(state.settings));
    updateQuotaUI();
  }

  // Update Quota Badges
  function updateQuotaUI() {
    const activeCount = state.devotees.filter(d => d.active !== false).length;
    quotaPill.textContent = `${activeCount} Going`;
    heroSubtext.textContent = `${activeCount} devotee(s) selected for booking (Max 6)`;
    btnSelectAll.textContent = activeCount === state.devotees.length ? 'Deselect All' : 'Select All';
    btnAddDevotee.disabled = state.devotees.length >= 6;
  }

  // Render Devotees Cards
  function renderDevotees() {
    devoteesListEl.innerHTML = '';

    state.devotees.forEach((d, idx) => {
      const isGoing = d.active !== false;
      const card = document.createElement('div');
      card.className = `m-devotee-card ${isGoing ? 'active-traveler' : 'inactive-traveler'}`;
      card.innerHTML = `
        <div class="card-top-row">
          <div class="d-label-badge">
            <span class="d-num">#${idx + 1}</span>
            <span>${d.name || 'Devotee ' + (idx + 1)}</span>
          </div>

          <div class="toggle-group">
            <span class="toggle-text">${isGoing ? 'Going' : 'Not Going'}</span>
            <label class="switch" style="transform: scale(0.85);">
              <input type="checkbox" class="chk-travel" data-idx="${idx}" ${isGoing ? 'checked' : ''}>
              <span class="slider round"></span>
            </label>
            ${state.devotees.length > 1 ? `<button class="btn-del-d" data-idx="${idx}">×</button>` : ''}
          </div>
        </div>

        <div class="input-field">
          <label>Full Name (as per ID) *</label>
          <input type="text" class="in-name" data-idx="${idx}" value="${d.name || ''}" placeholder="NAME AS PER AADHAAR">
        </div>

        <div class="grid-2-col">
          <div class="input-field">
            <label>Age *</label>
            <input type="number" class="in-age" data-idx="${idx}" value="${d.age || ''}" placeholder="38" maxlength="3">
          </div>
          <div class="input-field">
            <label>Gender *</label>
            <select class="in-gender" data-idx="${idx}">
              <option value="Male" ${d.gender === 'Male' ? 'selected' : ''}>Male</option>
              <option value="Female" ${d.gender === 'Female' ? 'selected' : ''}>Female</option>
              <option value="Transgender" ${d.gender === 'Transgender' ? 'selected' : ''}>Transgender</option>
            </select>
          </div>
        </div>

        <div class="grid-2-col">
          <div class="input-field">
            <label>Photo ID Proof *</label>
            <select class="in-idtype" data-idx="${idx}">
              <option value="Aadhaar Card" ${d.idType === 'Aadhaar Card' ? 'selected' : ''}>Aadhaar Card</option>
              <option value="Voter ID" ${d.idType === 'Voter ID' ? 'selected' : ''}>Voter ID</option>
              <option value="Passport" ${d.idType === 'Passport' ? 'selected' : ''}>Passport</option>
            </select>
          </div>
          <div class="input-field">
            <label>Photo ID Number *</label>
            <input type="text" class="in-idnum" data-idx="${idx}" value="${d.idNumber || ''}" placeholder="12-digit Aadhaar Number">
          </div>
        </div>
      `;
      devoteesListEl.appendChild(card);
    });

    // Wire input changes
    document.querySelectorAll('.in-name').forEach(el => {
      el.addEventListener('input', (e) => {
        state.devotees[e.target.dataset.idx].name = e.target.value.toUpperCase();
        saveState();
      });
    });
    document.querySelectorAll('.in-age').forEach(el => {
      el.addEventListener('input', (e) => {
        state.devotees[e.target.dataset.idx].age = e.target.value;
        saveState();
      });
    });
    document.querySelectorAll('.in-gender').forEach(el => {
      el.addEventListener('change', (e) => {
        state.devotees[e.target.dataset.idx].gender = e.target.value;
        saveState();
      });
    });
    document.querySelectorAll('.in-idtype').forEach(el => {
      el.addEventListener('change', (e) => {
        state.devotees[e.target.dataset.idx].idType = e.target.value;
        saveState();
      });
    });
    document.querySelectorAll('.in-idnum').forEach(el => {
      el.addEventListener('input', (e) => {
        state.devotees[e.target.dataset.idx].idNumber = e.target.value.trim();
        saveState();
      });
    });

    // Wire Toggles
    document.querySelectorAll('.chk-travel').forEach(el => {
      el.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        const goingCount = state.devotees.filter(d => d.active !== false).length;

        if (e.target.checked && goingCount >= 6) {
          alert('⚠️ TTD allows a maximum of 6 tickets per booking. You cannot select more than 6 devotees at once.');
          e.target.checked = false;
          return;
        }

        state.devotees[idx].active = e.target.checked;
        saveState();
        renderDevotees();
      });
    });

    // Wire Delete
    document.querySelectorAll('.btn-del-d').forEach(el => {
      el.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        state.devotees.splice(idx, 1);
        saveState();
        renderDevotees();
      });
    });

    updateQuotaUI();
  }

  // Select / Deselect All
  btnSelectAll.addEventListener('click', () => {
    const anyInactive = state.devotees.some(d => d.active === false);
    let count = 0;
    state.devotees.forEach(d => {
      if (anyInactive && count < 6) {
        d.active = true;
        count++;
      } else {
        d.active = false;
      }
    });
    saveState();
    renderDevotees();
  });

  // Add Devotee
  btnAddDevotee.addEventListener('click', () => {
    if (state.devotees.length < 6) {
      const activeCount = state.devotees.filter(d => d.active !== false).length;
      state.devotees.push({
        name: '',
        age: '',
        gender: 'Male',
        idType: 'Aadhaar Card',
        idNumber: '',
        active: activeCount < 6
      });
      saveState();
      renderDevotees();
    }
  });

  // Save Address Button
  btnSaveAddress.addEventListener('click', () => {
    state.address.email = emailInput.value.trim();
    state.address.city = cityInput.value.trim();
    state.address.state = stateInput.value.trim();
    state.address.country = countryInput.value.trim();
    state.address.pincode = pincodeInput.value.trim();
    saveState();
    alert('✅ Address details saved successfully!');
  });

  // Settings change listeners
  setTerms.addEventListener('change', () => { state.settings.terms = setTerms.checked; saveState(); });
  setAudio.addEventListener('change', () => { state.settings.audio = setAudio.checked; saveState(); });
  setContinue.addEventListener('change', () => { state.settings.autoContinue = setContinue.checked; saveState(); });

  // Generate Bookmarklet Code
  function getBookmarkletCode() {
    const activeDevotees = state.devotees.filter(d => d.active !== false);
    if (activeDevotees.length === 0) {
      alert('⚠️ No devotees are toggled "Going". Please select at least 1 devotee.');
      return null;
    }

    const payload = {
      pilgrims: activeDevotees,
      general: state.address,
      options: state.settings
    };

    return `javascript:(async function(){
const data=${JSON.stringify(payload)};
function setVal(el,v){
  if(!el)return;
  el.focus();
  const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set;
  if(s){s.call(el,v);}else{el.value=v;}
  el.dispatchEvent(new Event('input',{bubbles:true}));
  el.dispatchEvent(new Event('change',{bubbles:true}));
  el.dispatchEvent(new Event('blur',{bubbles:true}));
}
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
console.log('⚡ TTD Mobile FastFill executing...');
const names=document.querySelectorAll('input[name="fname"]');
const ages=document.querySelectorAll('input[name="age"]');
const genders=document.querySelectorAll('input[name="gender"]');
const idTypes=document.querySelectorAll('input[name="photoIdType"]');
for(let i=0;i<data.pilgrims.length;i++){
  const p=data.pilgrims[i];
  if(names[i])setVal(names[i],p.name);
  if(ages[i])setVal(ages[i],p.age);
  if(genders[i]){
    genders[i].click();
    await sleep(90);
    const m=Array.from(document.querySelectorAll('li, div[role="option"]')).find(li=>(li.innerText||'').trim().toLowerCase()===p.gender.toLowerCase());
    if(m)m.click();
    await sleep(80);
  }
  if(idTypes[i]){
    idTypes[i].click();
    await sleep(90);
    const id=Array.from(document.querySelectorAll('li, div[role="option"]')).find(li=>(li.innerText||'').toLowerCase().includes(p.idType.toLowerCase().slice(0,4)));
    if(id)id.click();
    await sleep(100);
  }
  const idNums=document.querySelectorAll('input[name="idProofNumber"]');
  if(idNums[i])setVal(idNums[i],p.idNumber);
}
if(data.general){
  setVal(document.querySelector('input[name="emailId"]'),data.general.email);
  setVal(document.querySelector('input[name="city"]'),data.general.city);
  setVal(document.querySelector('input[name="state"]'),data.general.state);
  setVal(document.querySelector('input[name="country"]'),data.general.country||'India');
  setVal(document.querySelector('input[name="pincode"]'),data.general.pincode);
}
if(data.options.terms!==false){
  document.querySelectorAll('input[type="checkbox"]').forEach(c=>{if(!c.checked)c.click();});
}
if(data.options.autoContinue!==false){
  await sleep(150);
  const btn=Array.from(document.querySelectorAll('button')).find(b=>(b.innerText||'').toLowerCase().includes('continue'));
  if(btn&&!btn.disabled)btn.click();
}
alert('✅ [TTD FastFill] Filled '+data.pilgrims.length+' Devotee(s) & Address!');
})();`.replace(/\n/g, ' ');
  }

  // FastFill Copy Handler
  async function handleFastFillCopy() {
    const code = getBookmarkletCode();
    if (!code) return;

    try {
      await navigator.clipboard.writeText(code);
      copySuccessBanner.style.display = 'block';
      setTimeout(() => { copySuccessBanner.style.display = 'none'; }, 4000);
    } catch (e) {
      prompt('Copy this code to create your mobile bookmark:', code);
    }
  }

  btnCopyFastFill.addEventListener('click', handleFastFillCopy);
  btnBottomFastFill.addEventListener('click', handleFastFillCopy);

  // Initial render
  renderDevotees();
});
