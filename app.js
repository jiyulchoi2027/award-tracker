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

// ─── 데이터 구조 ───
// goals[category] = [{
//   name, validator, email,
//   activityTypes: [{ name, logs: [{ date, hours, note }] }]
// }]
let goals = JSON.parse(localStorage.getItem('goals')) || {
    'Voluntary Public Service': [],
    'Personal Development':     [],
    'Physical Fitness':         [],
    'Expedition':               []
};

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
}

function today() {
    let d = new Date();
    let yyyy = d.getFullYear();
    let mm   = String(d.getMonth() + 1).padStart(2, '0');
    let dd   = String(d.getDate()).padStart(2, '0');
    return yyyy + '-' + mm + '-' + dd;
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
    } else {
        // 신규 모드
        document.getElementById('goal-modal-title').textContent = 'Add Goal — ' + category;
        document.getElementById('goal-name').value            = '';
        document.getElementById('goal-validator').value       = '';
        document.getElementById('goal-validator-email').value = '';
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

    if (!name) { alert('Please enter a goal name!'); return; }

    if (currentGoalIndex >= 0) {
        // 수정
        goals[currentCategory][currentGoalIndex].name      = name;
        goals[currentCategory][currentGoalIndex].validator = validator;
        goals[currentCategory][currentGoalIndex].email     = email;
    } else {
        // 신규 — 개수 제한 체크
        const maxGoals = { 'Voluntary Public Service':4, 'Personal Development':2, 'Physical Fitness':2, 'Expedition':1 };
        if (goals[currentCategory].length >= maxGoals[currentCategory]) {
            alert('Maximum ' + maxGoals[currentCategory] + ' goals allowed for ' + currentCategory + '!');
            closeGoalModal();
            return;
        }
        goals[currentCategory].push({ name, validator, email, activityTypes: [] });
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
    } else {
        // 신규 모드
        let actName = goals[category][goalIndex].activityTypes[actIndex].name;
        document.getElementById('log-modal-title').textContent = 'Add Log — ' + actName;
        document.getElementById('log-date').value  = '';
        document.getElementById('log-hours').value = '';
        document.getElementById('log-note').value  = '';
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

    // B1 수정: startDate와 같은 날은 허용 (< 만 차단, <= 아님)
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

    if (editingLogIndex >= 0) {
        // 수정
        logs[editingLogIndex] = { date, hours, note };
    } else {
        // 신규
        logs.push({ date, hours, note });
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

// ════════════════════════════════════════════
// 화면 업데이트
// ════════════════════════════════════════════

function updateDisplay(category) {
    let totalHours = 0;
    let months     = new Set();

    goals[category].forEach(function(goal) {
        goal.activityTypes.forEach(function(act) {
            act.logs.forEach(function(log) {
                totalHours += log.hours;
                months.add(log.date.substring(0, 7));
            });
        });
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

    // 진행률 계산
    let percent = 0;
    let completedDays = 0;
    if (sectionKey === 'exp') {
        goals['Expedition'].forEach(function(g) {
            g.activityTypes.forEach(function(act) { completedDays += act.logs.length; });
        });
        percent = Math.min((completedDays / req.exp.days) * 100, 100);
    } else {
        percent = Math.min((totalHours / req[sectionKey].hours) * 100, 100);
    }

    // 진행률 바 색상 (100% 달성 시 녹색)
    let barEl = document.getElementById(barId);
    barEl.style.width = percent.toFixed(1) + '%';
    barEl.style.backgroundColor = percent >= 100 ? '#27ae60' : '#1a3a6b';

    // 텍스트
    let textEl = document.getElementById(textId);
    if (sectionKey === 'exp') {
        textEl.textContent =
            completedDays + ' / ' + req.exp.days + ' days completed' +
            (req.exp.nights > 0 ? ' (' + req.exp.nights + ' nights required)' : '') +
            ' — ' + selectedLevel;
    } else {
        let done = percent >= 100 ? ' ✅' : '';
        textEl.textContent =
            totalHours + ' / ' + req[sectionKey].hours + ' hours completed (' + selectedLevel + ')' + done;
    }

    // 월 요건
    if (monthsId) {
        let monthReq = req[sectionKey].months;
        let monthEl  = document.getElementById(monthsId);
        if (monthReq === 0) {
            monthEl.textContent = 'Active months: ' + activeMonths + ' (no month requirement)';
        } else {
            let monthDone = activeMonths >= monthReq ? ' ✅' : '';
            monthEl.textContent = 'Active months: ' + activeMonths + ' / ' + monthReq + ' months' + monthDone;
        }
    }
}

// ════════════════════════════════════════════
// Goal 렌더링
// ════════════════════════════════════════════

function renderGoals(category) {
    const sectionIds = {
        'Voluntary Public Service': 'vps-goals',
        'Personal Development':     'pd-goals',
        'Physical Fitness':         'pf-goals',
        'Expedition':               'exp-goals'
    };
    let container = document.getElementById(sectionIds[category]);
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
                        <span class="log-date">${log.date}</span>
                        <span class="log-hours">${log.hours} hrs</span>
                        <span class="log-note">${log.note || ''}</span>
                        <div class="log-actions">
                            <button class="log-edit-btn" onclick="openLogModal('${category}',${gIdx},${aIdx},${lIdx})">✏️</button>
                            <button class="log-del-btn"  onclick="deleteLog('${category}',${gIdx},${aIdx},${lIdx})">🗑️</button>
                        </div>
                    </div>`;
            });

            actTypesHtml += `
                <div class="act-type-card">
                    <div class="act-type-header">
                        <span class="act-type-name">📁 ${act.name}</span>
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
                    <p class="goal-title">📌 ${goal.name}</p>
                    <p class="goal-meta">Validator: ${goal.validator || 'Not set'}&nbsp;|&nbsp;${goal.email || '—'}</p>
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
function showTab(tab) {
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
    let req = REQUIREMENTS[level];
    document.getElementById('vps-badge').textContent = level + ': ' + req.vps.hours + ' hrs';
    document.getElementById('pd-badge').textContent  = level + ': ' + req.pd.hours  + ' hrs';
    document.getElementById('pf-badge').textContent  = level + ': ' + req.pf.hours  + ' hrs';
    document.getElementById('exp-badge').textContent =
        level + ': ' + req.exp.days + ' days' +
        (req.exp.nights > 0 ? ' / ' + req.exp.nights + ' nights' : '');
}

// ════════════════════════════════════════════
// CSV 내보내기
// ════════════════════════════════════════════

function exportCSV() {
    function f(val) { return '"' + String(val).replace(/"/g,'""') + '"'; }

    let csv = 'Section,Goal,Activity Type,Date,Hours,Note\n';
    CATS.forEach(function(cat) {
        goals[cat].forEach(function(goal) {
            goal.activityTypes.forEach(function(act) {
                act.logs.forEach(function(log) {
                    csv += f(cat)+','+f(goal.name)+','+f(act.name)+','+f(log.date)+','+f(log.hours)+','+f(log.note||'')+'\n';
                });
            });
        });
    });

    let blob = new Blob([csv], { type:'text/csv' });
    let url  = URL.createObjectURL(blob);
    let a    = document.createElement('a');
    a.href   = url;
    a.download = 'congressional-award-' + (localStorage.getItem('userName') || 'export') + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ════════════════════════════════════════════
// 앱 시작
// ════════════════════════════════════════════

function startApp() {
    let name  = document.getElementById('setup-name').value.trim();
    let level = document.getElementById('setup-level').value;

    if (!name)  { alert('Please enter your name!'); return; }
    if (!level) { alert('Please select your target award level!'); return; }

    selectedLevel = level;
    localStorage.setItem('selectedLevel', level);
    localStorage.setItem('userName', name);
    localStorage.setItem('startDate', today());

    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('main-screen').style.display  = 'block';
    document.getElementById('header-name').textContent    = name + ' | ' + level;

    CATS.forEach(function(c) { updateDisplay(c); });
    updateBadges(level);
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
}

function closeSettingsModal() {
    document.getElementById('settings-modal').style.display = 'none';
}

function saveSettings() {
    let name      = document.getElementById('settings-name').value.trim();
    let level     = document.getElementById('settings-level').value;
    let startDate = document.getElementById('settings-startdate').value;

    if (!name)  { alert('Please enter your name!'); return; }
    if (!level) { alert('Please select a level!');  return; }
    if (!startDate) { alert('Please select a start date!'); return; }

    // B3 수정: selectedLevel 전역 변수 반드시 업데이트
    selectedLevel = level;
    localStorage.setItem('userName',      name);
    localStorage.setItem('selectedLevel', level);
    localStorage.setItem('startDate',     startDate);

    document.getElementById('header-name').textContent = name + ' | ' + level;

    CATS.forEach(function(c) { updateDisplay(c); });
    updateBadges(level);
    closeSettingsModal();
}

function resetAllData() {
    if (confirm('⚠️ This will permanently delete ALL your data.\n\nAre you sure?')) {
        if (confirm('Last warning — delete everything and start over?')) {
            localStorage.clear();
            goals = {
                'Voluntary Public Service': [],
                'Personal Development':     [],
                'Physical Fitness':         [],
                'Expedition':               []
            };
            selectedLevel = '';
            document.getElementById('main-screen').style.display  = 'none';
            document.getElementById('setup-screen').style.display = 'flex';
            document.getElementById('setup-name').value  = '';
            document.getElementById('setup-level').value = '';
            closeSettingsModal();
        }
    }
}

// ════════════════════════════════════════════
// 페이지 로드
// ════════════════════════════════════════════

window.onload = function() {
    let savedName  = localStorage.getItem('userName');
    let savedLevel = localStorage.getItem('selectedLevel');

    if (savedName && savedLevel) {
        selectedLevel = savedLevel;
        document.getElementById('setup-screen').style.display = 'none';
        document.getElementById('main-screen').style.display  = 'block';
        document.getElementById('header-name').textContent    = savedName + ' | ' + savedLevel;

        CATS.forEach(function(c) {
            updateDisplay(c);
            renderGoals(c);
        });
        updateBadges(savedLevel);
        // 마지막으로 열었던 탭 복원
        let lastTab = localStorage.getItem('activeTab') || 'vps';
        showTab(lastTab);
    }
};