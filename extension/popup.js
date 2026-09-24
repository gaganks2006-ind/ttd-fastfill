/**
 * TTD FastFill - Popup Controller
 * Supports Master Bot Switch and Per-Devotee "Going / Not Going" Toggles.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const masterToggle = document.getElementById('master-bot-toggle');
  const masterIndicator = document.getElementById('master-indicator');
  const masterStatusText = document.getElementById('master-status-text');
  const masterSubtext = document.getElementById('master-subtext');
  const activeDevoteeCountEl = document.getElementById('active-devotee-count');
  const btnSelectAll = document.getElementById('btn-select-all');

  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const profileSelect = document.getElementById('profile-select');
  const devoteeContainer = document.getElementById('devotee-container');
  const btnAddDevotee = document.getElementById('btn-add-devotee');
  const btnSaveDevotees = document.getElementById('btn-save-devotees');
  const btnSaveGeneral = document.getElementById('btn-save-general');
  const btnAddProfile = document.getElementById('btn-add-profile');
  const btnCopyBookmarklet = document.getElementById('btn-copy-bookmarklet');
  const bookmarkletCopiedMsg = document.getElementById('bookmarklet-copied-msg');
  const footerStatus = document.getElementById('footer-status');

  // General inputs
  const emailInput = document.getElementById('gen-email');
  const cityInput = document.getElementById('gen-city');
  const stateInput = document.getElementById('gen-state');
  const countryInput = document.getElementById('gen-country');
  const pincodeInput = document.getElementById('gen-pincode');
  const autoCheckCheckbox = document.getElementById('set-auto-check');
  const autoContinueCheckbox = document.getElementById('set-auto-continue');

  // Default state
  let state = {
    botEnabled: true,
    profiles: {
      default: [
        { name: 'GAGAN K S', age: '25', gender: 'Male', idType: 'Aadhaar Card', idNumber: '987654321012', active: true },
        { name: 'RAMESH KUMAR', age: '48', gender: 'Male', idType: 'Aadhaar Card', idNumber: '234567890123', active: true },
        { name: 'GEETHA KUMAR', age: '45', gender: 'Female', idType: 'Aadhaar Card', idNumber: '345678901234', active: false }
      ]
    },
    activeProfile: 'default',
    general: {
      email: 'gagan@example.com',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      pincode: '560001'
    },
    settings: {
      autoCheckAgreements: true,
      autoClickContinue: false
    }
  };

  // Load storage
  const stored = await chrome.storage.local.get([
    'ttd_bot_enabled',
    'ttd_profiles',
    'ttd_active_profile',
    'ttd_general',
    'ttd_settings'
  ]);

  if (stored.ttd_bot_enabled !== undefined) state.botEnabled = stored.ttd_bot_enabled;
  if (stored.ttd_profiles) state.profiles = stored.ttd_profiles;
  if (stored.ttd_active_profile) state.activeProfile = stored.ttd_active_profile;
  if (stored.ttd_general) state.general = stored.ttd_general;
  if (stored.ttd_settings) state.settings = stored.ttd_settings;

  // Master Switch UI
  function updateMasterSwitchUI() {
    masterToggle.checked = state.botEnabled;
    if (state.botEnabled) {
      masterIndicator.classList.remove('disabled');
      masterStatusText.textContent = 'Bot System Active';
      masterSubtext.textContent = 'Ready to autofill on TTD portal';
    } else {
      masterIndicator.classList.add('disabled');
      masterStatusText.textContent = 'Bot System Paused / Off';
      masterSubtext.textContent = 'Autofill and floating bar are disabled';
    }
  }

  masterToggle.addEventListener('change', async () => {
    state.botEnabled = masterToggle.checked;
    updateMasterSwitchUI();
    await chrome.storage.local.set({ ttd_bot_enabled: state.botEnabled });
    notifyTabs('BOT_STATE_CHANGED');
  });

  updateMasterSwitchUI();

  // Tabs navigation
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
  });

  // Populate general inputs
  emailInput.value = state.general.email || '';
  cityInput.value = state.general.city || '';
  stateInput.value = state.general.state || '';
  countryInput.value = state.general.country || 'India';
  pincodeInput.value = state.general.pincode || '';

  autoCheckCheckbox.checked = state.settings.autoCheckAgreements !== false;
  autoContinueCheckbox.checked = state.settings.autoClickContinue === true;

  // Profile select dropdown
  function renderProfileSelect() {
    profileSelect.innerHTML = '';
    Object.keys(state.profiles).forEach(key => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = `${key} (${state.profiles[key].length} Saved)`;
      if (key === state.activeProfile) opt.selected = true;
      profileSelect.appendChild(opt);
    });
  }

  // Update active count summary
  function updateActiveSummary() {
    const list = state.profiles[state.activeProfile] || [];
    const activeCount = list.filter(d => d.active !== false).length;
    activeDevoteeCountEl.textContent = activeCount;
    btnSelectAll.textContent = activeCount > 0 ? 'Deselect All' : (list.length > 6 ? 'Select First 6' : 'Select All');
  }

  // Render Devotees List
  function renderDevoteeList() {
    devoteeContainer.innerHTML = '';
    const currentList = state.profiles[state.activeProfile] || [];

    currentList.forEach((d, idx) => {
      const isGoing = d.active !== false;
      const card = document.createElement('div');
      card.className = `devotee-card ${isGoing ? 'active-traveler' : 'inactive-traveler'}`;
      card.innerHTML = `
        <div class="card-top-bar">
          <div class="devotee-title-group">
            <span class="devotee-badge">#${idx + 1}</span>
            <b style="font-size: 13px; color: ${isGoing ? '#501d5d' : '#64748b'}">
              ${d.name || 'Devotee ' + (idx + 1)}
            </b>
          </div>

          <div style="display:flex; align-items:center; gap:10px;">
            <label class="traveler-toggle-wrap">
              <span>${isGoing ? 'Going' : 'Not Going'}</span>
              <label class="switch" style="transform: scale(0.85);">
                <input type="checkbox" class="d-active-toggle" data-idx="${idx}" ${isGoing ? 'checked' : ''}>
                <span class="slider round"></span>
              </label>
            </label>
            ${currentList.length > 1 ? `<button class="btn-remove-d" data-idx="${idx}" title="Remove Devotee">×</button>` : ''}
          </div>
        </div>

        <div class="form-group">
          <label>Full Name (as per ID) *</label>
          <input type="text" class="ttd-input d-name" data-idx="${idx}" value="${d.name || ''}" placeholder="NAME AS PER AADHAAR">
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label>Age *</label>
            <input type="number" class="ttd-input d-age" data-idx="${idx}" value="${d.age || ''}" placeholder="Age" maxlength="3">
          </div>
          <div class="form-group">
            <label>Gender *</label>
            <select class="ttd-input d-gender" data-idx="${idx}">
              <option value="Male" ${d.gender === 'Male' ? 'selected' : ''}>Male</option>
              <option value="Female" ${d.gender === 'Female' ? 'selected' : ''}>Female</option>
              <option value="Transgender" ${d.gender === 'Transgender' ? 'selected' : ''}>Transgender</option>
            </select>
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label>Photo ID Proof *</label>
            <select class="ttd-input d-idtype" data-idx="${idx}">
              <option value="Aadhaar Card" ${d.idType === 'Aadhaar Card' ? 'selected' : ''}>Aadhaar Card</option>
              <option value="Voter ID" ${d.idType === 'Voter ID' ? 'selected' : ''}>Voter ID</option>
              <option value="Passport" ${d.idType === 'Passport' ? 'selected' : ''}>Passport</option>
            </select>
          </div>
          <div class="form-group">
            <label>Photo ID Number *</label>
            <input type="text" class="ttd-input d-idnum" data-idx="${idx}" value="${d.idNumber || ''}" placeholder="12-digit Aadhaar Number">
          </div>
        </div>
      `;
      devoteeContainer.appendChild(card);
    });

    // Wire Per-Devotee Toggles
    document.querySelectorAll('.d-active-toggle').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        const list = state.profiles[state.activeProfile];
        const goingCount = list.filter(d => d.active !== false).length;

        if (e.target.checked && goingCount >= 6) {
          alert('⚠️ TTD allows a maximum of 6 tickets per booking. You cannot select more than 6 devotees at a time.');
          e.target.checked = false;
          return;
        }

        list[idx].active = e.target.checked;
        saveInputsToMemory();
        renderDevoteeList();
        updateActiveSummary();
        saveToStorage(false);
      });
    });

    // Wire Remove Buttons
    document.querySelectorAll('.btn-remove-d').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const removeIdx = parseInt(e.target.dataset.idx, 10);
        state.profiles[state.activeProfile].splice(removeIdx, 1);
        renderDevoteeList();
        updateActiveSummary();
        renderProfileSelect();
        saveToStorage(false);
      });
    });

    updateActiveSummary();
  }

  // Save current card inputs to memory
  function saveInputsToMemory() {
    const currentList = state.profiles[state.activeProfile];
    document.querySelectorAll('.devotee-card').forEach((card, idx) => {
      if (currentList[idx]) {
        currentList[idx].name = card.querySelector('.d-name').value.trim().toUpperCase();
        currentList[idx].age = card.querySelector('.d-age').value.trim();
        currentList[idx].gender = card.querySelector('.d-gender').value;
        currentList[idx].idType = card.querySelector('.d-idtype').value;
        currentList[idx].idNumber = card.querySelector('.d-idnum').value.trim();
      }
    });

    state.general.email = emailInput.value.trim();
    state.general.city = cityInput.value.trim();
    state.general.state = stateInput.value.trim();
    state.general.country = countryInput.value.trim();
    state.general.pincode = pincodeInput.value.trim();

    state.settings.autoCheckAgreements = autoCheckCheckbox.checked;
    state.settings.autoClickContinue = autoContinueCheckbox.checked;
  }

  // Select / Deselect All
  btnSelectAll.addEventListener('click', () => {
    const list = state.profiles[state.activeProfile];
    const currentActive = list.filter(d => d.active !== false).length;
    
    if (currentActive > 0) {
      list.forEach(d => { d.active = false; });
    } else {
      let count = 0;
      list.forEach(d => {
        if (count < 6) {
          d.active = true;
          count++;
        } else {
          d.active = false;
        }
      });
    }

    renderDevoteeList();
    saveToStorage(false);
  });

  // Add Devotee button
  btnAddDevotee.addEventListener('click', () => {
    const list = state.profiles[state.activeProfile];
    const currentlyGoing = list.filter(d => d.active !== false).length;
    list.push({
      name: '',
      age: '',
      gender: 'Male',
      idType: 'Aadhaar Card',
      idNumber: '',
      active: currentlyGoing < 6
    });
    renderDevoteeList();
    renderProfileSelect();
    saveToStorage(false);
  });

  // Switch Profile
  profileSelect.addEventListener('change', () => {
    saveInputsToMemory();
    state.activeProfile = profileSelect.value;
    renderDevoteeList();
  });

  // Add New Profile Group
  btnAddProfile.addEventListener('click', () => {
    const name = prompt('Enter a name for this devotee group (e.g. Friends, Parents):');
    if (name && name.trim()) {
      const clean = name.trim();
      if (!state.profiles[clean]) {
        state.profiles[clean] = [
          { name: '', age: '', gender: 'Male', idType: 'Aadhaar Card', idNumber: '', active: true }
        ];
        state.activeProfile = clean;
        renderProfileSelect();
        renderDevoteeList();
        saveToStorage(false);
      }
    }
  });

  // Master Save function
  async function saveToStorage(showNotice = true) {
    saveInputsToMemory();

    await chrome.storage.local.set({
      ttd_bot_enabled: state.botEnabled,
      ttd_profiles: state.profiles,
      ttd_active_profile: state.activeProfile,
      ttd_general: state.general,
      ttd_settings: state.settings
    });

    if (showNotice) {
      footerStatus.textContent = '✅ All changes saved locally!';
      footerStatus.style.color = '#22c55e';
      setTimeout(() => {
        footerStatus.textContent = '100% Secure & Local • Data stays on your device';
        footerStatus.style.color = '#64748b';
      }, 2500);
    }

    notifyTabs('PROFILE_UPDATED');
  }

  btnSaveDevotees.addEventListener('click', () => saveToStorage(true));
  btnSaveGeneral.addEventListener('click', () => saveToStorage(true));

  function notifyTabs(action) {
    chrome.tabs?.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action }).catch(() => {});
      }
    });
  }

  // Generate 1-Click Mobile Bookmarklet (ONLY for active/going devotees)
  btnCopyBookmarklet.addEventListener('click', async () => {
    await saveToStorage(false);

    const fullList = state.profiles[state.activeProfile] || [];
    const activeOnly = fullList.filter(d => d.active !== false);

    if (activeOnly.length === 0) {
      alert('⚠️ No devotees are selected as "Going this time". Please toggle at least 1 devotee ON.');
      return;
    }

    const payload = {
      pilgrims: activeOnly,
      general: state.general,
      options: state.settings
    };

    const bookmarkletCode = `javascript:(async function(){
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
console.log('⚡ TTD FastFill starting...');
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
    await sleep(100);
    const m=Array.from(document.querySelectorAll('li')).find(li=>(li.innerText||'').trim().toLowerCase()===p.gender.toLowerCase());
    if(m)m.click();
    await sleep(100);
  }
  if(idTypes[i]){
    idTypes[i].click();
    await sleep(100);
    const id=Array.from(document.querySelectorAll('li')).find(li=>(li.innerText||'').toLowerCase().includes(p.idType.toLowerCase().slice(0,4)));
    if(id)id.click();
    await sleep(120);
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
document.querySelectorAll('input[type="checkbox"]').forEach(c=>{if(!c.checked)c.click();});
alert('✅ [TTD FastFill] Filled '+data.pilgrims.length+' Devotee(s) & Address!');
})();`;

    await navigator.clipboard.writeText(bookmarkletCode);
    bookmarkletCopiedMsg.style.display = 'block';
    setTimeout(() => {
      bookmarkletCopiedMsg.style.display = 'none';
    }, 4500);
  });

  // Initial render
  renderProfileSelect();
  renderDevoteeList();
});
