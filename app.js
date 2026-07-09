// ─── XSS 방지 HTML 이스케이프 함수 ───
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ─── Congressional Award 전체 레벨 요건 ───
const REQUIREMENTS = {
    'Bronze Certificate': {
        vps: { hours: 30,  months: 0 },
        pd:  { hours: 15,  months: 0 },
        pf:  { hours: 15,  months: 0 },
        exp: { days: 1, nights: 0 }
    },
    'Silver Certificate': {
        vps: { hours: 60,  months: 0 },
        pd:  { hours: 30,  months: 0 },
        pf:  { hours: 30,  months: 0 },
        exp: { days: 2, nights: 0 }
    },
    'Gold Certificate': {
        vps: { hours: 90,  months: 6 },
        pd:  { hours: 45,  months: 6 },
        pf:  { hours: 45,  months: 6 },
        exp: { days: 3, nights: 0 }
    },
    'Bronze Medal': {
        vps: { hours: 100, months: 7 },
        pd:  { hours: 50,  months: 7 },
        pf:  { hours: 50,  months: 7 },
        exp: { days: 2, nights: 1 }
    },
    'Silver Medal': {
        vps: { hours: 200, months: 12 },
        pd:  { hours: 100, months: 12 },
        pf:  { hours: 100, months: 12 },
        exp: { days: 3, nights: 2 }
    },
    'Gold Medal': {
        vps: { hours: 400, months: 24 },
        pd:  { hours: 200, months: 24 },
        pf:  { hours: 200, months: 24 },
        exp: { days: 5, nights: 4 }
    }
};

// ─── 전역 상태 ───
let selectedLevel       = localStorage.getItem('selectedLevel') || '';
let currentCategory     = '';
let currentGoalIndex    = -1;
let currentActivityIndex= -1;
let editingLogIndex     = -1;   // 수정 중인 log 인덱스 (-1 = 신규)

// ── 안전한 JSON 파싱 (손상된 localStorage crash 방지) ──
function safeJsonParse(key, fallback) {
    try {
        var raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch(e) {
        console.warn('[Award Compass] localStorage parse error for "' + key + '" — reset to default:', e);
        localStorage.removeItem(key);
        return fallback;
    }
}

// 이전 수상 기록 (수기 입력)
let priorAwards = safeJsonParse('priorAwards', {});

// ─── 데이터 구조 ───
// goals[category] = [{
//   name, validator, email,
//   activityTypes: [{ name, logs: [{ date, hours, note }] }]
// }]
let goals = safeJsonParse('goals', {
    'Voluntary Public Service': [],
    'Personal Development':     [],
    'Physical Fitness':         [],
    'Expedition':               []
});

// ─── 유틸 ───
const CATS = ['Voluntary Public Service','Personal Development','Physical Fitness','Expedition'];
const CAT_KEYS = {
    'Voluntary Public Service': 'vps',
    'Personal Development':     'pd',
    'Physical Fitness':         'pf',
    'Expedition':               'exp'
};

function save() {
    localStorage.setItem('goals', JSON.stringify(goals));
    if (window.FB && window.FB.getCurrentUid()) syncToFirestore();
}

function today() {
    let d = new Date();
    let yyyy = d.getFullYear();
    let mm   = String(d.getMonth() + 1).padStart(2, '0');
    let dd   = String(d.getDate()).padStart(2, '0');
    return yyyy + '-' + mm + '-' + dd;
}


// ════════════════════════════════════════════
// EXPEDITION — Trip 기록
// ════════════════════════════════════════════

// 데이터 구조:
// expTrips = [{
//   location, startDate, endDate,
//   totalDays, travelDays, countableDays, nights(자동),
//   validatorEmail,
//   dayLogs: [{ date, isTravel, activities: [{startTime,endTime,hours,description}] }]
// }]

let expTrips       = safeJsonParse('expTrips', []);
let currentTripIdx = -1;
let currentDayIdx  = -1;
let editingTripIdx = -1;
let editingActIdx  = -1;

function saveExpTrips() {
    localStorage.setItem('expTrips', JSON.stringify(expTrips));
    if (window.FB && window.FB.getCurrentUid()) syncToFirestore();
}

// ── Trip 날짜 자동계산 ──
function calcTripDays() {
    let start      = document.getElementById('trip-start').value;
    let end        = document.getElementById('trip-end').value;
    let travelDays = parseInt(document.getElementById('trip-travel-days').value) || 0;

    if (start && end && end >= start) {
        let diff         = Math.round((new Date(end + 'T12:00:00') - new Date(start + 'T12:00:00')) / (1000*60*60*24));
        let totalDays    = diff + 1;
        let countable    = Math.max(totalDays - travelDays, 0);
        // nights 자동계산: countable days - 1
        let nights       = Math.max(countable - 1, 0);

        document.getElementById('trip-days-calc').textContent =
            totalDays + ' total days → ' + countable + ' countable days / ' + nights + ' nights';
        document.getElementById('trip-days-calc').style.display = 'block';
        document.getElementById('trip-nights-display').textContent = nights;
    } else {
        document.getElementById('trip-days-calc').style.display = 'none';
        document.getElementById('trip-nights-display').textContent = '—';
    }
}

// ── Trip 모달 ──
function openTripModal(editIdx) {
    editingTripIdx = (editIdx !== undefined) ? Number(editIdx) : -1;
    document.getElementById('trip-modal-title').textContent =
        editingTripIdx >= 0 ? 'Edit Trip' : 'Add Trip';

    if (editingTripIdx >= 0) {
        let t = expTrips[editingTripIdx];
        document.getElementById('trip-location').value    = t.location       || '';
        document.getElementById('trip-start').value       = t.startDate      || '';
        document.getElementById('trip-end').value         = t.endDate        || '';
        document.getElementById('trip-travel-days').value = t.travelDays     || 0;
        document.getElementById('trip-validator').value   = t.validatorEmail || '';
        calcTripDays();
    } else {
        document.getElementById('trip-location').value    = '';
        document.getElementById('trip-start').value       = '';
        document.getElementById('trip-end').value         = '';
        document.getElementById('trip-travel-days').value = 0;
        document.getElementById('trip-validator').value   = '';
        document.getElementById('trip-days-calc').style.display  = 'none';
        document.getElementById('trip-nights-display').textContent = '—';
    }
    document.getElementById('trip-modal').style.display = 'flex';
}

function closeTripModal() {
    document.getElementById('trip-modal').style.display = 'none';
    editingTripIdx = -1;
}

function saveTrip() {
    let location       = document.getElementById('trip-location').value.trim();
    let startDate      = document.getElementById('trip-start').value;
    let endDate        = document.getElementById('trip-end').value;
    let travelDays     = parseInt(document.getElementById('trip-travel-days').value) || 0;
    let validatorEmail = document.getElementById('trip-validator').value.trim();

    if (!location)  { alert('Please enter a location!');    return; }
    if (!startDate) { alert('Please select a start date!'); return; }
    if (!endDate)   { alert('Please select an end date!');  return; }
    if (endDate < startDate) { alert('End date must be after start date!'); return; }

    // 5. Expedition start date 체크
    let programStart = localStorage.getItem('startDate');
    if (programStart && startDate < programStart) {
        alert('Trip date cannot be before your program start date (' + programStart + ')!');
        return;
    }

    let diff         = Math.round((new Date(endDate + 'T12:00:00') - new Date(startDate + 'T12:00:00')) / (1000*60*60*24));
    let totalDays    = diff + 1;
    let countable    = Math.max(totalDays - travelDays, 0);
    let nights       = Math.max(countable - 1, 0);

    // 기존 dayLogs 유지
    let existingDayLogs = (editingTripIdx >= 0 && expTrips[editingTripIdx])
        ? expTrips[editingTripIdx].dayLogs : [];

    // dayLogs 생성 (첫날/마지막날 travel days면 isTravel=true)
    let dayLogs = [];
    for (let i = 0; i < totalDays; i++) {
        let d = new Date(startDate + 'T12:00:00');
        d.setDate(d.getDate() + i);
        let dateStr  = d.getFullYear() + '-'
            + String(d.getMonth()+1).padStart(2,'0') + '-'
            + String(d.getDate()).padStart(2,'0');
        // 첫날/마지막날을 travel day로 마킹 (travelDays >= 2면 둘 다, 1이면 첫날만)
        let isTravel = false;
        if (travelDays >= 1 && i === 0)              isTravel = true;
        if (travelDays >= 2 && i === totalDays - 1)  isTravel = true;

        let existing = existingDayLogs.find(function(dl){ return dl.date === dateStr; });
        dayLogs.push(existing
            ? Object.assign({}, existing, { isTravel: isTravel })
            : { date: dateStr, isTravel: isTravel, activities: [] });
    }

    let tripData = {
        location, startDate, endDate,
        totalDays, travelDays, countableDays: countable, nights,
        validatorEmail, dayLogs
    };

    if (editingTripIdx >= 0) {
        expTrips[editingTripIdx] = tripData;
    } else {
        expTrips.push(tripData);
    }

    saveExpTrips();
    renderExpedition();
    updateDisplay('Expedition');
    closeTripModal();
}

function deleteTrip(idx) {
    if (confirm('Delete this trip and all daily logs?')) {
        expTrips.splice(idx, 1);
        saveExpTrips();
        renderExpedition();
        updateDisplay('Expedition');
    }
}

// ── Activity 모달 ──
function openActivityModal(tripIdx, dayIdx, actIdx) {
    currentTripIdx = Number(tripIdx);
    currentDayIdx  = Number(dayIdx);
    editingActIdx  = (actIdx !== undefined) ? Number(actIdx) : -1;

    let day = expTrips[tripIdx].dayLogs[dayIdx];
    document.getElementById('act-modal-title').textContent =
        (editingActIdx >= 0 ? 'Edit Activity' : 'Add Activity') +
        ' — Day ' + (dayIdx+1) + ' (' + day.date + ')';

    if (editingActIdx >= 0) {
        let a = day.activities[editingActIdx];
        document.getElementById('act-start-time').value  = a.startTime   || '';
        document.getElementById('act-end-time').value    = a.endTime     || '';
        document.getElementById('act-description').value = a.description || '';
    } else {
        document.getElementById('act-start-time').value  = '';
        document.getElementById('act-end-time').value    = '';
        document.getElementById('act-description').value = '';
    }
    calcActivityHours();
    document.getElementById('act-modal').style.display = 'flex';
}

function closeActivityModal() {
    document.getElementById('act-modal').style.display = 'none';
    currentTripIdx = -1; currentDayIdx = -1; editingActIdx = -1;
}

function calcActivityHours() {
    let start = document.getElementById('act-start-time').value;
    let end   = document.getElementById('act-end-time').value;
    if (start && end) {
        let [sh,sm] = start.split(':').map(Number);
        let [eh,em] = end.split(':').map(Number);
        let mins = (eh*60+em) - (sh*60+sm);
        if (mins <= 0) {
            document.getElementById('act-hours-calc').textContent = '⚠️ End time must be after start time';
            document.getElementById('act-hours-calc').style.display = 'block';
            document.getElementById('act-hours-calc').style.color = '#c0392b';
            return 0;
        }
        let hrs = (mins/60).toFixed(1);
        document.getElementById('act-hours-calc').textContent = hrs + ' hrs';
        document.getElementById('act-hours-calc').style.display = 'block';
        document.getElementById('act-hours-calc').style.color = '#1a3a6b';
        return parseFloat(hrs);
    }
    document.getElementById('act-hours-calc').style.display = 'none';
    return 0;
}

function saveActivity() {
    let startTime   = document.getElementById('act-start-time').value;
    let endTime     = document.getElementById('act-end-time').value;
    let description = document.getElementById('act-description').value.trim();

    if (!startTime)   { alert('Please enter start time!');      return; }
    if (!endTime)     { alert('Please enter end time!');        return; }
    if (!description) { alert('Please describe the activity!'); return; }

    let hours = calcActivityHours();
    if (hours <= 0) { alert('End time must be after start time!'); return; }

    // 하루 8시간 합산 초과 차단 (공식 룰)
    var actDate = expTrips[currentTripIdx] && expTrips[currentTripIdx].dayLogs[currentDayIdx]
        ? expTrips[currentTripIdx].dayLogs[currentDayIdx].date : null;
    if (actDate) {
        var dayTotal = 0;
        expTrips[currentTripIdx].dayLogs[currentDayIdx].activities.forEach(function(a, i) {
            if (i !== editingActIdx) dayTotal += a.hours;
        });
        if (dayTotal + hours > 8) {
            alert('Total hours for Day ' + (currentDayIdx+1) + ' would exceed 8 hours (' +
                dayTotal.toFixed(1) + ' hrs already logged). Please adjust.');
            return;
        }
    }

    let actData = { startTime, endTime, hours, description };
    let acts    = expTrips[currentTripIdx].dayLogs[currentDayIdx].activities;
    if (editingActIdx >= 0) {
        acts[editingActIdx] = actData;
    } else {
        acts.push(actData);
    }
    saveExpTrips();
    renderExpedition();
    updateDisplay('Expedition');
    closeActivityModal();
}

function deleteActivity(tripIdx, dayIdx, actIdx) {
    if (confirm('Delete this activity?')) {
        expTrips[tripIdx].dayLogs[dayIdx].activities.splice(actIdx, 1);
        saveExpTrips();
        renderExpedition();
        updateDisplay('Expedition');
    }
}

// ── Expedition 렌더링 ──
function renderExpedition() {
    let container = document.getElementById('exp-trips-list');
    if (!container) return;
    container.innerHTML = '';

    expTrips.forEach(function(trip, tIdx) {
        let totalHours = 0;
        trip.dayLogs.forEach(function(day) {
            day.activities.forEach(function(a) { totalHours += a.hours; });
        });

        let dayLogsHtml = '';
        trip.dayLogs.forEach(function(day, dIdx) {
            let dayHours   = day.activities.reduce(function(s,a){ return s+a.hours; }, 0);
            let travelBadge = day.isTravel
                ? '<span class="travel-badge">✈️ Travel Day</span>' : '';
            let travelNote = day.isTravel
                ? '<p class="travel-note">⚠️ Travel days may not count toward requirements. Please confirm with your advisor.</p>'
                : '';

            let activitiesHtml = '';
            day.activities.forEach(function(act, aIdx) {
                activitiesHtml += `
                    <div class="exp-activity">
                        <div class="exp-act-header">
                            <span class="exp-act-time">${escapeHtml(act.startTime)} – ${escapeHtml(act.endTime)}</span>
                            <span class="exp-act-hours">${act.hours} hrs</span>
                            <div class="exp-act-btns">
                                <button class="icon-btn edit-btn" onclick="openActivityModal(${tIdx},${dIdx},${aIdx})">✏️</button>
                                <button class="icon-btn delete-btn" onclick="deleteActivity(${tIdx},${dIdx},${aIdx})">🗑️</button>
                            </div>
                        </div>
                        <p class="exp-act-desc">${escapeHtml(act.description)}</p>
                    </div>`;
            });

            dayLogsHtml += `
                <div class="exp-day-card${day.isTravel ? ' travel-day' : ''}">
                    <div class="exp-day-header" onclick="toggleExpDay('exp-day-body-${tIdx}-${dIdx}', this)">
                        <span class="exp-day-title">Day ${dIdx+1} — ${day.date} ${travelBadge}</span>
                        <span class="exp-day-hours">${dayHours > 0 ? dayHours+' hrs' : '—'}</span>
                        <span class="exp-day-toggle">▲</span>
                    </div>
                    <div class="exp-day-body" id="exp-day-body-${tIdx}-${dIdx}" style="display:block">
                        ${travelNote}
                        ${activitiesHtml || '<p class="no-logs">No activities yet.</p>'}
                        <button class="add-btn exp-add-act-btn" onclick="openActivityModal(${tIdx},${dIdx})">+ Add Activity</button>
                    </div>
                </div>`;
        });

        let div = document.createElement('div');
        div.className = 'trip-card';
        div.innerHTML = `
            <div class="trip-header">
                <div class="trip-header-left">
                    <p class="trip-location">📍 ${escapeHtml(trip.location)}</p>
                    <p class="trip-dates">${escapeHtml(trip.startDate)} → ${escapeHtml(trip.endDate)}</p>
                    <p class="trip-stats">
                        ${trip.totalDays} total days
                        / <strong>${trip.countableDays} countable</strong>
                        / ${trip.nights} nights
                        ${trip.travelDays > 0 ? ' ('+trip.travelDays+' travel days excluded)' : ''}
                    </p>
                    ${trip.validatorEmail ? '<p class="trip-validator">✉️ '+escapeHtml(trip.validatorEmail)+'</p>' : ''}
                </div>
                <div class="trip-header-right">
                    <button class="icon-btn edit-btn" onclick="openTripModal(${tIdx})">✏️</button>
                    <button class="icon-btn delete-btn" onclick="deleteTrip(${tIdx})">🗑️</button>
                </div>
            </div>
            <div class="exp-days-container">${dayLogsHtml}</div>`;
        container.appendChild(div);
    });
}

function toggleExpDay(bodyId, headerEl) {
    let body = document.getElementById(bodyId);
    if (!body) return;
    let isOpen = body.style.display !== 'none';
    body.style.display = isOpen ? 'none' : 'block';
    let toggle = headerEl.querySelector('.exp-day-toggle');
    if (toggle) toggle.textContent = isOpen ? '▼' : '▲';
}

// ════════════════════════════════════════════
// GOAL 모달
// ════════════════════════════════════════════

function openGoalModal(category, editIndex) {
    currentCategory  = category;
    currentGoalIndex = (editIndex !== undefined) ? editIndex : -1;

    if (currentGoalIndex >= 0) {
        // 수정 모드
        let g = goals[category][currentGoalIndex];
        document.getElementById('goal-modal-title').textContent = 'Edit Goal';
        document.getElementById('goal-name').value            = g.name;
        document.getElementById('goal-validator').value       = g.validator || '';
        document.getElementById('goal-validator-email').value = g.email    || '';
        var npCb = document.getElementById('goal-nonprofit');
        if (npCb) npCb.checked = !!g.isNonProfit;
        var npUrl = document.getElementById('goal-org-url');
        if (npUrl) npUrl.value = g.orgUrl || '';
    } else {
        // 신규 모드
        document.getElementById('goal-modal-title').textContent = 'Add Goal — ' + category;
        document.getElementById('goal-name').value            = '';
        document.getElementById('goal-validator').value       = '';
        document.getElementById('goal-validator-email').value = '';
        var npCb = document.getElementById('goal-nonprofit');
        if (npCb) npCb.checked = false;
        var npUrl = document.getElementById('goal-org-url');
        if (npUrl) npUrl.value = '';
    }
    // VPS일 때만 501(c)(3) 필드 표시
    var nonprofitRow = document.getElementById('goal-nonprofit-row');
    if (nonprofitRow) {
        nonprofitRow.style.display = (category === 'Voluntary Public Service') ? 'block' : 'none';
    }
    document.getElementById('goal-modal').style.display = 'flex';
}

function closeGoalModal() {
    document.getElementById('goal-modal').style.display = 'none';
    currentGoalIndex = -1;
}

function saveGoal() {
    let name      = document.getElementById('goal-name').value.trim();
    let validator = document.getElementById('goal-validator').value.trim();
    let email     = document.getElementById('goal-validator-email').value.trim();
    let isNonProfit = !!(document.getElementById('goal-nonprofit') && document.getElementById('goal-nonprofit').checked);
    let orgUrl    = (document.getElementById('goal-org-url') && document.getElementById('goal-org-url').value.trim()) || '';

    if (!name) { alert('Please enter a goal name!'); return; }

    if (currentGoalIndex >= 0) {
        // 수정
        goals[currentCategory][currentGoalIndex].name      = name;
        goals[currentCategory][currentGoalIndex].validator = validator;
        goals[currentCategory][currentGoalIndex].email     = email;
        goals[currentCategory][currentGoalIndex].isNonProfit = isNonProfit;
        goals[currentCategory][currentGoalIndex].orgUrl    = orgUrl;
    } else {
        // 신규 — 개수 제한 체크
        const maxGoals = { 'Voluntary Public Service':4, 'Personal Development':2, 'Physical Fitness':2, 'Expedition':1 };
        if (goals[currentCategory].length >= maxGoals[currentCategory]) {
            alert('Maximum ' + maxGoals[currentCategory] + ' goals allowed for ' + currentCategory + '!');
            closeGoalModal();
            return;
        }
        goals[currentCategory].push({ name, validator, email, isNonProfit, orgUrl, activityTypes: [] });
    }

    save();
    renderGoals(currentCategory);
    updateDisplay(currentCategory);
    closeGoalModal();
}

function deleteGoal(category, index) {
    if (confirm('Delete this goal and all activity types inside?')) {
        goals[category].splice(index, 1);
        save();
        renderGoals(category);
        updateDisplay(category);
    }
}

// ════════════════════════════════════════════
// ACTIVITY TYPE 모달
// ════════════════════════════════════════════

function openActivityTypeModal(category, goalIndex, editActIndex) {
    currentCategory      = category;
    currentGoalIndex     = goalIndex;
    currentActivityIndex = (editActIndex !== undefined) ? editActIndex : -1;

    if (currentActivityIndex >= 0) {
        // 수정 모드
        let actName = goals[category][goalIndex].activityTypes[currentActivityIndex].name;
        document.getElementById('act-type-modal-title').textContent = 'Edit Activity Type';
        document.getElementById('act-type-name').value = actName;
    } else {
        // 신규 모드
        let goalName = goals[category][goalIndex].name;
        document.getElementById('act-type-modal-title').textContent = 'Add Activity Type — ' + goalName;
        document.getElementById('act-type-name').value = '';
    }
    document.getElementById('act-type-modal').style.display = 'flex';
}

function closeActivityTypeModal() {
    document.getElementById('act-type-modal').style.display = 'none';
    currentActivityIndex = -1;
}

function saveActivityType() {
    let name = document.getElementById('act-type-name').value.trim();
    if (!name) { alert('Please enter an activity type name!'); return; }

    if (currentActivityIndex >= 0) {
        // 수정
        goals[currentCategory][currentGoalIndex].activityTypes[currentActivityIndex].name = name;
    } else {
        // 신규
        goals[currentCategory][currentGoalIndex].activityTypes.push({ name, logs: [] });
    }

    save();
    renderGoals(currentCategory);
    closeActivityTypeModal();
}

function deleteActivityType(category, goalIndex, actIndex) {
    if (confirm('Delete this activity type and all its logs?')) {
        goals[category][goalIndex].activityTypes.splice(actIndex, 1);
        save();
        renderGoals(category);
        updateDisplay(category);
    }
}

// ════════════════════════════════════════════
// LOG 모달 (신규 + 수정 통합)
// ════════════════════════════════════════════

function openLogModal(category, goalIndex, actIndex, editLogIdx) {
    currentCategory      = category;
    currentGoalIndex     = goalIndex;
    currentActivityIndex = actIndex;
    editingLogIndex      = (editLogIdx !== undefined) ? editLogIdx : -1;

    if (editingLogIndex >= 0) {
        // 수정 모드
        let log = goals[category][goalIndex].activityTypes[actIndex].logs[editingLogIndex];
        document.getElementById('log-modal-title').textContent = 'Edit Log';
        document.getElementById('log-date').value  = log.date;
        document.getElementById('log-hours').value = log.hours;
        document.getElementById('log-note').value  = log.note || '';
        var indirectCb = document.getElementById('log-indirect');
        if (indirectCb) indirectCb.checked = !!log.isIndirect;
    } else {
        // 신규 모드
        let actName = goals[category][goalIndex].activityTypes[actIndex].name;
        document.getElementById('log-modal-title').textContent = 'Add Log — ' + actName;
        document.getElementById('log-date').value  = '';
        document.getElementById('log-hours').value = '';
        document.getElementById('log-note').value  = '';
        var indirectCb = document.getElementById('log-indirect');
        if (indirectCb) indirectCb.checked = false;
    }
    // VPS일 때만 간접봉사 체크박스 표시
    var indirectRow = document.getElementById('log-indirect-row');
    if (indirectRow) {
        indirectRow.style.display = (category === 'Voluntary Public Service') ? 'flex' : 'none';
    }
    document.getElementById('log-modal').style.display = 'flex';
}

function closeLogModal() {
    document.getElementById('log-modal').style.display = 'none';
    currentActivityIndex = -1;
    currentGoalIndex     = -1;
    editingLogIndex      = -1;
}

function saveLog() {
    let date  = document.getElementById('log-date').value;
    let hours = parseFloat(document.getElementById('log-hours').value);
    let note  = document.getElementById('log-note').value.trim();

    // ── 유효성 검사 ──
    if (!date)  { alert('Please select a date!'); return; }
    if (isNaN(hours) || hours <= 0) { alert('Please enter valid hours (0.5 – 8)!'); return; }
    if (hours > 8) { alert('Maximum 8 hours per day allowed!'); return; }

    // startDate와 같은 날은 허용 (< 만 차단, <= 아님)
    let startDate = localStorage.getItem('startDate');
    if (startDate && date < startDate) {
        alert('Date cannot be before your start date (' + startDate + ')!');
        return;
    }

    // 미래 날짜 차단 (오늘 이후 불허)
    if (date > today()) {
        alert('Future dates are not allowed!');
        return;
    }

    let logs = goals[currentCategory][currentGoalIndex].activityTypes[currentActivityIndex].logs;

    // 같은 날 모든 카테고리 합산 8시간 초과 차단 (공식 룰)
    var dailyTotal = 0;
    var allCats = ['Voluntary Public Service', 'Personal Development', 'Physical Fitness'];
    allCats.forEach(function(cat) {
        goals[cat].forEach(function(goal) {
            goal.activityTypes.forEach(function(act) {
                act.logs.forEach(function(log, idx) {
                    if (log.date === date) {
                        // 편집 중인 로그는 제외 (자기 자신)
                        var isSelf = (cat === currentCategory &&
                            goals[cat].indexOf(goals[cat][currentGoalIndex]) === goals[cat].indexOf(goal) &&
                            goal.activityTypes.indexOf(act) === currentActivityIndex &&
                            idx === editingLogIndex);
                        if (!isSelf) dailyTotal += log.hours;
                    }
                });
            });
        });
    });
    if (dailyTotal + hours > 8) {
        alert('Total hours for ' + date + ' would exceed 8 hours (' +
            dailyTotal.toFixed(1) + ' hrs already logged across all sections). Please adjust.');
        return;
    }

    let isIndirect = (currentCategory === 'Voluntary Public Service') &&
        !!(document.getElementById('log-indirect') && document.getElementById('log-indirect').checked);

    if (editingLogIndex >= 0) {
        // 수정 — 편집 시 알림 없음
        logs[editingLogIndex] = { date, hours, note, isIndirect };
    } else {
        // 신규
        logs.push({ date, hours, note, isIndirect });
        checkCompletion(currentCategory);
    }

    save();
    renderGoals(currentCategory);
    updateDisplay(currentCategory);
    closeLogModal();
}

function deleteLog(category, goalIndex, actIndex, logIndex) {
    if (confirm('Delete this log entry?')) {
        goals[category][goalIndex].activityTypes[actIndex].logs.splice(logIndex, 1);
        save();
        renderGoals(category);
        updateDisplay(category);
    }
}


// ── 100% 달성 축하 알림 (신규 추가 시에만, 처음 달성 순간만) ──
function checkCompletion(category) {
    if (!selectedLevel) return;
    let req        = REQUIREMENTS[selectedLevel];
    let sectionKey = CAT_KEYS[category];
    let total      = 0;

    if (sectionKey === 'exp') {
        var prevDays = 0;
        expTrips.forEach(function(t, i) {
            if (i < expTrips.length - 1) prevDays += (t.countableDays || 0);
        });
        expTrips.forEach(function(t) { total += (t.countableDays || 0); });
        // 처음 달성 순간만 알림
        if (total >= req.exp.days && prevDays < req.exp.days) {
            setTimeout(function() {
                alert('🎉 Congratulations! You completed Expedition & Exploration (' + req.exp.days + ' days)!');
            }, 300);
        }
    } else {
        goals[category].forEach(function(goal) {
            goal.activityTypes.forEach(function(act) {
                act.logs.forEach(function(log) { total += log.hours; });
            });
        });
        let target     = req[sectionKey].hours;
        let addedHours = parseFloat(document.getElementById('log-hours') ? document.getElementById('log-hours').value || 0 : 0);
        let prevTotal  = total - addedHours;
        // 이 log로 인해 처음 목표 달성할 때만 알림 (prevTotal이 0인 첫 로그도 포함)
        if (total >= target && prevTotal < target) {
            setTimeout(function() {
                alert('🎉 Congratulations! You completed ' + category + ' (' + target + ' hrs)!');
            }, 300);
        }
    }
}

// ════════════════════════════════════════════
// 화면 업데이트
// ════════════════════════════════════════════

function updateDisplay(category) {
    let totalHours = 0;
    var monthHours = {};  // 월별 시간 합산 (1시간 이상인 달만 카운트)

    var indirectHours = 0;
    goals[category].forEach(function(goal) {
        goal.activityTypes.forEach(function(act) {
            act.logs.forEach(function(log) {
                totalHours += log.hours;
                if (log.isIndirect) indirectHours += log.hours;
                var m = log.date.substring(0, 7);
                monthHours[m] = (monthHours[m] || 0) + log.hours;
            });
        });
    });

    // VPS 간접봉사 25% 제한 경고 표시
    if (category === 'Voluntary Public Service') {
        var indirectWarn = document.getElementById('vps-indirect-warn');
        if (indirectWarn) {
            var maxIndirect = totalHours * 0.25;
            if (indirectHours > 0) {
                var pct = totalHours > 0 ? Math.round((indirectHours / totalHours) * 100) : 0;
                indirectWarn.textContent = 'Indirect: ' + indirectHours.toFixed(1) + ' hrs (' + pct + '% of total)' +
                    (indirectHours > maxIndirect ? ' ⚠️ Exceeds 25% limit!' : ' ✓');
                indirectWarn.style.color = indirectHours > maxIndirect ? '#e53e3e' : '#2d7a2d';
                indirectWarn.style.display = 'block';
            } else {
                indirectWarn.style.display = 'none';
            }
        }
    }

    // 공식 룰: 해당 월에 1시간 이상 로그된 달만 카운트 (부동소수점 완화: 0.999)
    var months = new Set();
    Object.keys(monthHours).forEach(function(m) {
        if (monthHours[m] >= 0.999) months.add(m);
    });
    let activeMonths = months.size;

    const ids = {
        'Voluntary Public Service': { bar:'vps-bar', text:'vps-text', months:'vps-months' },
        'Personal Development':     { bar:'pd-bar',  text:'pd-text',  months:'pd-months'  },
        'Physical Fitness':         { bar:'pf-bar',  text:'pf-text',  months:'pf-months'  },
        'Expedition':               { bar:'exp-bar', text:'exp-text', months:null          }
    };
    let { bar: barId, text: textId, months: monthsId } = ids[category];

    let req        = REQUIREMENTS[selectedLevel];
    let sectionKey = CAT_KEYS[category];

    // ── 이전 수상 기록 (브론즈/실버 분리) ──
    var prior = getPriorByLevel();
    var priorBronze = prior.bronze[sectionKey] || 0;
    var priorSilver = prior.silver[sectionKey] || 0;
    var priorTotal  = priorBronze + priorSilver;

    // ── 진행률 계산 ──
    let targetHours = 0;
    let completedDays = 0;
    let percent = 0;

    if (sectionKey === 'exp') {
        expTrips.forEach(function(t) { completedDays += (t.countableDays || t.days || 0); });
        var priorDays = (prior.bronze.exp || 0) + (prior.silver.exp || 0);
        var totalDays = completedDays + priorDays;
        percent = Math.min((totalDays / req.exp.days) * 100, 100);

        // 진행률 바 (Expedition은 단순 1색 + prior)
        var bronzeBarEl = document.getElementById(barId + '-bronze');
        var silverBarEl = document.getElementById(barId + '-silver');
        var newBarEl    = document.getElementById(barId);

        var bronzePct = Math.min((prior.bronze.exp / req.exp.days) * 100, 100);
        var silverPct = Math.min((prior.silver.exp / req.exp.days) * 100, 100 - bronzePct);
        var newPct    = Math.min((completedDays    / req.exp.days) * 100, 100 - bronzePct - silverPct);

        if (bronzeBarEl) bronzeBarEl.style.width = bronzePct.toFixed(1) + '%';
        if (silverBarEl) silverBarEl.style.width = silverPct.toFixed(1) + '%';
        if (newBarEl) {
            newBarEl.style.width = newPct.toFixed(1) + '%';
            newBarEl.style.backgroundColor = percent >= 100 ? '#27ae60' : '#1a3a6b';
        }

    } else {
        targetHours = req[sectionKey].hours;
        var totalAll = totalHours + priorTotal;
        percent = Math.min((totalAll / targetHours) * 100, 100);

        // 3색 진행률 바
        var bronzeBarEl = document.getElementById(barId + '-bronze');
        var silverBarEl = document.getElementById(barId + '-silver');
        var newBarEl    = document.getElementById(barId);

        var bronzePct = Math.min((priorBronze / targetHours) * 100, 100);
        var silverPct = Math.min((priorSilver / targetHours) * 100, 100 - bronzePct);
        var newPct    = Math.min((totalHours  / targetHours) * 100, 100 - bronzePct - silverPct);

        if (bronzeBarEl) bronzeBarEl.style.width = bronzePct.toFixed(1) + '%';
        if (silverBarEl) silverBarEl.style.width = silverPct.toFixed(1) + '%';
        if (newBarEl) {
            newBarEl.style.width = newPct.toFixed(1) + '%';
            newBarEl.style.backgroundColor = percent >= 100 ? '#27ae60' : '#1a3a6b';
        }
    }

    // ── 텍스트 ──
    let textEl = document.getElementById(textId);
    if (sectionKey === 'exp') {
        var priorDaysTotal = (prior.bronze.exp || 0) + (prior.silver.exp || 0);
        var totalDays2 = completedDays + priorDaysTotal;
        var completedNights = expTrips.reduce(function(s,t){ return s+(t.nights||0); }, 0);
        var nightsReq = req.exp.nights;
        var nightsStr = nightsReq > 0 ? ' | ' + completedNights + ' / ' + nightsReq + ' nights' : '';
        var priorStr  = priorDaysTotal > 0 ? ' (' + priorDaysTotal + ' carried over)' : '';
        textEl.textContent = totalDays2 + ' / ' + req.exp.days + ' days' + nightsStr +
            ' — ' + selectedLevel + priorStr + (percent >= 100 ? ' ✅' : '');
    } else {
        var totalAll2 = totalHours + priorTotal;
        var priorParts = [];
        if (priorBronze > 0) priorParts.push(priorBronze + ' Bronze ✓');
        if (priorSilver > 0) priorParts.push(priorSilver + ' Silver ✓');
        var priorStr2 = priorParts.length > 0 ? ' (' + priorParts.join(' + ') + ')' : '';
        var done = percent >= 100 ? ' ✅' : '';
        textEl.textContent = totalAll2 + ' / ' + req[sectionKey].hours +
            ' hours completed (' + selectedLevel + ')' + priorStr2 + done;
    }

    // ── 월 요건 ──
    if (monthsId) {
        let monthReq = req[sectionKey].months;
        let monthEl  = document.getElementById(monthsId);
        // prior months 합산
        var priorMonths = 0;
        Object.values(priorAwards).forEach(function(rec) {
            var mk = sectionKey + 'Months';
            priorMonths += (rec[mk] || 0);
        });
        var totalMonths = activeMonths + priorMonths;
        if (monthReq === 0) {
            monthEl.textContent = 'Active months: ' + totalMonths + ' (no month requirement)';
        } else {
            var priorMonthStr = priorMonths > 0 ? ' (' + priorMonths + ' carried over)' : '';
            let monthDone = totalMonths >= monthReq ? ' ✅' : '';
            monthEl.textContent = 'Active months: ' + totalMonths + ' / ' + monthReq + ' months' + priorMonthStr + monthDone;
        }
    }
}

// ════════════════════════════════════════════
// Goal 렌더링
// ════════════════════════════════════════════

function renderGoals(category) {
    // Expedition은 Trip 구조 (renderExpedition 사용) — renderGoals 대상 아님
    if (category === 'Expedition') return;

    const sectionIds = {
        'Voluntary Public Service': 'vps-goals',
        'Personal Development':     'pd-goals',
        'Physical Fitness':         'pf-goals'
    };
    let container = document.getElementById(sectionIds[category]);
    if (!container) return;
    container.innerHTML = '';

    goals[category].forEach(function(goal, gIdx) {
        // Goal 합산
        let goalHours    = 0;
        let goalSessions = 0;
        goal.activityTypes.forEach(function(act) {
            act.logs.forEach(function(log) { goalHours += log.hours; });
            goalSessions += act.logs.length;
        });

        // Activity Types HTML
        let actTypesHtml = '';
        goal.activityTypes.forEach(function(act, aIdx) {
            let actHours    = act.logs.reduce(function(s,l){ return s+l.hours; }, 0);
            let actSessions = act.logs.length;

            // 로그 목록
            let logsHtml = '';
            act.logs.forEach(function(log, lIdx) {
                logsHtml += `
                    <div class="log-item">
                        <span class="log-date">${escapeHtml(log.date)}</span>
                        <span class="log-hours">${escapeHtml(String(log.hours))} hrs</span>
                        ${log.isIndirect ? '<span class="log-indirect-badge">indirect</span>' : ''}
                        <span class="log-note">${escapeHtml(log.note || '')}</span>
                        <div class="log-actions">
                            <button class="log-edit-btn" onclick="openLogModal('${category}',${gIdx},${aIdx},${lIdx})">✏️</button>
                            <button class="log-del-btn"  onclick="deleteLog('${category}',${gIdx},${aIdx},${lIdx})">🗑️</button>
                        </div>
                    </div>`;
            });

            actTypesHtml += `
                <div class="act-type-card">
                    <div class="act-type-header">
                        <span class="act-type-name">📁 ${escapeHtml(act.name)}</span>
                        <span class="act-type-summary">${actHours} hrs / ${actSessions} sessions</span>
                        <div class="act-type-btns">
                            <button class="log-btn"    onclick="openLogModal('${category}',${gIdx},${aIdx})">+ Log</button>
                            <button class="toggle-btn" onclick="toggleLogs('logs-${category}-${gIdx}-${aIdx}')">▼ View</button>
                            <button class="edit-btn"   onclick="openActivityTypeModal('${category}',${gIdx},${aIdx})">✏️</button>
                            <button class="delete-btn" onclick="deleteActivityType('${category}',${gIdx},${aIdx})">🗑️</button>
                        </div>
                    </div>
                    <div class="logs-container" id="logs-${category}-${gIdx}-${aIdx}" style="display:none">
                        ${logsHtml || '<p class="no-logs">No logs yet. Click "+ Log" to add.</p>'}
                    </div>
                </div>`;
        });

        let div = document.createElement('div');
        div.className = 'goal-card';
        div.innerHTML = `
            <div class="goal-header">
                <div class="goal-header-left">
                    <p class="goal-title">📌 ${escapeHtml(goal.name)}</p>
                    <p class="goal-meta">Validator: ${escapeHtml(goal.validator || 'Not set')}&nbsp;|&nbsp;${escapeHtml(goal.email || '—')}</p>
                    ${goal.isNonProfit ? `<p class="goal-nonprofit-meta">🏛️ 501(c)(3) Nonprofit${goal.orgUrl ? ' — <a href="'+escapeHtml(goal.orgUrl)+'" target="_blank" rel="noopener">'+escapeHtml(goal.orgUrl)+'</a>' : ''}</p>` : ''}
                </div>
                <div class="goal-header-right">
                    <span class="goal-total">${goalHours} hrs<br><small>${goalSessions} sessions</small></span>
                    <button class="icon-btn edit-btn" onclick="openGoalModal('${category}',${gIdx})">✏️</button>
                    <button class="icon-btn delete-btn" onclick="deleteGoal('${category}',${gIdx})">🗑️</button>
                </div>
            </div>
            ${actTypesHtml}
            <div class="goal-footer">
                <button class="add-btn" onclick="openActivityTypeModal('${category}',${gIdx})">+ Add Activity Type</button>
            </div>`;
        container.appendChild(div);
    });
}

// ── Tab Navigation ──
function showTab(tab, fromPopState) {
    // 모든 탭 콘텐츠 숨기기
    document.querySelectorAll('.tab-content').forEach(function(el) {
        el.classList.remove('active');
    });
    // 모든 탭 버튼 비활성화
    document.querySelectorAll('.tab-btn').forEach(function(el) {
        el.classList.remove('active');
    });
    // 선택한 탭 활성화
    document.getElementById('content-' + tab).classList.add('active');
    document.getElementById('tab-' + tab).classList.add('active');
    // 현재 탭 localStorage에 저장 (새로고침 후 복원)
    localStorage.setItem('activeTab', tab);
    // 뒤로가기 히스토리 쌓기 (popstate로 호출된 경우 제외)
    if (!fromPopState) {
        history.pushState({ screen: 'main', tab: tab }, '', '');
    }
}

// 로그 접기/펼치기
function toggleLogs(id) {
    let el = document.getElementById(id);
    if (!el) return;
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

// ════════════════════════════════════════════
// 배지 업데이트
// ════════════════════════════════════════════

function updateBadges(level) {
    // level 파라미터가 없으면 selectedLevel 사용
    var lv = level || selectedLevel;
    if (!lv || !REQUIREMENTS[lv]) return;
    let req = REQUIREMENTS[lv];
    var b1 = document.getElementById('vps-badge');
    var b2 = document.getElementById('pd-badge');
    var b3 = document.getElementById('pf-badge');
    var b4 = document.getElementById('exp-badge');
    if (b1) b1.textContent = lv + ': ' + req.vps.hours + ' hrs';
    if (b2) b2.textContent = lv + ': ' + req.pd.hours  + ' hrs';
    if (b3) b3.textContent = lv + ': ' + req.pf.hours  + ' hrs';
    if (b4) b4.textContent = lv + ': ' + req.exp.days + ' days' +
        (req.exp.nights > 0 ? ' / ' + req.exp.nights + ' nights' : '');
}

// ════════════════════════════════════════════
// XLSX 내보내기 (4개 시트)
// ════════════════════════════════════════════

function exportCSV() {
    // 데이터 존재 여부 확인
    var hasData = expTrips.length > 0 ||
        ['Voluntary Public Service','Personal Development','Physical Fitness'].some(function(cat) {
            return goals[cat].some(function(g) {
                return g.activityTypes.some(function(a) { return a.logs.length > 0; });
            });
        });
    if (!hasData) {
        alert('No activity data to export yet. Start logging activities first!');
        return;
    }

    if (typeof XLSX === 'undefined') {
        alert('Export library not loaded. Please refresh the page and try again.');
        return;
    }

    var wb = XLSX.utils.book_new();
    var userName = localStorage.getItem('userName') || 'export';

    // ── Sheet 1: Voluntary Public Service ──
    var vpsRows = [['Goal','501(c)(3)','Org URL','Activity Type','Date','Hours','Indirect','Note']];
    goals['Voluntary Public Service'].forEach(function(goal) {
        goal.activityTypes.forEach(function(act) {
            act.logs.forEach(function(log) {
                vpsRows.push([
                    goal.name,
                    goal.isNonProfit ? 'Yes' : 'No',
                    goal.orgUrl || '',
                    act.name, log.date,
                    log.hours,
                    log.isIndirect ? 'Yes' : 'No',
                    log.note || ''
                ]);
            });
        });
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(vpsRows), 'Voluntary Public Service');

    // ── Sheet 2: Personal Development ──
    var pdRows = [['Goal','Activity Type','Date','Hours','Note']];
    goals['Personal Development'].forEach(function(goal) {
        goal.activityTypes.forEach(function(act) {
            act.logs.forEach(function(log) {
                pdRows.push([goal.name, act.name, log.date, log.hours, log.note || '']);
            });
        });
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(pdRows), 'Personal Development');

    // ── Sheet 3: Physical Fitness ──
    var pfRows = [['Goal','Activity Type','Date','Hours','Note']];
    goals['Physical Fitness'].forEach(function(goal) {
        goal.activityTypes.forEach(function(act) {
            act.logs.forEach(function(log) {
                pfRows.push([goal.name, act.name, log.date, log.hours, log.note || '']);
            });
        });
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(pfRows), 'Physical Fitness');

    // ── Sheet 4: Expedition ──
    var expRows = [['Location','Start Date','End Date','Total Days','Countable Days','Nights','Travel Days','Validator Email']];
    expTrips.forEach(function(trip) {
        expRows.push([
            trip.location, trip.startDate, trip.endDate,
            trip.totalDays, trip.countableDays, trip.nights,
            trip.travelDays, trip.validatorEmail || ''
        ]);
        trip.dayLogs.forEach(function(day, dIdx) {
            day.activities.forEach(function(act) {
                expRows.push([
                    'Day '+(dIdx+1)+' ('+day.date+(day.isTravel?' ✈️':'')+')',
                    '', '', '', '', '', '',
                    act.startTime+' – '+act.endTime+' | '+act.description+' ('+act.hours+'h)'
                ]);
            });
        });
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(expRows), 'Expedition');

    XLSX.writeFile(wb, 'congressional-award-' + userName + '.xlsx');
}

// ════════════════════════════════════════════
// 앱 시작
// ════════════════════════════════════════════
// 이전 수상 기록 UI
// ════════════════════════════════════════════

// 레벨별 하위 레벨 맵
const LEVEL_ORDER = [
    'Bronze Certificate', 'Silver Certificate', 'Gold Certificate',
    'Bronze Medal', 'Silver Medal', 'Gold Medal'
];

// 해당 레벨보다 낮은 레벨 목록 반환
function getLowerLevels(level) {
    var idx = LEVEL_ORDER.indexOf(level);
    if (idx <= 0) return [];
    return LEVEL_ORDER.slice(0, idx);
}

// 레벨 선택 시 이전 수상 기록 입력 섹션 토글
function togglePriorAward(context) {
    var prefix  = context; // 'setup' or 'settings'
    var levelEl = document.getElementById(prefix + '-level');
    var section = document.getElementById(prefix + '-prior-section');
    var inputsEl= document.getElementById(prefix + '-prior-inputs');

    if (!levelEl || !section || !inputsEl) return;

    var level  = levelEl.value;
    var lowers = getLowerLevels(level);

    if (lowers.length === 0) {
        section.style.display = 'none';
        return;
    }

    // 입력 폼 생성
    var html = '';
    lowers.forEach(function(lv) {
        var saved = priorAwards[lv] || {};
        var color = lv.includes('Bronze') ? '#cd7f32' : '#aaa';
        var wrapperId = 'prior-wrapper-' + context + '-' + lv.replace(/\s/g,'_');
        var btnId     = 'prior-btn-' + context + '-' + lv.replace(/\s/g,'_');
        // 이미 저장된 값이 있으면 기본 열림
        var hasData = Object.values(saved).some(function(v) { return v > 0; });

        html += '<button type="button" class="prior-toggle-btn' + (hasData ? ' open' : '') + '" id="' + btnId + '" onclick="togglePriorBlock(\'' + wrapperId + '\',\'' + btnId + '\')">';
        html += '✓ ' + escapeHtml(lv);
        html += '<span class="prior-toggle-arrow">▼</span></button>';
        html += '<div class="prior-inputs-wrapper' + (hasData ? ' open' : '') + '" id="' + wrapperId + '">';
        html += '<div class="prior-level-block" style="border-left:3px solid ' + color + '">';

        if (lv.includes('Certificate') || lv.includes('Medal')) {
            var req = REQUIREMENTS[lv];
            html += '<div class="prior-inputs-grid">';
            // Service
            html += '<div class="prior-input-item"><label>Service Hours</label>';
            html += '<input type="number" class="input-field prior-input" id="prior-' + context + '-' + lv.replace(/\s/g,'_') + '-vps" min="0" step="0.25" value="' + (saved.vps || 0) + '"></div>';
            if (req.vps.months > 0) {
                html += '<div class="prior-input-item"><label>Service Months (max ' + req.vps.months + ')</label>';
                html += '<input type="number" class="input-field prior-input" id="prior-' + context + '-' + lv.replace(/\s/g,'_') + '-vps-months" min="0" max="' + req.vps.months + '" step="1" value="' + (saved.vpsMonths || 0) + '"></div>';
            } else {
                html += '<div class="prior-input-item"></div>';
                html += '<input type="hidden" id="prior-' + context + '-' + lv.replace(/\s/g,'_') + '-vps-months" value="0">';
            }
            // Development
            html += '<div class="prior-input-item"><label>Development Hours</label>';
            html += '<input type="number" class="input-field prior-input" id="prior-' + context + '-' + lv.replace(/\s/g,'_') + '-pd" min="0" step="0.25" value="' + (saved.pd || 0) + '"></div>';
            if (req.pd.months > 0) {
                html += '<div class="prior-input-item"><label>Development Months (max ' + req.pd.months + ')</label>';
                html += '<input type="number" class="input-field prior-input" id="prior-' + context + '-' + lv.replace(/\s/g,'_') + '-pd-months" min="0" max="' + req.pd.months + '" step="1" value="' + (saved.pdMonths || 0) + '"></div>';
            } else {
                html += '<div class="prior-input-item"></div>';
                html += '<input type="hidden" id="prior-' + context + '-' + lv.replace(/\s/g,'_') + '-pd-months" value="0">';
            }
            // Fitness
            html += '<div class="prior-input-item"><label>Fitness Hours</label>';
            html += '<input type="number" class="input-field prior-input" id="prior-' + context + '-' + lv.replace(/\s/g,'_') + '-pf" min="0" step="0.25" value="' + (saved.pf || 0) + '"></div>';
            if (req.pf.months > 0) {
                html += '<div class="prior-input-item"><label>Fitness Months (max ' + req.pf.months + ')</label>';
                html += '<input type="number" class="input-field prior-input" id="prior-' + context + '-' + lv.replace(/\s/g,'_') + '-pf-months" min="0" max="' + req.pf.months + '" step="1" value="' + (saved.pfMonths || 0) + '"></div>';
            } else {
                html += '<div class="prior-input-item"></div>';
                html += '<input type="hidden" id="prior-' + context + '-' + lv.replace(/\s/g,'_') + '-pf-months" value="0">';
            }
            html += '</div>';
        }
        html += '</div>'; // prior-level-block
        html += '</div>'; // prior-inputs-wrapper
    });

    inputsEl.innerHTML = html;
    section.style.display = 'block';
}

// 입력된 이전 수상 기록 읽기
function readPriorInputs(context) {
    var levelEl = document.getElementById(context + '-level');
    if (!levelEl) return {};
    var level  = levelEl.value;
    var lowers = getLowerLevels(level);
    var result = {};

    lowers.forEach(function(lv) {
        var key = lv.replace(/\s/g,'_');
        var vps        = parseFloat(document.getElementById('prior-' + context + '-' + key + '-vps')?.value || 0);
        var vpsMonths  = parseInt(document.getElementById('prior-' + context + '-' + key + '-vps-months')?.value || 0);
        var pd         = parseFloat(document.getElementById('prior-' + context + '-' + key + '-pd')?.value  || 0);
        var pdMonths   = parseInt(document.getElementById('prior-' + context + '-' + key + '-pd-months')?.value || 0);
        var pf         = parseFloat(document.getElementById('prior-' + context + '-' + key + '-pf')?.value  || 0);
        var pfMonths   = parseInt(document.getElementById('prior-' + context + '-' + key + '-pf-months')?.value || 0);
        if (vps || pd || pf) {
            result[lv] = { vps, vpsMonths, pd, pdMonths, pf, pfMonths };
        }
    });
    return result;
}

// priorAwards 저장
function togglePriorBlock(wrapperId, btnId) {
    var wrapper = document.getElementById(wrapperId);
    var btn     = document.getElementById(btnId);
    if (!wrapper || !btn) return;
    var isOpen = wrapper.classList.contains('open');
    wrapper.classList.toggle('open', !isOpen);
    btn.classList.toggle('open', !isOpen);
}

function savePriorAwards(data) {
    priorAwards = data;
    localStorage.setItem('priorAwards', JSON.stringify(priorAwards));
}

// 이전 수상 기록 총합 반환 (카테고리별)
function getPriorTotal(catKey) {
    var total = 0;
    Object.values(priorAwards).forEach(function(rec) {
        total += (rec[catKey] || 0);
    });
    return total;
}

// 이전 수상 기록 레벨별 반환 (브론즈/실버 구분용)
function getPriorByLevel() {
    var bronze = { vps:0, pd:0, pf:0, exp:0 };
    var silver = { vps:0, pd:0, pf:0, exp:0 };
    Object.entries(priorAwards).forEach(function(entry) {
        var lv  = entry[0];
        var rec = entry[1];
        if (lv.includes('Bronze')) {
            ['vps','pd','pf','exp'].forEach(function(k) { bronze[k] += (rec[k]||0); });
        } else if (lv.includes('Silver')) {
            ['vps','pd','pf','exp'].forEach(function(k) { silver[k] += (rec[k]||0); });
        }
    });
    return { bronze: bronze, silver: silver };
}

function startApp() {
    let name      = document.getElementById('setup-name').value.trim();
    let level     = document.getElementById('setup-level').value;
    let startDate = document.getElementById('setup-startdate').value;

    if (!name)      { alert('Please enter your name!'); return; }
    if (!level)     { alert('Please select your target award level!'); return; }
    if (!startDate) { alert('Please select your program start date!'); return; }

    selectedLevel = level;
    localStorage.setItem('selectedLevel', level);
    localStorage.setItem('userName', name);
    localStorage.setItem('startDate', startDate);

    // 이전 수상 기록 저장
    savePriorAwards(readPriorInputs('setup'));

    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('main-screen').style.display  = 'block';
    document.getElementById('header-name').textContent    = name + ' | ' + level + ' | Since ' + startDate;
    var emailEl2 = document.getElementById('header-email');
    if (emailEl2 && window.FB) emailEl2.textContent = (window.FB.auth.currentUser || {}).email || '';

    CATS.forEach(function(c) { updateDisplay(c); renderGoals(c); });
    updateBadges(level);
    renderExpedition();
    showTab('vps'); // 항상 첫 탭으로 시작
}

// ════════════════════════════════════════════
// Settings 모달
// ════════════════════════════════════════════

function openSettingsModal() {
    document.getElementById('settings-name').value      = localStorage.getItem('userName')      || '';
    document.getElementById('settings-level').value     = localStorage.getItem('selectedLevel') || '';
    document.getElementById('settings-startdate').value = localStorage.getItem('startDate')     || '';
    document.getElementById('settings-modal').style.display = 'flex';
    // select value 설정 후 한 프레임 대기 후 prior 섹션 로드
    setTimeout(function() { togglePriorAward('settings'); }, 0);
}

function closeSettingsModal() {
    document.getElementById('settings-modal').style.display = 'none';
}

async function saveSettings() {
    let name      = document.getElementById('settings-name').value.trim();
    let level     = document.getElementById('settings-level').value;
    let startDate = document.getElementById('settings-startdate').value;

    if (!name)  { alert('Please enter your name!'); return; }
    if (!level) { alert('Please select a level!');  return; }
    if (!startDate) { alert('Please select a start date!'); return; }

    selectedLevel = level;
    localStorage.setItem('userName',      name);
    localStorage.setItem('selectedLevel', level);
    localStorage.setItem('startDate',     startDate);

    // 이전 수상 기록 저장
    savePriorAwards(readPriorInputs('settings'));

    document.getElementById('header-name').textContent = name + ' | ' + level + ' | Since ' + startDate;

    // Firestore 프로필 + goals/trips 동기화 (레벨 변경 시 마이그레이션)
    var uid = window.FB && window.FB.getCurrentUid();
    if (uid) {
        try {
            await window.FB.saveProfile(uid, {
                name:        name,
                activeLevel: level,
                startDate:   startDate,
                updatedAt:   new Date().toISOString()
            });
            await window.FB.saveLevelData(uid, level, 'goals',  goals);
            await window.FB.saveLevelData(uid, level, 'trips',  expTrips);
            await window.FB.saveLevelData(uid, level, 'priors', priorAwards);
        } catch(e) {
            console.warn('Settings Firestore sync failed:', e);
        }
    }

    CATS.forEach(function(c) { updateDisplay(c); renderGoals(c); });
    updateBadges(level);
    renderExpedition();
    closeSettingsModal();
}

async function resetAllData() {
    if (confirm('⚠️ This will permanently delete ALL your data.\n\nAre you sure?')) {
        if (confirm('Last warning — delete everything and start over?')) {
            // Firebase 로그아웃 먼저
            if (window.FB) {
                try { await window.FB.signOutUser(); } catch(e) { console.warn('signOut error:', e); }
            }
            localStorage.clear();
            // 페이지 리로드로 완전 초기화 (로그인 화면으로 이동)
            window.location.reload();
        }
    }
}

// ════════════════════════════════════════════
// 페이지 로드
// ════════════════════════════════════════════

// ════════════════════════════════════════════
// Splash Screen
// ════════════════════════════════════════════
(function() {
    var splash = document.getElementById('splash-screen');
    if (!splash) return;

    // 0.1s: 나침반 fade in
    setTimeout(function() {
        document.getElementById('compass-svg').classList.add('show');
    }, 100);

    // 0.5s: 바늘 애니메이션
    setTimeout(function() {
        document.getElementById('compass-needle').classList.add('animate');
    }, 500);

    // 1.4s: 타이틀 등장
    setTimeout(function() {
        document.getElementById('splash-title').classList.add('show');
    }, 1400);

    // 1.7s: 서브타이틀 + 구분선 + 크레딧
    setTimeout(function() {
        document.getElementById('splash-sub').classList.add('show');
        document.getElementById('splash-divider').classList.add('show');
        document.getElementById('splash-credit').classList.add('show');
    }, 1700);

    // 2.0s: 로딩 dots 순차 점등
    setTimeout(function() {
        document.getElementById('splash-dots').classList.add('show');
    }, 2000);

    setTimeout(function() {
        document.getElementById('dot1').classList.add('active');
    }, 2100);

    setTimeout(function() {
        document.getElementById('dot2').classList.add('active');
    }, 2350);

    setTimeout(function() {
        document.getElementById('dot3').classList.add('active');
    }, 2600);

    // 4.5s: fade out 시작 (콘텐츠 충분히 보임)
    setTimeout(function() {
        splash.classList.add('fade-out');
    }, 4500);

    // 4.7s: data-done → 로그인 즉시 전환 (네이비 0.2초만)
    setTimeout(function() {
        splash.setAttribute('data-done', 'true');
    }, 4700);
})();

// ════════════════════════════════════════════
// Guide Overlay
// ════════════════════════════════════════════
function openGuide() {
    var el = document.getElementById('guide-overlay');
    el.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeGuide() {
    var el = document.getElementById('guide-overlay');
    el.style.display = 'none';
    document.body.style.overflow = '';
}

// ESC 키로 열린 모달 모두 닫기
document.addEventListener('keydown', function(e) {
    if (e.key !== 'Escape') return;
    if (document.getElementById('guide-overlay').style.display !== 'none') { closeGuide(); return; }
    if (document.getElementById('act-modal').style.display     !== 'none') { closeActivityModal(); return; }
    if (document.getElementById('log-modal').style.display     !== 'none') { closeLogModal(); return; }
    if (document.getElementById('goal-modal').style.display    !== 'none') { closeGoalModal(); return; }
    if (document.getElementById('act-type-modal').style.display !== 'none'){ closeActivityTypeModal(); return; }
    if (document.getElementById('trip-modal').style.display    !== 'none') { closeTripModal(); return; }
    if (document.getElementById('settings-modal').style.display !== 'none'){ closeSettingsModal(); return; }
});

// Backdrop(overlay) 클릭으로 모달 닫기
document.addEventListener('click', function(e) {
    if (!e.target.classList.contains('modal-overlay')) return;
    var id = e.target.id;
    if (id === 'goal-modal')     { closeGoalModal();         return; }
    if (id === 'act-type-modal') { closeActivityTypeModal(); return; }
    if (id === 'log-modal')      { closeLogModal();          return; }
    if (id === 'trip-modal')     { closeTripModal();         return; }
    if (id === 'act-modal')      { closeActivityModal();     return; }
    if (id === 'settings-modal') { closeSettingsModal();     return; }
});

// ════════════════════════════════════════════
// Firebase 연동
// ════════════════════════════════════════════

// FB 객체는 firebase.js에서 window.FB로 노출됨
// type="module" 로드 완료 후 사용 가능

// ── 화면 전환 헬퍼 ──
function showScreen(screenId, fromPopState) {
    ['splash-screen','login-screen','setup-screen','main-screen'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    var target = document.getElementById(screenId);
    if (!target) return;
    // 화면별 display 값 구분
    if (screenId === 'main-screen') {
        target.style.display = 'block';
    } else {
        target.style.display = 'flex';
    }
    // 히스토리 쌓기 (splash 제외, popstate 호출 제외)
    if (!fromPopState && screenId !== 'splash-screen') {
        history.pushState({ screen: screenId }, '', '');
    }
}

// ── Google 로그인 ──
// ── 이메일 로그인/회원가입 폼 전환 ──
function showSignUpForm() {
    document.getElementById('email-login-form').style.display  = 'none';
    document.getElementById('email-signup-form').style.display = 'block';
    document.getElementById('login-error').style.display       = 'none';
}

function showLoginForm() {
    document.getElementById('email-signup-form').style.display = 'none';
    document.getElementById('email-login-form').style.display  = 'block';
    document.getElementById('signup-error').style.display      = 'none';
}

function showLoginError(msg) {
    var el = document.getElementById('login-error');
    el.style.color = '#c0392b';
    el.textContent = msg;
    el.style.display = 'block';
}

function showSignUpError(msg) {
    var el = document.getElementById('signup-error');
    el.textContent = msg;
    el.style.display = 'block';
}

// ── 이메일 로그인 ──
async function handleEmailSignIn() {
    var email    = document.getElementById('login-email').value.trim();
    var password = document.getElementById('login-password').value;
    document.getElementById('login-error').style.display = 'none';

    if (!email)    { showLoginError('Please enter your email.'); return; }
    if (!password) { showLoginError('Please enter your password.'); return; }

    try {
        var user = await window.FB.signInWithEmail(email, password);
        var keepSignedIn = document.getElementById('keep-signed-in');
        localStorage.setItem('keepSignedIn', keepSignedIn && keepSignedIn.checked ? 'true' : 'false');
        await loadUserData(user);
    } catch(e) {
        var msg = 'Sign in failed. Please check your email and password.';
        if (e.code === 'auth/user-not-found')     msg = 'No account found with this email.';
        if (e.code === 'auth/wrong-password')     msg = 'Incorrect password.';
        if (e.code === 'auth/invalid-credential') msg = 'Incorrect email or password.';
        if (e.code === 'auth/invalid-email')      msg = 'Invalid email address.';
        if (e.code === 'auth/too-many-requests')  msg = 'Too many attempts. Please try again later.';
        showLoginError(msg);
    }
}

// ── 이메일 회원가입 ──
async function handleEmailSignUp() {
    var email  = document.getElementById('signup-email').value.trim();
    var pw1    = document.getElementById('signup-password').value;
    var pw2    = document.getElementById('signup-password2').value;
    document.getElementById('signup-error').style.display = 'none';

    if (!email)        { showSignUpError('Please enter your email.'); return; }
    if (!pw1)          { showSignUpError('Please enter a password.'); return; }
    if (pw1.length < 6){ showSignUpError('Password must be at least 6 characters.'); return; }
    if (pw1 !== pw2)   { showSignUpError('Passwords do not match.'); return; }

    try {
        var user = await window.FB.signUpWithEmail(email, pw1);
        var keepSignedIn = document.getElementById('keep-signed-in');
        localStorage.setItem('keepSignedIn', keepSignedIn && keepSignedIn.checked ? 'true' : 'false');
        await loadUserData(user);
    } catch(e) {
        var msg = 'Sign up failed. Please try again.';
        if (e.code === 'auth/email-already-in-use') msg = 'This email is already registered. Please sign in.';
        if (e.code === 'auth/invalid-email')        msg = 'Invalid email address.';
        if (e.code === 'auth/weak-password')        msg = 'Password is too weak. Use at least 6 characters.';
        showSignUpError(msg);
    }
}

// ── 비밀번호 재설정 ──
async function handleForgotPassword() {
    var email = document.getElementById('login-email').value.trim();
    if (!email) {
        showLoginError('Please enter your email address first.');
        return;
    }
    try {
        await window.FB.resetPassword(email);
        showLoginError('✅ Password reset email sent! Check your inbox.');
        document.getElementById('login-error').style.color = '#27ae60';
    } catch(e) {
        var msg = 'Failed to send reset email.';
        if (e.code === 'auth/user-not-found') msg = 'No account found with this email.';
        if (e.code === 'auth/invalid-email')  msg = 'Invalid email address.';
        showLoginError(msg);
    }
}

async function handleGoogleSignIn() {
    var btn = document.querySelector('.google-signin-btn');
    var keepSignedIn = document.getElementById('keep-signed-in');
    var shouldKeep = keepSignedIn ? keepSignedIn.checked : true;

    // 자동 로그인 설정 저장
    localStorage.setItem('keepSignedIn', shouldKeep ? 'true' : 'false');

    if (btn) { btn.disabled = true; btn.textContent = 'Signing in...'; }
    try {
        var user = await window.FB.signInWithGoogle();
        await loadUserData(user);
    } catch(e) {
        alert('Sign in failed. Please try again.');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google"> Sign in with Google';
        }
    }
}

// Apple 로그인
async function handleAppleSignIn() {
    var btn = document.querySelector('.apple-signin-btn');
    var keepSignedIn = document.getElementById('keep-signed-in');
    var shouldKeep = keepSignedIn ? keepSignedIn.checked : true;

    localStorage.setItem('keepSignedIn', shouldKeep ? 'true' : 'false');

    if (btn) { btn.disabled = true; btn.textContent = 'Signing in...'; }
    try {
        var user = await window.FB.signInWithApple();
        await loadUserData(user);
    } catch(e) {
        alert('Apple Sign in failed. Please try again.');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 814 1000" fill="white"><path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-207.5 135.4-317.3 269-317.3 71 0 130.5 46.4 175 46.4 42.8 0 109.9-49 192.5-49 31 0 111.3 2.6 168.4 81z"/><path d="M554.1 88.4c-15.9 74.1-75.4 133.6-137 133.6-3.2 0-6.5-.3-9.7-.6-3.2-38.2 12.3-79.2 35.9-107.6 26.9-32.6 78.3-58.2 122.5-61.6 3.2 0 6.4-.3 9.7-.3 3.2 26.9-.3 53.8-21.4 36.5z"/></svg> Sign in with Apple';
        }
    }
}
// ── 로그아웃 ──
async function handleSignOut() {
    if (!confirm('Sign out of Award Compass?')) return;
    try {
        await window.FB.signOutUser();
    } catch(e) {
        console.warn('Sign out error:', e);
    }
    // localStorage 완전 초기화
    localStorage.clear();
    // 메모리 초기화
    goals = { 'Voluntary Public Service':[], 'Personal Development':[], 'Physical Fitness':[], 'Expedition':[] };
    selectedLevel = '';
    // 페이지 리로드로 완전한 초기화 (가장 안전한 방법)
    window.location.reload();
}

// ── 유저 데이터 불러오기 (로그인 후) ──
async function loadUserData(user) {
    var uid = user.uid;

    // 프로필 불러오기
    var profile = await window.FB.loadProfile(uid);

    if (!profile || !profile.activeLevel) {
        // 처음 로그인 → splash 종료 후 Setup 화면
        var splash = document.getElementById('splash-screen');
        var splashDone = !splash || splash.getAttribute('data-done') === 'true';
        setTimeout(function() {
            showScreen('setup-screen');
        }, splashDone ? 0 : 5000);
        return;
    }

    // 기존 유저 → 데이터 로드 후 메인
    selectedLevel = profile.activeLevel;
    var levelName = profile.activeLevel;

    // localStorage에도 캐시
    localStorage.setItem('userName',      profile.name      || user.displayName || '');
    localStorage.setItem('selectedLevel', profile.activeLevel);
    localStorage.setItem('startDate',     profile.startDate || '');

    // Firestore에서 goals, trips, priors 로드
    var savedGoals  = await window.FB.loadLevelData(uid, levelName, 'goals');
    var savedTrips  = await window.FB.loadLevelData(uid, levelName, 'trips');
    var savedPriors = await window.FB.loadLevelData(uid, levelName, 'priors');

    if (savedGoals) {
        goals = savedGoals;
        localStorage.setItem('goals', JSON.stringify(goals));
    }
    if (savedTrips) {
        expTrips = savedTrips;
        localStorage.setItem('expTrips', JSON.stringify(expTrips));
    }
    if (savedPriors) {
        priorAwards = savedPriors;
        localStorage.setItem('priorAwards', JSON.stringify(priorAwards));
    }

    // 메인 화면 표시
    showScreen('main-screen');
    document.getElementById('header-name').textContent =
        (profile.name || user.displayName) + ' | ' + profile.activeLevel +
        (profile.startDate ? ' | Since ' + profile.startDate : '');
    var emailEl = document.getElementById('header-email');
    if (emailEl) emailEl.textContent = user.email || '';

    // DOM 업데이트 후 render (한 프레임 대기)
    setTimeout(function() {
        CATS.forEach(function(c) { updateDisplay(c); renderGoals(c); });
        updateBadges(selectedLevel);
        renderExpedition();
        var lastTab = localStorage.getItem('activeTab') || 'vps';
        showTab(lastTab);
    }, 50);
}

// ── Firestore 저장 헬퍼 (goals, trips 변경 시 호출) ──
async function syncToFirestore() {
    var uid = window.FB.getCurrentUid();
    if (!uid || !selectedLevel) return;
    try {
        await window.FB.saveLevelData(uid, selectedLevel, 'goals',  goals);
        await window.FB.saveLevelData(uid, selectedLevel, 'trips',  expTrips);
        await window.FB.saveLevelData(uid, selectedLevel, 'priors', priorAwards);
    } catch(e) {
        console.warn('Firestore sync failed (offline?):', e);
    }
}

// ── startApp 오버라이드: Setup 완료 시 Firestore에 저장 ──
startApp = async function() {
    var name      = document.getElementById('setup-name').value.trim();
    var level     = document.getElementById('setup-level').value;
    var startDate = document.getElementById('setup-startdate').value;

    if (!name)      { alert('Please enter your name!'); return; }
    if (!level)     { alert('Please select your target award level!'); return; }
    if (!startDate) { alert('Please select your program start date!'); return; }

    selectedLevel = level;
    localStorage.setItem('selectedLevel', level);
    localStorage.setItem('userName',      name);
    localStorage.setItem('startDate',     startDate);

    // 이전 수상 기록 저장
    savePriorAwards(readPriorInputs('setup'));

    // Firestore 프로필 저장
    var uid = window.FB && window.FB.getCurrentUid();
    if (uid) {
        await window.FB.saveProfile(uid, {
            name:        name,
            activeLevel: level,
            startDate:   startDate,
            updatedAt:   new Date().toISOString()
        });
        await window.FB.saveLevelData(uid, level, 'goals',  goals);
        await window.FB.saveLevelData(uid, level, 'trips',  expTrips);
        await window.FB.saveLevelData(uid, level, 'priors', priorAwards);
    }

    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('main-screen').style.display  = 'block';
    document.getElementById('header-name').textContent    = name + ' | ' + level + ' | Since ' + startDate;
    var emailEl2 = document.getElementById('header-email');
    if (emailEl2 && window.FB) emailEl2.textContent = (window.FB.auth.currentUser || {}).email || '';

    CATS.forEach(function(c) { updateDisplay(c); renderGoals(c); });
    updateBadges(level);
    renderExpedition();
    showTab('vps');
};

// ── Auth 상태 감지 (firebase.js 로드 후) ──
window.addEventListener('load', function() {
    // firebase.js가 type="module"이라 약간 늦게 로드됨
    // splash 종료(3.8s) 후 FB 객체 사용
    setTimeout(async function() {
        if (!window.FB) {
            // Firebase 로드 실패 → localStorage 폴백
            console.warn('Firebase not loaded, falling back to localStorage');
            return;
        }

        // ── Redirect 로그인 결과 처리 (Google/Apple 로그인 후 페이지가 돌아왔을 때) ──
        try {
            var redirectUser = await window.FB.handleRedirectResult();
            if (redirectUser) {
                if (localStorage.getItem('keepSignedIn') === null) {
                    localStorage.setItem('keepSignedIn', 'true');
                }
            }
        } catch (e) {
            console.error('Redirect sign-in failed:', e);
            alert('Sign in failed. Please try again.');
        }

        window.FB.onAuthChange(function(user) {
            if (user) {
                // 수동 로그아웃 플래그 체크
                if (localStorage.getItem('manualSignOut') === 'true') {
                    localStorage.removeItem('manualSignOut');
                    window.FB.signOutUser();
                    showScreen('login-screen');
                    return;
                }
                // Keep me signed in 체크 안 했으면 자동 로그인 안 함
                if (localStorage.getItem('keepSignedIn') === 'false') {
                    window.FB.signOutUser();
                    showScreen('login-screen');
                    return;
                }
                // 자동 로그인
                loadUserData(user);
            } else {
                localStorage.removeItem('manualSignOut');
                setTimeout(function() {
                    var splash = document.getElementById('splash-screen');
                    if (!splash || splash.getAttribute('data-done') === 'true') {
                        showScreen('login-screen');
                    } else {
                        setTimeout(function() {
                            showScreen('login-screen');
                        }, 5000);
                    }
                }, 100);
            }
        });
    }, 500);
});

// ── 뒤로가기(Back) 버튼 처리 ──
window.addEventListener('popstate', function(e) {
    var state = e.state;

    // 가이드 오버레이가 열려있으면 먼저 닫기
    var guideEl = document.getElementById('guide-overlay');
    if (guideEl && guideEl.style.display !== 'none') {
        closeGuide();
        history.pushState(state || {}, '', '');
        return;
    }

    // 열려있는 모달 닫기 (모달이 있으면 먼저 닫음)
    var modals = document.querySelectorAll('.modal-overlay');
    var modalOpen = false;
    modals.forEach(function(m) {
        if (m.style.display === 'flex') {
            m.style.display = 'none';
            modalOpen = true;
        }
    });
    if (modalOpen) {
        // 모달 닫은 후 현재 상태 다시 push (앱 종료 방지)
        history.pushState(state || {}, '', '');
        return;
    }
    if (!state) {
        // 히스토리 바닥 → 앱 종료 확인
        if (confirm('앱을 종료하시겠습니까?')) {
            history.back();
        } else {
            var currentTab = localStorage.getItem('activeTab') || 'vps';
            history.pushState({ screen: 'main', tab: currentTab }, '', '');
        }
        return;
    }

    if (state.screen === 'main' && state.tab) {
        // 탭 뒤로가기
        showTab(state.tab, true);
    } else if (state.screen === 'login-screen') {
        showScreen('login-screen', true);
    } else if (state.screen === 'setup-screen') {
        showScreen('setup-screen', true);
    } else {
        // 알 수 없는 상태 → 현재 유지
        history.pushState(state, '', '');
    }
});

// 앱 시작 시 초기 히스토리 상태 설정
window.addEventListener('load', function() {
    if (!history.state) {
        history.replaceState({ screen: 'splash-screen' }, '', '');
    }
});
