// ========================
//  CURRENCY CONFIG (can be extended by user)
// ========================
let CURRENCIES = ['USD', 'EUR', 'JPY', 'THB'];

function loadCurrencies() {
    const stored = localStorage.getItem('fairshare_currencies');
    if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length) {
            CURRENCIES = parsed;
        }
    }
    const defaults = ['USD', 'EUR', 'JPY', 'THB'];
    defaults.forEach(c => { if (!CURRENCIES.includes(c)) CURRENCIES.push(c); });
    saveCurrencies();
}

function saveCurrencies() {
    localStorage.setItem('fairshare_currencies', JSON.stringify(CURRENCIES));
}

function addCurrency(code) {
    code = code.toUpperCase().trim();
    if (!/^[A-Z]{3}$/.test(code)) {
        alert('Invalid currency code. Please use 3 uppercase letters (e.g., GBP, AUD).');
        return false;
    }
    if (CURRENCIES.includes(code)) {
        alert('Currency already exists.');
        return false;
    }
    CURRENCIES.push(code);
    saveCurrencies();
    return true;
}

function resetCurrenciesToDefault(currentCurrency) {
    const defaults = ['USD', 'EUR', 'JPY', 'THB'];
    let newList = [...defaults];
    if (currentCurrency && !newList.includes(currentCurrency)) {
        newList.push(currentCurrency);
    }
    newList.sort();
    CURRENCIES = newList;
    saveCurrencies();
}

// ========================
//  THEME HANDLING
// ========================
function loadTheme() {
    const savedTheme = localStorage.getItem('fairshare_theme');
    const themeBtn = document.getElementById('themeToggleBtn');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        if (themeBtn) themeBtn.textContent = '☀️';
    } else {
        document.body.classList.remove('dark-mode');
        if (themeBtn) themeBtn.textContent = '🌙';
    }
}

function toggleTheme() {
    const themeBtn = document.getElementById('themeToggleBtn');
    if (document.body.classList.contains('dark-mode')) {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('fairshare_theme', 'light');
        if (themeBtn) themeBtn.textContent = '🌙';
    } else {
        document.body.classList.add('dark-mode');
        localStorage.setItem('fairshare_theme', 'dark');
        if (themeBtn) themeBtn.textContent = '☀️';
    }
}

// ========================
//  UTILITIES
// ========================
const escapeHtml = str => String(str).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
const formatTimestamp = date => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}.${min}`;
};

const safeMathParse = expr => {
    if (!expr || expr.trim() === '') return 0;
    const cleaned = expr.replace(/[^0-9+\-*/().]/g, '');
    if (!cleaned) return 0;
    if (/^[\d.]+$/.test(cleaned)) {
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
    }
    try {
        const val = Function('"use strict"; return (' + cleaned + ')')();
        return (typeof val === 'number' && !isNaN(val) && isFinite(val)) ? Math.abs(val) : 0;
    } catch { return 0; }
};

const clamp = (val, min, max) => Math.min(max, Math.max(min, val));

// ========================
//  STATE MANAGEMENT
// ========================
let appState = {
    currentInvoiceId: null,
    invoices: {},
    lastCurrency: 'USD'
};

const clone = obj => JSON.parse(JSON.stringify(obj));

function loadState() {
    loadCurrencies();
    const storedInvoices = localStorage.getItem('fairshare_invoices');
    const storedCurrent = localStorage.getItem('fairshare_current');
    const storedLastCurrency = localStorage.getItem('fairshare_last_currency');
    appState.invoices = storedInvoices ? JSON.parse(storedInvoices) : {};
    appState.currentInvoiceId = storedCurrent && appState.invoices[storedCurrent] ? storedCurrent : null;
    appState.lastCurrency = (storedLastCurrency && CURRENCIES.includes(storedLastCurrency)) ? storedLastCurrency : 'USD';

    if (!appState.currentInvoiceId) {
        const newId = 'inv_' + Date.now();
        appState.invoices[newId] = getDefaultInvoice(newId, appState.lastCurrency);
        appState.currentInvoiceId = newId;
        saveState();
    }
}

function saveState() {
    localStorage.setItem('fairshare_invoices', JSON.stringify(appState.invoices));
    localStorage.setItem('fairshare_current', appState.currentInvoiceId);
    localStorage.setItem('fairshare_last_currency', appState.lastCurrency);
}

function getDefaultInvoice(id, currency) {
    return {
        id,
        name: '#1',
        createdAt: new Date().toISOString(),
        currency,
        people: [{ id: 0, name: '1' }, { id: 1, name: '2' }],
        items: [],
        settings: {
            serviceCharge: { enabled: false, percent: 10 },
            vat: { enabled: false, percent: 7 },
            discount: { type: 'amount', value: 0, timing: 'afterAll' }
        }
    };
}

function getCurrentInvoice() {
    return appState.invoices[appState.currentInvoiceId];
}

function updateCurrentInvoice(updater) {
    const invoice = getCurrentInvoice();
    const updated = updater(clone(invoice));
    appState.invoices[appState.currentInvoiceId] = updated;
    saveState();
    return updated;
}

// ========================
//  UNIFIED DELETE INVOICE
// ========================
function deleteInvoiceById(id) {
    if (!appState.invoices[id]) return;
    if (!confirm(`Delete invoice "${appState.invoices[id].name}"? This cannot be undone.`)) return;
    delete appState.invoices[id];
    if (Object.keys(appState.invoices).length === 0) {
        const newId = 'inv_' + Date.now();
        appState.invoices[newId] = getDefaultInvoice(newId, appState.lastCurrency);
        appState.currentInvoiceId = newId;
        saveState();
        refreshUI();
        return;
    }
    if (appState.currentInvoiceId === id) {
        const deletedDate = new Date(appState.invoices[id]?.createdAt).toDateString();
        let nextInvoice = null;
        for (let inv of Object.values(appState.invoices)) {
            if (new Date(inv.createdAt).toDateString() === deletedDate) {
                nextInvoice = inv;
                break;
            }
        }
        if (!nextInvoice) nextInvoice = Object.values(appState.invoices)[0];
        appState.currentInvoiceId = nextInvoice.id;
    }
    saveState();
    refreshUI();
}

// ========================
//  UI ELEMENTS
// ========================
const elements = {
    invoiceTabs: document.getElementById('invoiceTabs'),
    globalCurrency: document.getElementById('globalCurrencySelect'),
    peopleCount: document.getElementById('peopleCount'),
    enableSC: document.getElementById('enableSC'),
    scPercent: document.getElementById('scPercent'),
    enableVAT: document.getElementById('enableVAT'),
    vatPercent: document.getElementById('vatPercent'),
    discountType: document.getElementById('discountType'),
    discountValue: document.getElementById('discountValue'),
    itemsContainer: document.getElementById('itemsContainer'),
    invoiceTotal: document.getElementById('invoiceTotalDisplay'),
    receiptView: document.getElementById('receiptView'),
    sharesView: document.getElementById('sharesView'),
    historyModal: document.getElementById('historyModal'),
    calendarGrid: document.getElementById('calendarGrid'),
    monthYearDisplay: document.getElementById('monthYearDisplay'),
    selectedDayInvoices: document.getElementById('selectedDayInvoices')
};

// ========================
//  RENDERING
// ========================
function renderCurrencyDropdown(selected) {
    elements.globalCurrency.innerHTML = CURRENCIES.map(c => `<option ${c === selected ? 'selected' : ''}>${c}</option>`).join('');
}

function renderInvoiceTabs() {
    const current = getCurrentInvoice();
    const currentDate = new Date(current.createdAt).toDateString();
    const sameDayInvoices = Object.values(appState.invoices).filter(inv => {
        return new Date(inv.createdAt).toDateString() === currentDate;
    });
    sameDayInvoices.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    
    const container = document.querySelector('.invoice-tabs-container');
    container.style.display = 'block';
    
    elements.invoiceTabs.innerHTML = sameDayInvoices.map(inv => {
        const timeStr = formatTimestamp(new Date(inv.createdAt)).split(' ')[1];
        const label = `${inv.name} ${timeStr}`;
        const isActive = inv.id === appState.currentInvoiceId;
        return `
            <button class="invoice-tab ${isActive ? 'active' : ''}" data-id="${inv.id}">
                ${escapeHtml(label)}
                <span class="close-tab" data-id="${inv.id}" title="Delete this invoice">✕</span>
            </button>
        `;
    }).join('');
    
    document.querySelectorAll('.invoice-tab').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (e.target.classList.contains('close-tab')) return;
            const newId = btn.dataset.id;
            if (newId && appState.invoices[newId]) {
                appState.currentInvoiceId = newId;
                saveState();
                refreshUI();
            }
        });
        const closeSpan = btn.querySelector('.close-tab');
        if (closeSpan) {
            closeSpan.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = closeSpan.dataset.id;
                if (id) deleteInvoiceById(id);
            });
        }
    });
}

function renderPeople() {
    const inv = getCurrentInvoice();
    elements.peopleCount.value = inv.people.length;
}

function renderSettings() {
    const inv = getCurrentInvoice();
    const s = inv.settings;
    elements.enableSC.checked = s.serviceCharge.enabled;
    elements.scPercent.value = s.serviceCharge.percent;
    elements.enableVAT.checked = s.vat.enabled;
    elements.vatPercent.value = s.vat.percent;
    elements.discountType.value = s.discount.type;
    elements.discountValue.value = s.discount.value === 0 ? '' : s.discount.value;
    document.querySelectorAll('.timing-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.timing === s.discount.timing);
    });
}

function renderEmptyMessage() {
    const inv = getCurrentInvoice();
    const existingMsg = elements.itemsContainer.querySelector('.empty-message');
    if (inv.items.length === 0) {
        if (!existingMsg) {
            const msg = document.createElement('div');
            msg.className = 'empty-message';
            msg.innerText = '✨ Click to add your first item';
            elements.itemsContainer.appendChild(msg);
        }
    } else if (existingMsg) existingMsg.remove();
}

function renderItems() {
    const inv = getCurrentInvoice();
    const itemsHtml = inv.items.map((item, idx) => `
        <div class="item-card" data-idx="${idx}">
            <div class="item-row">
                <div class="item-left">
                    <input type="text" class="item-desc" value="${escapeHtml(item.description)}" placeholder="Item name">
                    <input type="text" class="item-amount-input" value="${escapeHtml(item.amountRaw)}" placeholder="0.00">
                    <span class="currency-badge">${inv.currency}</span>
                </div>
                <button class="delete-item" data-idx="${idx}" type="button" aria-label="Delete item">🗑️</button>
            </div>
            <div class="payer-chips" data-idx="${idx}"></div>
        </div>
    `).join('');
    elements.itemsContainer.innerHTML = itemsHtml;

    inv.items.forEach((item, idx) => {
        const card = elements.itemsContainer.querySelector(`.item-card[data-idx="${idx}"]`);
        if (!card) return;
        const descInput = card.querySelector('.item-desc');
        const amountInput = card.querySelector('.item-amount-input');
        const deleteBtn = card.querySelector('.delete-item');
        const chipsDiv = card.querySelector('.payer-chips');

        descInput.addEventListener('change', () => {
            updateCurrentInvoice(inv => { inv.items[idx].description = descInput.value; return inv; });
            updateTotalsAndSummary();
        });

        amountInput.addEventListener('input', () => {
            const raw = amountInput.value;
            const numeric = safeMathParse(raw);
            updateCurrentInvoice(inv => {
                inv.items[idx].amountRaw = raw;
                inv.items[idx].amount = numeric;
                return inv;
            });
            updateTotalsAndSummary();
        });

        amountInput.addEventListener('blur', () => {
            const raw = amountInput.value;
            if (raw.trim() === '') {
                amountInput.value = '';
                updateCurrentInvoice(inv => {
                    inv.items[idx].amountRaw = '';
                    inv.items[idx].amount = 0;
                    return inv;
                });
                updateTotalsAndSummary();
                return;
            }
            let numeric = safeMathParse(raw);
            if (isNaN(numeric)) numeric = 0;
            let formatted = numeric.toString();
            if (raw.indexOf('.') === -1 && Number.isInteger(numeric)) {
                formatted = Math.floor(numeric).toString();
            }
            amountInput.value = formatted;
            updateCurrentInvoice(inv => {
                inv.items[idx].amountRaw = formatted;
                inv.items[idx].amount = numeric;
                return inv;
            });
            updateTotalsAndSummary();
        });

        deleteBtn.addEventListener('click', () => {
            updateCurrentInvoice(inv => { inv.items.splice(idx, 1); return inv; });
            renderItems();
            updateTotalsAndSummary();
        });

        renderPayerChips(chipsDiv, item.paidBy, idx);
    });

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'add-item-btn';
    addBtn.innerText = '+ Add New Item';
    addBtn.onclick = () => {
        updateCurrentInvoice(inv => {
            inv.items.push({
                id: Date.now(),
                description: `Item #${inv.items.length + 1}`,
                amount: 0,
                amountRaw: '',
                paidBy: inv.people.map(p => p.id)
            });
            return inv;
        });
        renderItems();
        updateTotalsAndSummary();
    };
    elements.itemsContainer.appendChild(addBtn);
    renderEmptyMessage();
}

function renderPayerChips(container, paidBy, itemIdx) {
    const inv = getCurrentInvoice();
    container.innerHTML = '';
    inv.people.forEach(person => {
        const chip = document.createElement('span');
        chip.className = 'payer-chip' + (paidBy.includes(person.id) ? ' active' : '');
        chip.innerText = person.name;
        chip.setAttribute('role', 'button');
        chip.setAttribute('tabindex', '0');
        chip.onclick = () => {
            updateCurrentInvoice(inv => {
                const item = inv.items[itemIdx];
                if (item.paidBy.includes(person.id)) {
                    if (item.paidBy.length > 1) item.paidBy = item.paidBy.filter(id => id !== person.id);
                } else {
                    item.paidBy.push(person.id);
                }
                return inv;
            });
            renderPayerChips(container, getCurrentInvoice().items[itemIdx].paidBy, itemIdx);
            updateTotalsAndSummary();
        };
        container.appendChild(chip);
    });
}

// ========================
//  CALCULATION ENGINE
// ========================
function computeDetailed(invoice) {
    const people = invoice.people;
    const items = invoice.items;
    const sett = invoice.settings;

    let personSubtotal = new Array(people.length).fill(0);
    items.forEach(item => {
        const amount = item.amount;
        const payers = item.paidBy;
        if (!payers.length) return;
        const share = amount / payers.length;
        payers.forEach(pid => {
            const idx = people.findIndex(p => p.id === pid);
            if (idx >= 0) personSubtotal[idx] += share;
        });
    });
    const totalSub = personSubtotal.reduce((a,b)=>a+b,0);

    const scEnabled = sett.serviceCharge.enabled;
    let scPercent = clamp(sett.serviceCharge.percent, 0, 100);
    const scRate = scEnabled ? scPercent / 100 : 0;
    const vatEnabled = sett.vat.enabled;
    let vatPercent = clamp(sett.vat.percent, 0, 100);
    const vatRate = vatEnabled ? vatPercent / 100 : 0;
    let discountValue = Math.max(0, sett.discount.value);
    const discountType = sett.discount.type;
    const timing = sett.discount.timing;
    if (discountType === 'percent') discountValue = clamp(discountValue, 0, 100);

    const distribute = (baseArr, totalDisc) => {
        const totalBase = baseArr.reduce((a,b)=>a+b,0);
        if (totalBase === 0 || totalDisc === 0) return baseArr.map(()=>0);
        return baseArr.map(v => (v / totalBase) * totalDisc);
    };

    let personFinal = new Array(people.length).fill(0);
    let personDiscount = new Array(people.length).fill(0);
    let personSC = new Array(people.length).fill(0);
    let personVAT = new Array(people.length).fill(0);
    let totalDiscountApplied = 0;

    if (discountValue === 0) {
        for (let i=0; i<people.length; i++) {
            const withSC = personSubtotal[i] * (1 + scRate);
            const vat = withSC * vatRate;
            personSC[i] = personSubtotal[i] * scRate;
            personVAT[i] = vat;
            personFinal[i] = withSC + vat;
        }
    } else {
        if (timing === 'beforeSC') {
            let discTotal = discountType === 'percent' ? (discountValue / 100) * totalSub : discountValue;
            discTotal = Math.min(discTotal, totalSub);
            personDiscount = distribute(personSubtotal, discTotal);
            totalDiscountApplied = discTotal;
            for (let i=0; i<people.length; i++) {
                let afterDisc = personSubtotal[i] - personDiscount[i];
                if (afterDisc < 0) afterDisc = 0;
                const withSC = afterDisc * (1 + scRate);
                const vat = withSC * vatRate;
                personSC[i] = afterDisc * scRate;
                personVAT[i] = vat;
                personFinal[i] = withSC + vat;
            }
        } else if (timing === 'beforeVAT') {
            const afterSC = personSubtotal.map(st => st * (1 + scRate));
            const totalAfterSC = afterSC.reduce((a,b)=>a+b,0);
            let discTotal = discountType === 'percent' ? (discountValue / 100) * totalAfterSC : discountValue;
            discTotal = Math.min(discTotal, totalAfterSC);
            personDiscount = distribute(afterSC, discTotal);
            totalDiscountApplied = discTotal;
            for (let i=0; i<people.length; i++) {
                let afterDisc = afterSC[i] - personDiscount[i];
                if (afterDisc < 0) afterDisc = 0;
                const vat = afterDisc * vatRate;
                personSC[i] = personSubtotal[i] * scRate;
                personVAT[i] = vat;
                personFinal[i] = afterDisc + vat;
            }
        } else { // afterAll
            const afterSC = personSubtotal.map(st => st * (1 + scRate));
            const afterSCVAT = afterSC.map(x => x * (1 + vatRate));
            const totalFinal = afterSCVAT.reduce((a,b)=>a+b,0);
            let discTotal = discountType === 'percent' ? (discountValue / 100) * totalFinal : discountValue;
            discTotal = Math.min(discTotal, totalFinal);
            personDiscount = distribute(afterSCVAT, discTotal);
            totalDiscountApplied = discTotal;
            for (let i=0; i<people.length; i++) {
                let afterDisc = afterSCVAT[i] - personDiscount[i];
                if (afterDisc < 0) afterDisc = 0;
                personFinal[i] = afterDisc;
                personSC[i] = personSubtotal[i] * scRate;
                personVAT[i] = afterSC[i] * vatRate;
            }
        }
    }

    const finalTotal = Math.max(0, personFinal.reduce((a,b)=>a+b,0));
    const totalSC = personSC.reduce((a,b)=>a+b,0);
    const totalVAT = personVAT.reduce((a,b)=>a+b,0);

    return {
        personSubtotal,
        personSC,
        personFinal: personFinal.map(v => Math.max(0, v)),
        personDiscount,
        personVAT,
        finalTotal,
        subtotalRaw: totalSub,
        totalSC,
        totalDiscountApplied,
        totalVAT
    };
}

function updateTotalsAndSummary() {
    const inv = getCurrentInvoice();
    const d = computeDetailed(inv);
    elements.invoiceTotal.innerHTML = `BILL TOTAL: ${d.finalTotal.toFixed(2)} ${inv.currency}`;
    const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
    if (activeTab === 'summary') renderSummary();
}

function renderSummary() {
    const inv = getCurrentInvoice();
    const d = computeDetailed(inv);
    const people = inv.people;
    const items = inv.items;
    const sett = inv.settings;
    const curr = inv.currency;

    let receiptHtml = `<strong>📋 RECEIPT</strong><br>`;
    if (items.length === 0) {
        receiptHtml += `<em>No items added yet</em><br>`;
    } else {
        items.forEach(it => {
            const amt = it.amount.toFixed(2);
            receiptHtml += `${escapeHtml(it.description)} ................ ${amt} ${curr}<br>`;
        });
    }
    receiptHtml += `────────────────────────<br>`;
    receiptHtml += `Subtotal ................ ${d.subtotalRaw.toFixed(2)} ${curr}<br>`;
    if (sett.serviceCharge.enabled) receiptHtml += `Service Charge (${sett.serviceCharge.percent}%) .. ${d.totalSC.toFixed(2)} ${curr}<br>`;
    if (sett.vat.enabled) receiptHtml += `VAT (${sett.vat.percent}%) ........... ${d.totalVAT.toFixed(2)} ${curr}<br>`;
    if (d.totalDiscountApplied > 0) receiptHtml += `Discount (${sett.discount.value}${sett.discount.type === 'percent' ? '%' : curr}) ... -${d.totalDiscountApplied.toFixed(2)} ${curr}<br>`;
    receiptHtml += `────────────────────────<br>`;
    receiptHtml += `<strong>FINAL TOTAL: ${d.finalTotal.toFixed(2)} ${curr}</strong><br>`;
    elements.receiptView.innerHTML = receiptHtml;

    let sharesHtml = `<strong>🧾 PER PERSON SHARES</strong><br><br>`;
    if (people.length === 0) {
        sharesHtml += `<em>No people added</em>`;
    } else {
        for (let i=0; i<people.length; i++) {
            sharesHtml += `<div style="margin-bottom:1rem; border-left:4px solid #6750A4; padding-left:0.8rem;">`;
            sharesHtml += `<strong style="font-size:1.05rem;">${escapeHtml(people[i].name)}  ${d.personFinal[i].toFixed(2)} ${curr}</strong><br>`;
            sharesHtml += `&nbsp;&nbsp;• Subtotal: ${d.personSubtotal[i].toFixed(2)}<br>`;
            if (sett.serviceCharge.enabled) sharesHtml += `&nbsp;&nbsp;• Service Charge: ${d.personSC[i].toFixed(2)}<br>`;
            if (sett.vat.enabled) sharesHtml += `&nbsp;&nbsp;• VAT: ${d.personVAT[i].toFixed(2)}<br>`;
            if (d.personDiscount[i] !== 0) sharesHtml += `&nbsp;&nbsp;• Discount: -${d.personDiscount[i].toFixed(2)}<br>`;
            sharesHtml += `</div>`;
        }
    }
    elements.sharesView.innerHTML = sharesHtml;
}

function refreshUI() {
    renderInvoiceTabs();
    renderCurrencyDropdown(getCurrentInvoice().currency);
    renderPeople();
    renderSettings();
    renderItems();
    updateTotalsAndSummary();
    // Ensure correct panel is visible
    const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
    if (activeTab === 'summary') {
        document.getElementById('invoiceTab').classList.remove('active-panel');
        document.getElementById('summaryTab').classList.add('active-panel');
        renderSummary();
    } else {
        document.getElementById('invoiceTab').classList.add('active-panel');
        document.getElementById('summaryTab').classList.remove('active-panel');
    }
}

// ========================
//  EVENT HANDLERS
// ========================
function attachEventListeners() {
    elements.peopleCount.addEventListener('change', () => {
        let newCount = clamp(parseInt(elements.peopleCount.value) || 2, 1, 99);
        updateCurrentInvoice(inv => {
            const current = inv.people;
            const newPeople = [];
            for (let i=0; i<newCount; i++) {
                if (i < current.length) newPeople.push(current[i]);
                else newPeople.push({ id: i, name: String(i+1) });
            }
            inv.people = newPeople;
            inv.items.forEach(item => {
                item.paidBy = item.paidBy.filter(pid => inv.people.some(p => p.id === pid));
                if (!item.paidBy.length && inv.people.length) item.paidBy = [inv.people[0].id];
            });
            return inv;
        });
        refreshUI();
    });

    elements.globalCurrency.addEventListener('change', e => {
        const newCurrency = e.target.value;
        updateCurrentInvoice(inv => { inv.currency = newCurrency; return inv; });
        appState.lastCurrency = newCurrency;
        refreshUI();
    });

    document.getElementById('addCurrencyBtn').onclick = () => {
        const code = prompt('Enter new currency code (3 letters, e.g., GBP, CAD):');
        if (code && addCurrency(code)) {
            renderCurrencyDropdown(getCurrentInvoice().currency);
        }
    };

    document.getElementById('editNamesBtn').onclick = () => {
        const inv = getCurrentInvoice();
        const names = prompt('Edit names (comma separated)', inv.people.map(p => p.name).join(','));
        if (names) {
            const parts = names.split(',').map(s => s.trim());
            updateCurrentInvoice(inv => {
                inv.people.forEach((p, idx) => { if (idx < parts.length && parts[idx]) p.name = parts[idx]; });
                return inv;
            });
            refreshUI();
        }
    };

    document.getElementById('editInvoiceNameBtn').onclick = () => {
        const newName = prompt('Edit invoice name (e.g., #1, Dinner)', getCurrentInvoice().name);
        if (newName) {
            updateCurrentInvoice(inv => { inv.name = newName; return inv; });
            refreshUI();
        }
    };

    document.getElementById('resetInvoiceBtn').onclick = () => {
        if (confirm('Reset current invoice? All items, people, settings, and custom currencies will be cleared (current currency will be kept).')) {
            const currentCurr = getCurrentInvoice().currency;
            updateCurrentInvoice(() => getDefaultInvoice(appState.currentInvoiceId, currentCurr));
            resetCurrenciesToDefault(currentCurr);
            refreshUI();
        }
    };

    // New Bill: copy people only, reset settings to defaults
    document.getElementById('newBillBtn').onclick = () => {
        const current = getCurrentInvoice();
        const newId = 'inv_' + Date.now();
        const newInv = {
            id: newId,
            name: '#' + (Object.keys(appState.invoices).length + 1),
            createdAt: new Date().toISOString(),
            currency: appState.lastCurrency,
            people: JSON.parse(JSON.stringify(current.people)),
            items: [],
            settings: {
                serviceCharge: { enabled: false, percent: 10 },
                vat: { enabled: false, percent: 7 },
                discount: { type: 'amount', value: 0, timing: 'afterAll' }
            }
        };
        appState.invoices[newId] = newInv;
        appState.currentInvoiceId = newId;
        saveState();
        refreshUI();
    };

    document.getElementById('exportBtn').onclick = () => {
        const exportData = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            currencies: CURRENCIES,
            state: {
                currentInvoiceId: appState.currentInvoiceId,
                invoices: appState.invoices,
                lastCurrency: appState.lastCurrency
            }
        };
        const dataStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fairshare_backup_${formatTimestamp(new Date())}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    document.getElementById('importBtn').onclick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => {
                try {
                    const imported = JSON.parse(ev.target.result);
                    if (!imported.state || !imported.state.invoices || !imported.state.currentInvoiceId) {
                        throw new Error('Invalid backup file format');
                    }
                    if (confirm('Importing will replace ALL current data. Continue?')) {
                        if (imported.currencies && Array.isArray(imported.currencies)) {
                            CURRENCIES = imported.currencies;
                            saveCurrencies();
                        }
                        appState.invoices = imported.state.invoices;
                        appState.currentInvoiceId = imported.state.currentInvoiceId;
                        appState.lastCurrency = imported.state.lastCurrency || 'USD';
                        if (!appState.invoices[appState.currentInvoiceId]) {
                            const ids = Object.keys(appState.invoices);
                            if (ids.length) appState.currentInvoiceId = ids[0];
                            else {
                                const newId = 'inv_' + Date.now();
                                appState.invoices[newId] = getDefaultInvoice(newId, appState.lastCurrency);
                                appState.currentInvoiceId = newId;
                            }
                        }
                        saveState();
                        refreshUI();
                        alert('Import successful!');
                    }
                } catch (err) {
                    alert('Invalid backup file: ' + err.message);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    };

    const settingFields = ['enableSC', 'scPercent', 'enableVAT', 'vatPercent', 'discountType', 'discountValue'];
    settingFields.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => {
                updateCurrentInvoice(inv => {
                    inv.settings.serviceCharge.enabled = elements.enableSC.checked;
                    let scVal = parseFloat(elements.scPercent.value);
                    inv.settings.serviceCharge.percent = isNaN(scVal) ? 0 : clamp(scVal, 0, 100);
                    inv.settings.vat.enabled = elements.enableVAT.checked;
                    let vatVal = parseFloat(elements.vatPercent.value);
                    inv.settings.vat.percent = isNaN(vatVal) ? 0 : clamp(vatVal, 0, 100);
                    inv.settings.discount.type = elements.discountType.value;
                    let discVal = parseFloat(elements.discountValue.value);
                    if (isNaN(discVal)) discVal = 0;
                    if (inv.settings.discount.type === 'percent') {
                        discVal = clamp(discVal, 0, 100);
                    } else {
                        discVal = discVal < 0 ? 0 : discVal;
                    }
                    inv.settings.discount.value = discVal;
                    elements.discountValue.value = discVal === 0 ? '' : discVal;
                    elements.scPercent.value = inv.settings.serviceCharge.percent;
                    elements.vatPercent.value = inv.settings.vat.percent;
                    return inv;
                });
                updateTotalsAndSummary();
                renderSettings();
            });
        }
    });

    document.querySelectorAll('.timing-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            updateCurrentInvoice(inv => { inv.settings.discount.timing = btn.dataset.timing; return inv; });
            updateTotalsAndSummary();
            renderSettings();
        });
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
            const tab = btn.dataset.tab;
            const invoicePanel = document.getElementById('invoiceTab');
            const summaryPanel = document.getElementById('summaryTab');
            if (tab === 'invoice') {
                invoicePanel.classList.add('active-panel');
                summaryPanel.classList.remove('active-panel');
                updateTotalsAndSummary();
            } else {
                invoicePanel.classList.remove('active-panel');
                summaryPanel.classList.add('active-panel');
                renderSummary();
            }
        });
    });

    document.getElementById('printSummaryBtn').onclick = () => window.print();
    document.getElementById('exportCsvBtn').onclick = () => {
        const d = computeDetailed(getCurrentInvoice());
        const rows = [['Person','Total','Subtotal','SC','Discount','VAT']];
        getCurrentInvoice().people.forEach((p,i) => rows.push([p.name, d.personFinal[i].toFixed(2), d.personSubtotal[i].toFixed(2), d.personSC[i].toFixed(2), d.personDiscount[i].toFixed(2), d.personVAT[i].toFixed(2)]));
        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], {type: 'text/csv'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `fairshare_${getCurrentInvoice().name}.csv`;
        a.click();
    };

    // Theme toggle
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) themeBtn.onclick = toggleTheme;

    // History modal (unchanged)
    let calendarDate = new Date();
    let selectedDate = null;

    function rebuildCalendar() {
        const year = calendarDate.getFullYear();
        const month = calendarDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const startWeekday = firstDay.getDay();
        const daysInMonth = new Date(year, month+1, 0).getDate();
        const invoicesByDate = {};
        Object.values(appState.invoices).forEach(inv => {
            const d = new Date(inv.createdAt);
            const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            if (!invoicesByDate[key]) invoicesByDate[key] = [];
            invoicesByDate[key].push(inv);
        });
        elements.calendarGrid.innerHTML = '';
        ['Su','Mo','Tu','We','Th','Fr','Sa'].forEach(w => {
            const el = document.createElement('div');
            el.innerText = w;
            el.style.fontWeight = 'bold';
            elements.calendarGrid.appendChild(el);
        });
        for (let i=0; i<startWeekday; i++) elements.calendarGrid.appendChild(document.createElement('div'));
        for (let d=1; d<=daysInMonth; d++) {
            const dateKey = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const hasInv = invoicesByDate[dateKey]?.length > 0;
            const dayDiv = document.createElement('div');
            dayDiv.className = `calendar-day${hasInv ? ' has-invoice' : ''}${selectedDate === dateKey ? ' selected' : ''}`;
            dayDiv.innerText = d;
            dayDiv.setAttribute('role', 'button');
            dayDiv.setAttribute('tabindex', '0');
            dayDiv.onclick = () => {
                document.querySelectorAll('.calendar-day').forEach(el => el.classList.remove('selected'));
                dayDiv.classList.add('selected');
                selectedDate = dateKey;
                const invs = invoicesByDate[dateKey] || [];
                elements.selectedDayInvoices.innerHTML = invs.length ? `<strong>📄 Invoices on ${dateKey}</strong><br>` + invs.map(inv => `
                    <div class="invoice-list-item">
                        <span>${inv.name} (${formatTimestamp(new Date(inv.createdAt))})</span>
                        <div>
                            <button class="icon-btn load-invoice" data-id="${inv.id}" type="button">Load</button>
                            <button class="icon-btn danger delete-invoice" data-id="${inv.id}" type="button">Delete</button>
                        </div>
                    </div>
                `).join('') : '<em>No invoices on this day</em>';
                document.querySelectorAll('.load-invoice, .delete-invoice').forEach(btn => {
                    btn.onclick = e => {
                        const id = btn.dataset.id;
                        if (btn.classList.contains('load-invoice')) {
                            appState.currentInvoiceId = id;
                            saveState();
                            refreshUI();
                            elements.historyModal.classList.add('hidden');
                            document.querySelector('.tab-btn[data-tab="invoice"]').click();
                        } else {
                            deleteInvoiceById(id);
                        }
                    };
                });
            };
            elements.calendarGrid.appendChild(dayDiv);
        }
        elements.monthYearDisplay.innerText = `${firstDay.toLocaleString('default', { month: 'long' })} ${year}`;
    }

    document.getElementById('historyBtn').onclick = () => {
        calendarDate = new Date();
        selectedDate = null;
        rebuildCalendar();
        elements.historyModal.classList.remove('hidden');
    };
    document.getElementById('closeHistoryBtn').onclick = () => elements.historyModal.classList.add('hidden');
    document.getElementById('prevMonthBtn').onclick = () => { calendarDate.setMonth(calendarDate.getMonth()-1); rebuildCalendar(); };
    document.getElementById('nextMonthBtn').onclick = () => { calendarDate.setMonth(calendarDate.getMonth()+1); rebuildCalendar(); };
    document.getElementById('deleteSelectedInvoiceBtn').onclick = () => {
        if (selectedDate) {
            const invs = Object.values(appState.invoices).filter(inv => {
                const d = new Date(inv.createdAt);
                return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` === selectedDate;
            });
            if (invs.length && confirm(`Delete ${invs.length} invoice(s) on ${selectedDate}?`)) {
                invs.forEach(inv => deleteInvoiceById(inv.id));
                rebuildCalendar();
                refreshUI();
            }
        } else alert('Select a day first');
    };
}

// ========================
//  INITIALIZATION
// ========================
function init() {
    loadState();
    attachEventListeners();
    loadTheme();
    refreshUI();
}

init();
