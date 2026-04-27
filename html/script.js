// ---------- SINGLE CURRENCY SOURCE ----------
const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD'];

function getCurrencyOptions(selected) {
    return CURRENCIES.map(c => `<option ${c === selected ? 'selected' : ''}>${c}</option>`).join('');
}

// ---------- DATA ----------
let invoiceData = {
    id: "inv_" + Date.now(),
    name: "#1",
    createdAt: new Date(),
    currency: "USD",
    people: [{ id: 0, name: "1" }, { id: 1, name: "2" }],
    items: [],
    settings: {
        serviceCharge: { enabled: false, percent: 10 },
        vat: { enabled: false, percent: 7 },
        discount: { type: "amount", value: 0, timing: "afterAll" }
    }
};
let currentInvoiceId = invoiceData.id;

// Helper: format date
function formatInvoiceTimestamp(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2,'0');
    const dd = String(date.getDate()).padStart(2,'0');
    const hh = String(date.getHours()).padStart(2,'0');
    const min = String(date.getMinutes()).padStart(2,'0');
    return `${yyyy}-${mm}-${dd} ${hh}.${min}`;
}

function updateInvoiceTitleDisplay() {
    const ts = formatInvoiceTimestamp(invoiceData.createdAt);
    document.getElementById("invoiceTitleDisplay").innerText = `${invoiceData.name} ${ts}`;
}

// Storage
function saveToLocal() {
    const all = JSON.parse(localStorage.getItem("fairshare_invoices") || "{}");
    all[currentInvoiceId] = JSON.parse(JSON.stringify(invoiceData));
    localStorage.setItem("fairshare_invoices", JSON.stringify(all));
    localStorage.setItem("fairshare_current", currentInvoiceId);
    localStorage.setItem("fairshare_last_currency", invoiceData.currency);
}

function loadFromLocal() {
    const all = JSON.parse(localStorage.getItem("fairshare_invoices") || "{}");
    let curr = localStorage.getItem("fairshare_current");
    if (curr && all[curr]) {
        currentInvoiceId = curr;
        invoiceData = JSON.parse(JSON.stringify(all[curr]));
        invoiceData.createdAt = new Date(invoiceData.createdAt);
    } else {
        const lastCurrency = localStorage.getItem("fairshare_last_currency");
        invoiceData.items = [];
        invoiceData.people = [{id:0,name:"1"},{id:1,name:"2"}];
        invoiceData.createdAt = new Date();
        invoiceData.name = "#1";
        invoiceData.currency = (lastCurrency && CURRENCIES.includes(lastCurrency)) ? lastCurrency : "USD";
        invoiceData.settings = { serviceCharge:{enabled:false,percent:10}, vat:{enabled:false,percent:7}, discount:{type:"amount",value:0,timing:"afterAll"} };
        saveToLocal();
    }
    syncUIFromData();
}

function populateGlobalCurrencyDropdown() {
    const select = document.getElementById('globalCurrencySelect');
    select.innerHTML = getCurrencyOptions(invoiceData.currency);
}

function syncUIFromData() {
    document.getElementById("peopleCount").value = invoiceData.people.length;
    populateGlobalCurrencyDropdown();
    document.getElementById("enableSC").checked = invoiceData.settings.serviceCharge.enabled;
    document.getElementById("scPercent").value = invoiceData.settings.serviceCharge.percent;
    document.getElementById("enableVAT").checked = invoiceData.settings.vat.enabled;
    document.getElementById("vatPercent").value = invoiceData.settings.vat.percent;
    document.getElementById("discountType").value = invoiceData.settings.discount.type;
    document.getElementById("discountValue").value = invoiceData.settings.discount.value;
    document.querySelectorAll(".timing-btn").forEach(btn => {
        if(btn.dataset.timing === invoiceData.settings.discount.timing) btn.classList.add("active");
        else btn.classList.remove("active");
    });
    updateInvoiceTitleDisplay();
    renderItems();
    updateBillTotalDisplay();
}

// People & items rendering
function updatePeopleFromCount() {
    let newCount = parseInt(document.getElementById("peopleCount").value);
    if (isNaN(newCount) || newCount < 1) newCount = 1;
    const current = invoiceData.people;
    if (current.length === newCount) return;
    const newPeople = [];
    for (let i = 0; i < newCount; i++) {
        if (i < current.length) newPeople.push(current[i]);
        else newPeople.push({ id: i, name: String(i+1) });
    }
    while(newPeople.length > newCount) newPeople.pop();
    invoiceData.people = newPeople;
    invoiceData.items.forEach(item => {
        item.paidBy = item.paidBy.filter(pid => invoiceData.people.some(p => p.id === pid));
        if(item.paidBy.length === 0 && invoiceData.people.length>0) item.paidBy = [invoiceData.people[0].id];
    });
    renderItems();
    saveToLocal();
}

function parseAmount(str) {
    if (!str) return 0;
    let cleaned = str.replace(/[^0-9+\-*/.]/g, '');
    try {
        let val = Function('"use strict"; return (' + cleaned + ')')();
        return (typeof val === 'number' && !isNaN(val)) ? Math.abs(val) : 0;
    } catch(e) { return 0; }
}

function getNextItemDefaultName() {
    const existing = invoiceData.items.length;
    return `Item #${existing + 1}`;
}

function renderItems() {
    const container = document.getElementById("itemsContainer");
    container.innerHTML = '';
    invoiceData.items.forEach((item, idx) => {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <div class="item-header">
                <input type="text" class="item-desc" value="${escapeHtml(item.description)}" placeholder="Item name">
                <button class="delete-item" data-idx="${idx}">🗑️ Delete</button>
            </div>
            <div class="item-amount">
                <input type="text" class="amount-input" value="${item.amountRaw || item.amount}" placeholder="e.g. 123+45.67">
                <select class="currency-picker">${getCurrencyOptions(item.currency || invoiceData.currency)}</select>
            </div>
            <div class="payer-chips" id="payerChips-${idx}"></div>
        `;
        container.appendChild(card);
        const descInput = card.querySelector('.item-desc');
        const amountInput = card.querySelector('.amount-input');
        const currencySelect = card.querySelector('.currency-picker');
        descInput.addEventListener('change', (e) => { invoiceData.items[idx].description = e.target.value; saveToLocal(); updateBillTotalDisplay(); updateSummary(); });
        amountInput.addEventListener('input', (e) => { 
            invoiceData.items[idx].amountRaw = e.target.value;
            const numeric = parseAmount(e.target.value);
            invoiceData.items[idx].amount = numeric;
            saveToLocal(); updateBillTotalDisplay(); updateSummary();
        });
        currencySelect.addEventListener('change', (e) => { invoiceData.items[idx].currency = e.target.value; saveToLocal(); updateBillTotalDisplay(); updateSummary(); });
        renderPayerChips(card.querySelector(`#payerChips-${idx}`), idx);
        card.querySelector('.delete-item').addEventListener('click', () => {
            invoiceData.items.splice(idx,1);
            saveToLocal(); renderItems(); updateBillTotalDisplay(); updateSummary();
        });
    });
    const addBtn = document.createElement('button');
    addBtn.innerText = '+ Add New Item';
    addBtn.className = 'add-item-btn';
    addBtn.onclick = () => {
        const newId = Date.now();
        invoiceData.items.push({
            id: newId,
            description: getNextItemDefaultName(),
            amount: 0,
            amountRaw: "0",
            currency: invoiceData.currency,
            paidBy: invoiceData.people.map(p => p.id)
        });
        saveToLocal(); renderItems(); updateBillTotalDisplay(); updateSummary();
    };
    container.appendChild(addBtn);
}

function renderPayerChips(container, itemIdx) {
    const item = invoiceData.items[itemIdx];
    if (!item.paidBy) item.paidBy = invoiceData.people.map(p=>p.id);
    container.innerHTML = '';
    invoiceData.people.forEach(person => {
        const chip = document.createElement('span');
        chip.className = 'payer-chip' + (item.paidBy.includes(person.id) ? ' active' : '');
        chip.innerText = person.name;
        chip.onclick = () => {
            if (item.paidBy.includes(person.id)) {
                if (item.paidBy.length > 1) item.paidBy = item.paidBy.filter(id => id !== person.id);
            } else {
                item.paidBy.push(person.id);
            }
            renderPayerChips(container, itemIdx);
            saveToLocal(); updateBillTotalDisplay(); updateSummary();
        };
        container.appendChild(chip);
    });
}

function updateBillTotalDisplay() {
    const detailed = computeDetailed();
    document.getElementById("invoiceTotalDisplay").innerHTML = `BILL TOTAL: ${detailed.finalTotal.toFixed(2)} ${invoiceData.currency}`;
    if (document.getElementById("summaryTab").style.display !== 'none') updateSummary();
}

// ---------- SUMMARY & CALCULATION (discount non-negative) ----------
function computeDetailed() {
    const people = invoiceData.people;
    const items = invoiceData.items;
    const sett = invoiceData.settings;
    
    let personSubtotal = new Array(people.length).fill(0);
    items.forEach(item => {
        const amount = item.amount;
        const payers = item.paidBy;
        if (payers.length === 0) return;
        const share = amount / payers.length;
        payers.forEach(pid => {
            const idx = people.findIndex(p => p.id === pid);
            if (idx >= 0) personSubtotal[idx] += share;
        });
    });
    const totalSub = personSubtotal.reduce((a, b) => a + b, 0);
    
    const scEnabled = sett.serviceCharge.enabled;
    const scRate = scEnabled ? sett.serviceCharge.percent / 100 : 0;
    const personSC = personSubtotal.map(st => st * scRate);
    const personAfterSC = personSubtotal.map((st, i) => st + personSC[i]);
    const totalAfterSC = personAfterSC.reduce((a, b) => a + b, 0);
    
    let discountValue = Math.max(0, sett.discount.value); // ensure non-negative
    const discountType = sett.discount.type;
    const discountTiming = sett.discount.timing;
    const vatEnabled = sett.vat.enabled;
    const vatRate = vatEnabled ? sett.vat.percent / 100 : 0;
    
    let personFinal = new Array(people.length).fill(0);
    let personDiscount = new Array(people.length).fill(0);
    let personVAT = new Array(people.length).fill(0);
    let totalDiscountApplied = 0;
    let totalVAT = 0;
    
    function distributeDiscount(baseArray, discountAmount) {
        const totalBase = baseArray.reduce((a, b) => a + b, 0);
        if (totalBase === 0) return baseArray.map(() => 0);
        return baseArray.map(val => (val / totalBase) * discountAmount);
    }
    
    if (discountValue === 0) {
        for (let i = 0; i < people.length; i++) {
            let afterSC = personAfterSC[i];
            let vat = afterSC * vatRate;
            personVAT[i] = vat;
            personFinal[i] = afterSC + vat;
        }
        totalVAT = personVAT.reduce((a, b) => a + b, 0);
    } else {
        if (discountTiming === 'beforeSC') {
            let baseTotal = totalSub;
            let discountAmount = (discountType === 'percent') ? (discountValue / 100) * baseTotal : discountValue;
            let discPerPerson = distributeDiscount(personSubtotal, discountAmount);
            for (let i = 0; i < people.length; i++) {
                personDiscount[i] = discPerPerson[i];
                let afterDiscount = personSubtotal[i] - personDiscount[i];
                let afterSC = afterDiscount + personSC[i];
                let vat = afterSC * vatRate;
                personVAT[i] = vat;
                personFinal[i] = afterSC + vat;
            }
            totalDiscountApplied = discountAmount;
            totalVAT = personVAT.reduce((a, b) => a + b, 0);
        } 
        else if (discountTiming === 'beforeVAT') {
            let baseTotal = totalAfterSC;
            let discountAmount = (discountType === 'percent') ? (discountValue / 100) * baseTotal : discountValue;
            let discPerPerson = distributeDiscount(personAfterSC, discountAmount);
            for (let i = 0; i < people.length; i++) {
                personDiscount[i] = discPerPerson[i];
                let afterDiscount = personAfterSC[i] - personDiscount[i];
                let vat = afterDiscount * vatRate;
                personVAT[i] = vat;
                personFinal[i] = afterDiscount + vat;
            }
            totalDiscountApplied = discountAmount;
            totalVAT = personVAT.reduce((a, b) => a + b, 0);
        }
        else if (discountTiming === 'afterAll') {
            let afterSC = [...personAfterSC];
            let afterSCVAT = afterSC.map(x => x * (1 + vatRate));
            let baseTotal = afterSCVAT.reduce((a, b) => a + b, 0);
            let discountAmount = (discountType === 'percent') ? (discountValue / 100) * baseTotal : discountValue;
            let discPerPerson = distributeDiscount(afterSCVAT, discountAmount);
            for (let i = 0; i < people.length; i++) {
                personDiscount[i] = discPerPerson[i];
                personFinal[i] = afterSCVAT[i] - personDiscount[i];
                personVAT[i] = afterSC[i] * vatRate;
            }
            totalDiscountApplied = discountAmount;
            totalVAT = personVAT.reduce((a, b) => a + b, 0);
        }
    }
    
    const finalTotal = personFinal.reduce((a, b) => a + b, 0);
    const totalSC = personSC.reduce((a, b) => a + b, 0);
    
    return {
        personSubtotal, personSC, personAfterSC, personDiscount, personFinal, personVAT,
        finalTotal, subtotalRaw: totalSub, totalSC, totalDiscountApplied, totalVAT
    };
}

function updateSummary() {
    const d = computeDetailed();
    const people = invoiceData.people;
    const items = invoiceData.items;
    const sett = invoiceData.settings;
    const curr = invoiceData.currency;
    let receiptHtml = `<strong>📋 RECEIPT</strong><br>`;
    items.forEach(it => {
        let desc = it.description || "Item";
        let amt = it.amount.toFixed(2);
        receiptHtml += `${escapeHtml(desc)} ................ ${amt} ${it.currency || curr}<br>`;
    });
    receiptHtml += `────────────────────────<br>`;
    receiptHtml += `Subtotal ................ ${d.subtotalRaw.toFixed(2)} ${curr}<br>`;
    if(sett.serviceCharge.enabled) receiptHtml += `Service Charge (${sett.serviceCharge.percent}%) .. ${d.totalSC.toFixed(2)} ${curr}<br>`;
    if(sett.vat.enabled) receiptHtml += `VAT (${sett.vat.percent}%) ........... ${d.totalVAT.toFixed(2)} ${curr}<br>`;
    if(d.totalDiscountApplied > 0) receiptHtml += `Discount (${sett.discount.value}${sett.discount.type==='percent'?'%':curr}) ... -${d.totalDiscountApplied.toFixed(2)} ${curr}<br>`;
    receiptHtml += `────────────────────────<br>`;
    receiptHtml += `<strong>FINAL TOTAL: ${d.finalTotal.toFixed(2)} ${curr}</strong><br>`;
    document.getElementById("receiptView").innerHTML = receiptHtml;

    let sharesHtml = `<strong>🧾 PER PERSON SHARES</strong><br><br>`;
    for(let i=0;i<people.length;i++){
        sharesHtml += `<div style="margin-bottom:1rem; border-left:4px solid #6750a4; padding-left:0.8rem;">`;
        sharesHtml += `<strong>${escapeHtml(people[i].name)}</strong>  <strong>${d.personFinal[i].toFixed(2)} ${curr}</strong><br>`;
        sharesHtml += `&nbsp;&nbsp;• Subtotal: ${d.personSubtotal[i].toFixed(2)}<br>`;
        if(sett.serviceCharge.enabled) sharesHtml += `&nbsp;&nbsp;• Service Charge: ${d.personSC[i].toFixed(2)}<br>`;
        if(sett.vat.enabled) sharesHtml += `&nbsp;&nbsp;• VAT: ${d.personVAT[i].toFixed(2)}<br>`;
        if(d.personDiscount[i] !== 0) sharesHtml += `&nbsp;&nbsp;• Discount: -${d.personDiscount[i].toFixed(2)}<br>`;
        sharesHtml += `</div>`;
    }
    document.getElementById("sharesView").innerHTML = sharesHtml;
}

function escapeHtml(str) { return String(str).replace(/[&<>]/g, function(m){if(m==='&') return '&amp;'; if(m==='<') return '&lt;'; if(m==='>') return '&gt;'; return m;}); }

// ----- instant apply settings (with discount clamp) -----
function attachInstantSettings() {
    const scCheck = document.getElementById("enableSC");
    const scPercent = document.getElementById("scPercent");
    const vatCheck = document.getElementById("enableVAT");
    const vatPercent = document.getElementById("vatPercent");
    const discType = document.getElementById("discountType");
    const discValue = document.getElementById("discountValue");
    const timingBtns = document.querySelectorAll(".timing-btn");

    const updateFromUI = () => {
        invoiceData.settings.serviceCharge.enabled = scCheck.checked;
        invoiceData.settings.serviceCharge.percent = parseFloat(scPercent.value) || 0;
        invoiceData.settings.vat.enabled = vatCheck.checked;
        invoiceData.settings.vat.percent = parseFloat(vatPercent.value) || 0;
        invoiceData.settings.discount.type = discType.value;
        let discountVal = parseFloat(discValue.value) || 0;
        if (discountVal < 0) discountVal = 0;
        invoiceData.settings.discount.value = discountVal;
        discValue.value = discountVal;  // sync UI
        saveToLocal();
        updateBillTotalDisplay();
        updateSummary();
    };
    scCheck.addEventListener("change", updateFromUI);
    scPercent.addEventListener("input", updateFromUI);
    vatCheck.addEventListener("change", updateFromUI);
    vatPercent.addEventListener("input", updateFromUI);
    discType.addEventListener("change", updateFromUI);
    discValue.addEventListener("input", updateFromUI);
    timingBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            timingBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            invoiceData.settings.discount.timing = btn.dataset.timing;
            updateFromUI();
        });
    });
}

// ----- Reset current invoice -----
function resetCurrentInvoice() {
    if (confirm("Reset current invoice? All items, people, and settings will be cleared.")) {
        invoiceData.people = [{ id: 0, name: "1" }, { id: 1, name: "2" }];
        invoiceData.items = [];
        invoiceData.settings = {
            serviceCharge: { enabled: false, percent: 10 },
            vat: { enabled: false, percent: 7 },
            discount: { type: "amount", value: 0, timing: "afterAll" }
        };
        syncUIFromData();
        saveToLocal();
        updateBillTotalDisplay();
        updateSummary();
        if (document.getElementById("summaryTab").style.display !== 'none') updateSummary();
    }
}

// ----- History Modal with Flatpickr -----
let flatpickrInstance = null;
let selectedDateStr = null;

function getInvoicesByDate() {
    const all = JSON.parse(localStorage.getItem("fairshare_invoices") || "{}");
    const byDate = {};
    Object.values(all).forEach(inv => {
        const d = new Date(inv.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        if(!byDate[key]) byDate[key] = [];
        byDate[key].push(inv);
    });
    return byDate;
}

function refreshFlatpickrMarkers() {
    if (!flatpickrInstance) return;
    const byDate = getInvoicesByDate();
    const days = document.querySelectorAll('.flatpickr-day');
    days.forEach(day => {
        const dateAttr = day.dateObj;
        if (dateAttr) {
            const key = `${dateAttr.getFullYear()}-${String(dateAttr.getMonth()+1).padStart(2,'0')}-${String(dateAttr.getDate()).padStart(2,'0')}`;
            if (byDate[key]) {
                day.classList.add('has-invoice');
            } else {
                day.classList.remove('has-invoice');
            }
        }
    });
}

function initCalendar() {
    const container = document.getElementById("flatpickr-calendar");
    flatpickrInstance = flatpickr(container, {
        inline: true,
        dateFormat: "Y-m-d",
        onChange: function(selectedDates, dateStr, instance) {
            if (selectedDates.length) {
                selectedDateStr = dateStr;
                showInvoicesForDate(selectedDateStr);
            }
        },
        onReady: function() {
            refreshFlatpickrMarkers();
        },
        onMonthChange: function() {
            refreshFlatpickrMarkers();
        }
    });
}

function showInvoicesForDate(dateStr) {
    const container = document.getElementById("selectedDayInvoices");
    const byDate = getInvoicesByDate();
    const invoices = byDate[dateStr] || [];
    if(invoices.length === 0) { container.innerHTML = "<em>No invoices on this day</em>"; return; }
    let html = `<strong>📄 Invoices on ${dateStr}</strong><br>`;
    invoices.forEach(inv => {
        html += `<div class="invoice-list-item">
                    <span>${inv.name} (${formatInvoiceTimestamp(new Date(inv.createdAt))})</span>
                    <div>
                        <button class="text-btn load-invoice" data-id="${inv.id}">Load</button>
                        <button class="text-btn delete-invoice-from-list" data-id="${inv.id}" style="color:#b3261e;">Delete</button>
                    </div>
                 </div>`;
    });
    container.innerHTML = html;
    document.querySelectorAll(".load-invoice").forEach(btn => {
        btn.onclick = () => {
            const id = btn.dataset.id;
            loadInvoiceById(id);
            document.getElementById("historyModal").classList.add("hidden");
        };
    });
    document.querySelectorAll(".delete-invoice-from-list").forEach(btn => {
        btn.onclick = () => {
            const id = btn.dataset.id;
            if(confirm("Delete this invoice permanently?")) {
                deleteInvoiceById(id);
                refreshFlatpickrMarkers();
                if (selectedDateStr) showInvoicesForDate(selectedDateStr);
                else showInvoicesForDate(dateStr);
            }
        };
    });
}

function loadInvoiceById(id) {
    const all = JSON.parse(localStorage.getItem("fairshare_invoices") || "{}");
    if(all[id]) {
        currentInvoiceId = id;
        invoiceData = JSON.parse(JSON.stringify(all[id]));
        invoiceData.createdAt = new Date(invoiceData.createdAt);
        syncUIFromData();
        saveToLocal();
        document.querySelector('.tab-btn[data-tab="invoice"]').click();
    }
}

function deleteInvoiceById(id) {
    const all = JSON.parse(localStorage.getItem("fairshare_invoices") || "{}");
    delete all[id];
    localStorage.setItem("fairshare_invoices", JSON.stringify(all));
    if(currentInvoiceId === id) {
        const ids = Object.keys(all);
        if(ids.length > 0) loadInvoiceById(ids[0]);
        else {
            const lastCurrency = localStorage.getItem("fairshare_last_currency");
            currentInvoiceId = "inv_" + Date.now();
            invoiceData = { 
                id: currentInvoiceId, 
                name: "#1", 
                createdAt: new Date(), 
                currency: (lastCurrency && CURRENCIES.includes(lastCurrency)) ? lastCurrency : "USD", 
                people: [{id:0,name:"1"},{id:1,name:"2"}], 
                items: [], 
                settings: { serviceCharge:{enabled:false,percent:10}, vat:{enabled:false,percent:7}, discount:{type:"amount",value:0,timing:"afterAll"} } 
            };
            syncUIFromData();
            saveToLocal();
        }
    }
    refreshFlatpickrMarkers();
    if (selectedDateStr) showInvoicesForDate(selectedDateStr);
}

// ----- Event listeners -----
document.getElementById("peopleCount").addEventListener("change", () => { updatePeopleFromCount(); saveToLocal(); renderItems(); updateBillTotalDisplay(); updateSummary(); });
document.getElementById("globalCurrencySelect").addEventListener("change", (e) => { 
    invoiceData.currency = e.target.value; 
    saveToLocal();
    updateBillTotalDisplay(); 
    updateSummary(); 
});
document.getElementById("editNamesBtn").onclick = () => {
    let newNames = prompt("Edit names (comma separated)", invoiceData.people.map(p=>p.name).join(","));
    if(newNames){
        let parts = newNames.split(",").map(s=>s.trim());
        for(let i=0;i<invoiceData.people.length && i<parts.length;i++) invoiceData.people[i].name = parts[i] || String(i+1);
        renderItems();
        saveToLocal();
        updateSummary();
    }
};
document.getElementById("editInvoiceNameBtn").onclick = () => {
    let newName = prompt("Edit invoice name (e.g., #1, Dinner)", invoiceData.name);
    if(newName) { invoiceData.name = newName; updateInvoiceTitleDisplay(); saveToLocal(); }
};
document.getElementById("resetInvoiceBtn").addEventListener("click", resetCurrentInvoice);

document.getElementById("newBillBtn").onclick = () => {
    if(confirm("Create new bill? Current will be saved.")){
        const newId = "inv_" + Date.now();
        const newData = JSON.parse(JSON.stringify(invoiceData));
        newData.id = newId;
        newData.name = "#" + (Object.keys(JSON.parse(localStorage.getItem("fairshare_invoices")||"{}")).length+1);
        newData.createdAt = new Date();
        newData.items = [];
        newData.people = invoiceData.people.map((p,i)=>({id:i, name:String(i+1)}));
        const lastCurrency = localStorage.getItem("fairshare_last_currency");
        newData.currency = (lastCurrency && CURRENCIES.includes(lastCurrency)) ? lastCurrency : "USD";
        newData.settings = { serviceCharge:{enabled:false,percent:10}, vat:{enabled:false,percent:7}, discount:{type:"amount",value:0,timing:"afterAll"} };
        let all = JSON.parse(localStorage.getItem("fairshare_invoices") || "{}");
        all[newId] = newData;
        localStorage.setItem("fairshare_invoices", JSON.stringify(all));
        currentInvoiceId = newId;
        invoiceData = newData;
        syncUIFromData();
        saveToLocal();
    }
};
document.getElementById("historyBtn").onclick = () => {
    selectedDateStr = null;
    if (!flatpickrInstance) initCalendar();
    else refreshFlatpickrMarkers();
    document.getElementById("historyModal").classList.remove("hidden");
    document.getElementById("selectedDayInvoices").innerHTML = "";
};
document.getElementById("closeHistoryBtn").onclick = () => document.getElementById("historyModal").classList.add("hidden");
document.getElementById("deleteSelectedInvoiceBtn").onclick = () => {
    if(selectedDateStr) {
        const byDate = getInvoicesByDate();
        if(byDate[selectedDateStr] && byDate[selectedDateStr].length) {
            if(confirm(`Delete ALL invoices on ${selectedDateStr}?`)){
                const ids = byDate[selectedDateStr].map(inv => inv.id);
                ids.forEach(id => deleteInvoiceById(id));
                refreshFlatpickrMarkers();
                showInvoicesForDate(selectedDateStr);
            }
        } else alert("No invoices on selected date");
    } else alert("Select a date first");
};
document.getElementById("printSummaryBtn").onclick = () => window.print();
document.getElementById("exportCsvBtn").onclick = () => {
    let d = computeDetailed();
    let rows = [["Person","Total","Subtotal","SC","Discount","VAT"]];
    invoiceData.people.forEach((p,i)=> rows.push([p.name, d.personFinal[i].toFixed(2), d.personSubtotal[i].toFixed(2), d.personSC[i].toFixed(2), d.personDiscount[i].toFixed(2), d.personVAT[i].toFixed(2)]));
    let csv = rows.map(r => r.join(",")).join("\n");
    let blob = new Blob([csv], {type:"text/csv"});
    let a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `fairshare_${invoiceData.name}.csv`; a.click();
};
// Tabs
document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll(".tab-btn").forEach(b=>b.classList.remove("active"));
        btn.classList.add("active");
        const tab = btn.dataset.tab;
        document.getElementById("invoiceTab").style.display = tab === "invoice" ? "block" : "none";
        document.getElementById("summaryTab").style.display = tab === "summary" ? "block" : "none";
        if(tab === "summary") updateSummary();
        else updateBillTotalDisplay();
        saveToLocal();
    };
});
// Final startup
loadFromLocal();
attachInstantSettings();
updateBillTotalDisplay();
updateSummary();