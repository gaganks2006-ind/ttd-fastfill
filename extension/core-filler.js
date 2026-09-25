/**
 * TTD FastFill - Core Automation Engine v2.0 (High-Speed & Adaptive AI Heuristics)
 * Features:
 * - Sub-second execution (<1000ms) with microtask scheduling
 * - Multi-stage automation (Slot Booking -> Pilgrim Details -> Payment Gateway Stop)
 * - Adaptive Heuristic DOM Healing (resilient to CSS module hashes & attribute mutations)
 * - Web Audio API Chimes & SpeechSynthesis TTS announcements
 * - Emergency Abort Controller (Esc hotkey)
 * - Strict 6-ticket guardrail & payment safety stop
 */

(function (global) {
  'use strict';

  class TTDFastFillCoreEngine {
    constructor() {
      this.version = '2.0.0';
      this.abortController = null;
      this.isAborted = false;
      this.audioCtx = null;
      this.initEmergencyAbort();
    }

    // Initialize emergency hotkey abort (Esc key)
    initEmergencyAbort() {
      if (typeof window !== 'undefined') {
        window.addEventListener('keydown', (e) => {
          if (e.key === 'Escape' || e.code === 'Escape') {
            this.abort();
          }
        }, { capture: true });
      }
    }

    // Trigger instant abort
    abort() {
      this.isAborted = true;
      if (this.abortController) {
        this.abortController.abort();
      }
      this.playChime('abort');
      this.speak('Automation aborted by user.');
      console.warn('[TTD FastFill] 🛑 EMERGENCY ABORT TRIGGERED.');
    }

    // High-precision non-blocking sleep with abort check
    sleep(ms) {
      return new Promise((resolve, reject) => {
        if (this.isAborted) return reject(new Error('ABORTED'));
        const timer = setTimeout(resolve, ms);
        if (this.abortController) {
          this.abortController.signal.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new Error('ABORTED'));
          });
        }
      });
    }

    // Web Audio API Synthesizer (Zero external dependencies)
    playChime(type = 'success') {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        if (!this.audioCtx) this.audioCtx = new AudioCtx();
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume();
        }

        const now = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        if (type === 'success') {
          // Ascending dual-tone chime
          osc.type = 'sine';
          osc.frequency.setValueAtTime(587.33, now); // D5
          osc.frequency.setValueAtTime(880.00, now + 0.1); // A5
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          osc.start(now);
          osc.stop(now + 0.35);
        } else if (type === 'alert') {
          // Queue cleared alert
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(523.25, now); // C5
          osc.frequency.setValueAtTime(659.25, now + 0.12); // E5
          osc.frequency.setValueAtTime(783.99, now + 0.24); // G5
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
          osc.start(now);
          osc.stop(now + 0.45);
        } else if (type === 'abort') {
          // Low descending warning buzz
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(250, now);
          osc.frequency.linearRampToValueAtTime(100, now + 0.25);
          gain.gain.setValueAtTime(0.25, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
          osc.start(now);
          osc.stop(now + 0.25);
        }
      } catch (e) {
        console.warn('[TTD FastFill] Audio chime error:', e);
      }
    }

    // Web SpeechSynthesis Voice Announcer
    speak(text) {
      try {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 1.15;
          utterance.pitch = 1.0;
          utterance.volume = 0.9;
          window.speechSynthesis.speak(utterance);
        }
      } catch (e) {
        console.warn('[TTD FastFill] Speech synthesis error:', e);
      }
    }

    // React/Angular synthetic event value injector
    setInputValue(input, value) {
      if (!input || this.isAborted) return false;
      try {
        input.focus();
        const nativeSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value'
        )?.set;

        if (nativeSetter) {
          nativeSetter.call(input, value);
        } else {
          input.value = value;
        }

        // Comprehensive event dispatching sequence
        input.dispatchEvent(new Event('focus', { bubbles: true }));
        input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
        input.dispatchEvent(new Event('blur', { bubbles: true }));

        if (typeof InputEvent !== 'undefined') {
          input.dispatchEvent(
            new InputEvent('input', {
              bubbles: true,
              cancelable: true,
              inputType: 'insertText',
              data: String(value),
            })
          );
        }
        return true;
      } catch (err) {
        console.warn('[TTD FastFill] Error setting input value:', err);
        input.value = value;
        return true;
      }
    }

    // Adaptive Heuristic Field Matcher (Survives CSS module renames & attribute shifts)
    findInputByHeuristic(container, keywords = [], inputType = null) {
      if (!container) container = document;
      const inputs = Array.from(container.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"])'));

      // Pass 1: Direct attribute matches (name, label, id, placeholder, formcontrolname)
      for (const input of inputs) {
        const name = (input.name || '').toLowerCase();
        const labelAttr = (input.getAttribute('label') || '').toLowerCase();
        const placeholder = (input.placeholder || '').toLowerCase();
        const formControl = (input.getAttribute('formcontrolname') || '').toLowerCase();
        const ariaLabel = (input.getAttribute('aria-label') || '').toLowerCase();

        for (const kw of keywords) {
          const lkw = kw.toLowerCase();
          if (name.includes(lkw) || labelAttr.includes(lkw) || placeholder.includes(lkw) || formControl.includes(lkw) || ariaLabel.includes(lkw)) {
            if (!inputType || input.type === inputType || (inputType === 'text' && input.type !== 'number')) {
              return input;
            }
          }
        }
      }

      // Pass 2: Label element text matches
      for (const input of inputs) {
        const wrapper = input.closest('.field-wrapper, .form-group, div') || input.parentElement;
        if (wrapper) {
          const labelEl = wrapper.querySelector('label');
          if (labelEl) {
            const txt = (labelEl.innerText || labelEl.textContent || '').toLowerCase();
            for (const kw of keywords) {
              if (txt.includes(kw.toLowerCase())) {
                return input;
              }
            }
          }
        }
      }

      return null;
    }

    // Adaptive Dropdown Selection (Works with CSS modules, li, div[role="option"], mat-option)
    async selectCustomDropdown(inputTrigger, targetText) {
      if (!inputTrigger || this.isAborted) return false;
      try {
        inputTrigger.focus();
        inputTrigger.click();
        await this.sleep(45); // Micro-delay for DOM render

        const cleanTarget = String(targetText).toLowerCase().trim();

        // Search for open dropdown items using resilient selectors
        const listItems = Array.from(document.querySelectorAll(
          '[class*="floatingDropdown_listItem"], [class*="listItem"], li, div[role="option"], mat-option, .dropdown-item'
        ));

        for (const item of listItems) {
          const text = (item.innerText || item.textContent || '').toLowerCase().trim();
          if (
            text === cleanTarget ||
            (cleanTarget.includes('aadhaar') && text.includes('aadhaar')) ||
            (cleanTarget === 'male' && text === 'male') ||
            (cleanTarget === 'female' && text === 'female') ||
            (cleanTarget.includes('voter') && text.includes('voter')) ||
            (cleanTarget.includes('passport') && text.includes('passport'))
          ) {
            item.click();
            await this.sleep(35);
            return true;
          }
        }

        // Native select fallback
        if (inputTrigger.tagName.toLowerCase() === 'select') {
          for (let i = 0; i < inputTrigger.options.length; i++) {
            if (inputTrigger.options[i].text.toLowerCase().includes(cleanTarget)) {
              inputTrigger.selectedIndex = i;
              inputTrigger.dispatchEvent(new Event('change', { bubbles: true }));
              return true;
            }
          }
        }

        return false;
      } catch (err) {
        console.warn('[TTD FastFill] Dropdown selection error:', err);
        return false;
      }
    }

    // Detect current booking stage
    detectStage() {
      const url = typeof window !== 'undefined' ? window.location.href : '';
      if (document.querySelector('.waiting-room, [class*="queue"], #queue-container')) {
        return 'QUEUE';
      }
      if (url.includes('slot-booking') || document.querySelector('.available, .slot-booking, [class*="calendar"]')) {
        return 'SLOT_BOOKING';
      }
      if (url.includes('pilgrim-details') || document.querySelector('input[name="fname"], .pilgrim-grid-row')) {
        return 'PILGRIM_DETAILS';
      }
      if (url.includes('payment') || document.querySelector('.payment-gateway, [class*="payment"]')) {
        return 'PAYMENT';
      }
      return 'UNKNOWN';
    }

    // STAGE 1: Automate Slot Booking & Additional Services
    async executeSlotBooking(options = {}) {
      if (this.isAborted) return { success: false, aborted: true };
      console.log('[TTD FastFill] Executing Stage 1: Slot Booking...');

      // 1. Click first available green date (or prioritized date)
      const greenDate = document.querySelector('.available, [data-available="true"], td.green, .slot-available');
      if (greenDate) {
        greenDate.click();
        await this.sleep(80);
      }

      // 2. Select first available time slot button
      const slotButton = Array.from(document.querySelectorAll('.slot-btn, .time-slot, button.slot, .slot-item'))
        .find(b => !b.disabled && !b.classList.contains('disabled'));
      if (slotButton) {
        slotButton.click();
        await this.sleep(60);
      }

      // 3. Set Ticket Quantity dropdown to match active devotees
      const ticketCount = Math.min(options.ticketCount || 1, 6);
      const ticketSelect = document.querySelector('select[name*="ticket" i], select#num-tickets, [class*="ticket"] select');
      if (ticketSelect) {
        ticketSelect.value = String(ticketCount);
        ticketSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // 4. Set Additional Services (Laddus & Hundi)
      if (options.extraLaddus) {
        const ladduInput = this.findInputByHeuristic(document, ['laddu', 'additional laddu'], 'number') ||
                           document.querySelector('input[name*="laddu" i]');
        if (ladduInput) this.setInputValue(ladduInput, String(options.extraLaddus));
      }

      if (options.hundiAmount) {
        const hundiInput = this.findInputByHeuristic(document, ['hundi', 'offering']) ||
                           document.querySelector('input[name*="hundi" i]');
        if (hundiInput) this.setInputValue(hundiInput, String(options.hundiAmount));
      }

      // 5. Advance to Pilgrim Details
      await this.sleep(80);
      const continueBtn = Array.from(document.querySelectorAll('button')).find(b =>
        (b.innerText || b.textContent || '').trim().toLowerCase().includes('continue')
      );
      if (continueBtn && !continueBtn.disabled) {
        continueBtn.click();
        return { success: true, stage: 'SLOT_BOOKING_ADVANCED' };
      }

      return { success: true };
    }

    // STAGE 2: Automate Pilgrim Details & Address
    async fillPilgrimRow(rowContainer, index, pilgrim) {
      if (this.isAborted) return false;

      // 1. Name
      const nameInput = rowContainer.querySelector('input[name="fname"]') ||
                        this.findInputByHeuristic(rowContainer, ['name', 'fname']);
      if (nameInput && pilgrim.name) {
        this.setInputValue(nameInput, pilgrim.name.toUpperCase().trim());
      }

      // 2. Age
      const ageInput = rowContainer.querySelector('input[name="age"]') ||
                       this.findInputByHeuristic(rowContainer, ['age'], 'number');
      if (ageInput && pilgrim.age) {
        this.setInputValue(ageInput, String(pilgrim.age).trim());
      }

      // 3. Gender
      const genderInput = rowContainer.querySelector('input[name="gender"]') ||
                          this.findInputByHeuristic(rowContainer, ['gender']);
      if (genderInput && pilgrim.gender) {
        await this.selectCustomDropdown(genderInput, pilgrim.gender);
      }

      // 4. Photo ID Proof Type (Triggers unlock of ID Number)
      const idTypeInput = rowContainer.querySelector('input[name="photoIdType"]') ||
                          this.findInputByHeuristic(rowContainer, ['photoidtype', 'idproof', 'proof']);
      if (idTypeInput && pilgrim.idType) {
        await this.selectCustomDropdown(idTypeInput, pilgrim.idType);
        await this.sleep(40); // Allow React to remove disabled state
      }

      // 5. Photo ID Number (Aadhaar / Voter ID / Passport)
      const idNumInput = rowContainer.querySelector('input[name="idProofNumber"]') ||
                         this.findInputByHeuristic(rowContainer, ['idproofnumber', 'idnum', 'aadhaar']);
      if (idNumInput && pilgrim.idNumber) {
        let cleanId = String(pilgrim.idNumber).trim();
        if ((pilgrim.idType || '').toLowerCase().includes('aadhaar')) {
          cleanId = cleanId.replace(/\D/g, '').slice(0, 12);
        }
        this.setInputValue(idNumInput, cleanId);
      }

      return true;
    }

    // Fill General Contact Details
    fillGeneralDetails(general = {}) {
      if (this.isAborted) return 0;
      let filled = 0;

      const emailInput = document.querySelector('input[name="emailId"]') || this.findInputByHeuristic(document, ['email']);
      if (emailInput && general.email) {
        this.setInputValue(emailInput, general.email.trim());
        filled++;
      }

      const cityInput = document.querySelector('input[name="city"]') || this.findInputByHeuristic(document, ['city']);
      if (cityInput && general.city) {
        this.setInputValue(cityInput, general.city.trim());
        filled++;
      }

      const stateInput = document.querySelector('input[name="state"]') || this.findInputByHeuristic(document, ['state']);
      if (stateInput && general.state) {
        this.setInputValue(stateInput, general.state.trim());
        filled++;
      }

      const countryInput = document.querySelector('input[name="country"]') || this.findInputByHeuristic(document, ['country']);
      if (countryInput) {
        this.setInputValue(countryInput, (general.country || 'India').trim());
        filled++;
      }

      const pincodeInput = document.querySelector('input[name="pincode"]') || this.findInputByHeuristic(document, ['pincode']);
      if (pincodeInput && general.pincode) {
        this.setInputValue(pincodeInput, String(general.pincode).trim());
        filled++;
      }

      return filled;
    }

    // Check all rules & terms agreement checkboxes
    checkAgreements() {
      let checked = 0;
      document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        if (!cb.checked && !cb.disabled) {
          cb.click();
          if (!cb.checked) {
            cb.checked = true;
            cb.dispatchEvent(new Event('change', { bubbles: true }));
          }
          checked++;
        }
      });
      return checked;
    }

    // MASTER AUTONOMOUS EXECUTION (The "Run" Pipeline)
    async executeAutonomousRun(pilgrims = [], general = {}, options = {}) {
      this.isAborted = false;
      this.abortController = new AbortController();
      const startTime = performance.now();

      const results = {
        success: false,
        stage: this.detectStage(),
        pilgrimsTargeted: pilgrims.length,
        pilgrimsFilled: 0,
        timeTakenMs: 0,
        errors: [],
        aborted: false
      };

      try {
        // Enforce strict 6-ticket guardrail (auto-slice to first 6)
        if (pilgrims.length > 6) {
          console.warn('[TTD FastFill] Capping devotees to TTD maximum of 6 tickets.');
          pilgrims = pilgrims.slice(0, 6);
        }

        console.log(`[TTD FastFill] Starting Autonomous Run for ${pilgrims.length} devotee(s)...`);

        // Check if we are on Slot Booking stage
        if (results.stage === 'SLOT_BOOKING') {
          await this.executeSlotBooking({
            ticketCount: pilgrims.length,
            extraLaddus: options.extraLaddus,
            hundiAmount: options.hundiAmount
          });
          await this.sleep(120);
        }

        // Fill Devotee Rows
        const rows = Array.from(document.querySelectorAll('.pilgrim-grid-row, [data-row]'));
        const targetRows = rows.length > 0 ? rows : [document];

        for (let i = 0; i < pilgrims.length; i++) {
          if (this.isAborted) throw new Error('ABORTED');
          const rowContainer = rows[i] || targetRows[0];
          await this.fillPilgrimRow(rowContainer, i, pilgrims[i]);
          results.pilgrimsFilled++;
        }

        // Fill General Contact Details
        this.fillGeneralDetails(general);

        // Check Agreements
        if (options.autoCheckAgreements !== false) {
          this.checkAgreements();
        }

        // Click Continue to proceed to Payment screen
        if (options.autoClickContinue !== false) {
          await this.sleep(90);
          const continueBtn = Array.from(document.querySelectorAll('button')).find(b =>
            (b.innerText || b.textContent || '').trim().toLowerCase() === 'continue'
          );
          if (continueBtn && !continueBtn.disabled) {
            continueBtn.click();
          }
        }

        results.timeTakenMs = Math.round(performance.now() - startTime);
        results.success = results.pilgrimsFilled > 0;

        // Feedback: Chime and speech
        this.playChime('success');
        this.speak('Devotee details filled. Redirecting to payment.');
        console.log(`[TTD FastFill] Completed Autonomous Run in ${results.timeTakenMs}ms!`);

        return results;
      } catch (err) {
        results.aborted = err.message === 'ABORTED';
        if (results.aborted) {
          results.errors.push('Automation halted by user (Esc).');
        } else {
          results.errors.push(err.message);
        }
        return results;
      }
    }
  }

  // Export Singleton instance
  const instance = new TTDFastFillCoreEngine();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = instance;
  } else {
    global.TTDFastFillCore = instance;
  }
})(typeof window !== 'undefined' ? window : this);
