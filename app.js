// ─── Congressional Award 전체 레벨 요건 ───
let REQUIREMENTS = {
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

let selectedLevel = localStorage.getItem('selectedLevel') || '';
let currentCategory = '';
let currentGoalIndex = -1;
let currentActivityIndex = -1;

// ─── 새 데이터 구조 ───
// goals[category] = [
//   {
//     name, validator, email,
//     activityTypes: [
//       { name, logs: [ { date, hours, note } ] }
//     ]
//   }
// ]
let goals = JSON.parse(localStorage.getItem('goals')) || {
    'Voluntary Public Service': [],
    'Personal Development': [],
    'Physical Fitness': [],
    'Expedition': []
};

// ─── Goal 모달 ───

function openGoalModal(category) {
    currentCategory = category;
    document.getElementById('goal-modal-title').textContent = 'Add Goal — ' + category;
    document.getElementById('goal-name').value = '';
    document.getElementById('goal-validator').value = '';
    document.getElementById('goal-validator-email').value = '';
    document.getElementById('goal-modal').style.display = 'flex';
}

function closeGoalModal() {
    document.getElementById('goal-modal').style.display = 'none';
}

function saveGoal() {
    let name = document.getElementById('goal-name').value.trim();
    let validator = document.getElementById('goal-validator').value.trim();
    let email = document.getElementById('goal-validator-email').value.trim();

    if (!name) { alert('Please enter a goal name!'); return; }

    let maxGoals = {
        'Voluntary Public Service': 4,
        'Personal Development': 2,
        'Physical Fitness': 2,
        'Expedition': 1
    };

    if (goals[currentCategory].length >= maxGoals[currentCategory]) {
        alert('Maximum ' + maxGoals[currentCategory] + ' goals allowed for ' + currentCategory + '!');
        closeGoalModal();
        return;
    }

    goals[currentCategory].push({
        name: name,
        validator: validator,
        email: email,
        activityTypes: []       // ← 새 구조: activityTypes 배열
    });

    localStorage.setItem('goals', JSON.stringify(goals));
    renderGoals(currentCategory);
    updateDisplay(currentCategory);
    closeGoalModal();
}

// ─── Activity Type 모달 ───
// Goal 안에 "도서관 봉사", "노인 도시락" 같은 활동 종류 추가

function openActivityTypeModal(category, goalIndex) {
    currentCategory = category;
    currentGoalIndex = goalIndex;
    let goalName = goals[category][goalIndex].name;
    document.getElementById('act-type-modal-title').textContent = 'Add Activity Type — ' + goalName;
    document.getElementById('act-type-name').value = '';
    document.getElementById('act-type-modal').style.display = 'flex';
}

function closeActivityTypeModal() {
    document.getElementById('act-type-modal').style.display = 'none';
}

function saveActivityType() {
    let name = document.getElementById('act-type-name').value.trim();
    if (!name) { alert('Please enter an activity type name!'); return; }

    goals[currentCategory][currentGoalIndex].activityTypes.push({
        name: name,
        logs: []            // ← 날짜별 기록 배열
    });

    localStorage.setItem('goals', JSON.stringify(goals));
    renderGoals(currentCategory);
    closeActivityTypeModal();
}

// ─── Log 모달 (날짜별 기록 추가) ───

function openLogModal(category, goalIndex, actIndex) {
    currentCategory = category;
    currentGoalIndex = goalIndex;
    currentActivityIndex = actIndex;
    let actName = goals[category][goalIndex].activityTypes[actIndex].name;
    document.getElementById('log-modal-title').textContent = 'Add Log — ' + actName;
    document.getElementById('log-date').value = '';
    document.getElementById('log-hours').value = '';
    document.getElementById('log-note').value = '';
    document.getElementById('log-modal').style.display = 'flex';
}

function closeLogModal() {
    document.getElementById('log-modal').style.display = 'none';
    currentActivityIndex = -1;
}

function saveLog() {
    let date = document.getElementById('log-date').value;
    let hours = parseFloat(document.getElementById('log-hours').value);
    let note = document.getElementById('log-note').value.trim();

    if (!date) { alert('Please select a date!'); return; }
    if (isNaN(hours) || hours <= 0) { alert('Please enter valid hours (0.5 - 8)!'); return; }
    if (hours > 8) { alert('Maximum 8 hours per day allowed!'); return; }

    let startDate = localStorage.getItem('startDate');
    if (startDate && date < startDate) {
        alert('Date cannot be before your start date (' + startDate + ')!');
        return;
    }

    goals[currentCategory][currentGoalIndex]
        .activityTypes[currentActivityIndex]
        .logs.push({ date: date, hours: hours, note: note });

    localStorage.setItem('goals', JSON.stringify(goals));
    renderGoals(currentCategory);
    updateDisplay(currentCategory);
    closeLogModal();
}

// ─── 화면 업데이트 ───

function updateDisplay(category) {
    // 총 시간 계산 (모든 Goal → ActivityType → logs 합산)
    let totalHours = 0;
    let months = new Set();

    goals[category].forEach(function(goal) {
        goal.activityTypes.forEach(function(act) {
            act.logs.forEach(function(log) {
                totalHours += log.hours;
                months.add(log.date.substring(0, 7));
            });
        });
    });
    let activeMonths = months.size;

    let barId, textId, monthsId;
    if (category === 'Voluntary Public Service') {
        barId = 'vps-bar'; textId = 'vps-text'; monthsId = 'vps-months';
    } else if (category === 'Personal Development') {
        barId = 'pd-bar'; textId = 'pd-text'; monthsId = 'pd-months';
    } else if (category === 'Physical Fitness') {
        barId = 'pf-bar'; textId = 'pf-text'; monthsId = 'pf-months';
    } else {
        barId = 'exp-bar'; textId = 'exp-text'; monthsId = null;
    }

    let req = REQUIREMENTS[selectedLevel];
    let sectionKey = {
        'Voluntary Public Service': 'vps',
        'Personal Development': 'pd',
        'Physical Fitness': 'pf',
        'Expedition': 'exp'
    }[category];

    // 진행률 바
    let percent = 0;
    if (sectionKey === 'exp') {
        let completedDays = 0;
        goals['Expedition'].forEach(function(g) {
            g.activityTypes.forEach(function(act) {
                completedDays += act.logs.length;
            });
        });
        percent = Math.min((completedDays / req.exp.days) * 100, 100);
    } else {
        percent = Math.min((totalHours / req[sectionKey].hours) * 100, 100);
    }
    document.getElementById(barId).style.width = percent.toFixed(1) + '%';

    // 텍스트
    if (sectionKey === 'exp') {
        let completedDays = 0;
        goals['Expedition'].forEach(function(g) {
            g.activityTypes.forEach(function(act) {
                completedDays += act.logs.length;
            });
        });
        document.getElementById(textId).textContent =
            completedDays + ' / ' + req.exp.days + ' days completed' +
            (req.exp.nights > 0 ? ' (' + req.exp.nights + ' nights required)' : '') +
            ' — ' + selectedLevel;
    } else {
        document.getElementById(textId).textContent =
            totalHours + ' / ' + req[sectionKey].hours + ' hours completed (' + selectedLevel + ')';
    }

    // 월 요건
    if (monthsId) {
        let monthReq = req[sectionKey].months;
        if (monthReq === 0) {
            document.getElementById(monthsId).textContent =
                'Active months: ' + activeMonths + ' (no month requirement)';
        } else {
            document.getElementById(monthsId).textContent =
                'Active months: ' + activeMonths + ' / ' + monthReq + ' months';
        }
    }
}

// ─── Goal 렌더링 ───

function renderGoals(category) {
    let sectionId = {
        'Voluntary Public Service': 'vps-goals',
        'Personal Development': 'pd-goals',
        'Physical Fitness': 'pf-goals',
        'Expedition': 'exp-goals'
    }[category];

    let container = document.getElementById(sectionId);
    container.innerHTML = '';

    goals[category].forEach(function(goal, gIdx) {
        // Activity Type별 합산
        let goalTotalHours = 0;
        let goalTotalSessions = 0;
        goal.activityTypes.forEach(function(act) {
            act.logs.forEach(function(log) { goalTotalHours += log.hours; });
            goalTotalSessions += act.logs.length;
        });

        // Activity Types HTML
        let actTypesHtml = '';
        goal.activityTypes.forEach(function(act, aIdx) {
            let actHours = act.logs.reduce(function(s, l) { return s + l.hours; }, 0);
            let actSessions = act.logs.length;

            // 날짜별 로그 (접기/펼치기)
            let logsHtml = '';
            act.logs.forEach(function(log) {
                logsHtml += `
                    <div class="log-item">
                        <span class="log-date">${log.date}</span>
                        <span class="log-hours">${log.hours} hrs</span>
                        ${log.note ? '<span class="log-note">' + log.note + '</span>' : ''}
                    </div>`;
            });

            actTypesHtml += `
                <div class="act-type-card">
                    <div class="act-type-header">
                        <span class="act-type-name">📁 ${act.name}</span>
                        <span class="act-type-summary">${actHours} hrs / ${actSessions} sessions</span>
                        <div class="act-type-btns">
                            <button class="log-btn" onclick="openLogModal('${category}', ${gIdx}, ${aIdx})">+ Log</button>
                            <button class="toggle-btn" onclick="toggleLogs('logs-${category}-${gIdx}-${aIdx}')">▼ View</button>
                            <button class="delete-btn" onclick="deleteActivityType('${category}', ${gIdx}, ${aIdx})">🗑️</button>
                        </div>
                    </div>
                    <div class="logs-container" id="logs-${category}-${gIdx}-${aIdx}" style="display:none">
                        ${logsHtml || '<p class="no-logs">No logs yet.</p>'}
                    </div>
                </div>`;
        });

        let div = document.createElement('div');
        div.className = 'goal-card';
        div.innerHTML = `
            <div class="goal-header">
                <div>
                    <p class="goal-title">📌 ${goal.name}</p>
                    <p class="goal-meta">Validator: ${goal.validator || 'Not set'} &nbsp;|&nbsp; ${goal.email || ''}</p>
                </div>
                <div class="goal-total">${goalTotalHours} hrs<br><span>${goalTotalSessions} sessions</span></div>
            </div>
            ${actTypesHtml}
            <div style="display:flex; gap:8px; margin-top:10px;">
                <button class="add-btn" onclick="openActivityTypeModal('${category}', ${gIdx})">+ Add Activity Type</button>
                <button class="delete-btn" onclick="deleteGoal('${category}', ${gIdx})">🗑️ Delete Goal</button>
            </div>
        `;
        container.appendChild(div);
    });
}

// 로그 접기/펼치기
function toggleLogs(id) {
    let el = document.getElementById(id);
    if (!el) return;
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

// Activity Type 삭제
function deleteActivityType(category, goalIndex, actIndex) {
    if (confirm('Delete this activity type and all its logs?')) {
        goals[category][goalIndex].activityTypes.splice(actIndex, 1);
        localStorage.setItem('goals', JSON.stringify(goals));
        renderGoals(category);
        updateDisplay(category);
    }
}

// Goal 삭제
function deleteGoal(category, index) {
    if (confirm('Delete this goal and all activity types inside?')) {
        goals[category].splice(index, 1);
        localStorage.setItem('goals', JSON.stringify(goals));
        renderGoals(category);
        updateDisplay(category);
    }
}

// ─── 배지 업데이트 ───

function updateBadges(level) {
    let req = REQUIREMENTS[level];
    document.getElementById('vps-badge').textContent = level + ': ' + req.vps.hours + ' hrs';
    document.getElementById('pd-badge').textContent  = level + ': ' + req.pd.hours  + ' hrs';
    document.getElementById('pf-badge').textContent  = level + ': ' + req.pf.hours  + ' hrs';
    document.getElementById('exp-badge').textContent =
        level + ': ' + req.exp.days + ' days' +
        (req.exp.nights > 0 ? ' / ' + req.exp.nights + ' nights' : '');
}

// ─── CSV 내보내기 ───

function exportCSV() {
    function csvField(val) {
        return '"' + String(val).replace(/"/g, '""') + '"';
    }

    let csv = 'Section,Goal,Activity Type,Date,Hours,Note\n';
    let categories = [
        'Voluntary Public Service',
        'Personal Development',
        'Physical Fitness',
        'Expedition'
    ];

    categories.forEach(function(category) {
        goals[category].forEach(function(goal) {
            goal.activityTypes.forEach(function(act) {
                act.logs.forEach(function(log) {
                    csv += csvField(category) + ',' +
                           csvField(goal.name) + ',' +
                           csvField(act.name) + ',' +
                           csvField(log.date) + ',' +
                           csvField(log.hours) + ',' +
                           csvField(log.note || '') + '\n';
                });
            });
        });
    });

    let blob = new Blob([csv], { type: 'text/csv' });
    let url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = url;
    a.download = 'congressional-award-' + (localStorage.getItem('userName') || 'export') + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ─── 앱 시작 ───

function startApp() {
    let name = document.getElementById('setup-name').value.trim();
    let level = document.getElementById('setup-level').value;

    if (!name)  { alert('Please enter your name!'); return; }
    if (!level) { alert('Please select your target award level!'); return; }

    selectedLevel = level;
    localStorage.setItem('selectedLevel', level);
    localStorage.setItem('userName', name);
    localStorage.setItem('startDate', new Date().toISOString().split('T')[0]);

    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('main-screen').style.display = 'block';
    document.getElementById('header-name').textContent = name + ' | ' + level;

    ['Voluntary Public Service','Personal Development','Physical Fitness','Expedition']
        .forEach(function(c) { updateDisplay(c); });
    updateBadges(level);
}

// ─── Settings 모달 ───

function openSettingsModal() {
    document.getElementById('settings-name').value  = localStorage.getItem('userName') || '';
    document.getElementById('settings-level').value = localStorage.getItem('selectedLevel') || '';
    document.getElementById('settings-modal').style.display = 'flex';
}

function closeSettingsModal() {
    document.getElementById('settings-modal').style.display = 'none';
}

function saveSettings() {
    let name  = document.getElementById('settings-name').value.trim();
    let level = document.getElementById('settings-level').value;
    if (!name)  { alert('Please enter your name!'); return; }
    if (!level) { alert('Please select a level!'); return; }

    selectedLevel = level;
    localStorage.setItem('userName', name);
    localStorage.setItem('selectedLevel', level);
    document.getElementById('header-name').textContent = name + ' | ' + level;

    ['Voluntary Public Service','Personal Development','Physical Fitness','Expedition']
        .forEach(function(c) { updateDisplay(c); });
    updateBadges(level);
    closeSettingsModal();
}

function resetAllData() {
    if (confirm('⚠️ This will permanently delete ALL your data.\n\nAre you sure?')) {
        if (confirm('Last warning — delete everything and start over?')) {
            localStorage.clear();
            goals = {
                'Voluntary Public Service': [],
                'Personal Development': [],
                'Physical Fitness': [],
                'Expedition': []
            };
            selectedLevel = '';
            document.getElementById('main-screen').style.display = 'none';
            document.getElementById('setup-screen').style.display = 'flex';
            document.getElementById('setup-name').value  = '';
            document.getElementById('setup-level').value = '';
            closeSettingsModal();
        }
    }
}

// ─── 페이지 로드 ───

window.onload = function() {
    let savedName  = localStorage.getItem('userName');
    let savedLevel = localStorage.getItem('selectedLevel');

    if (savedName && savedLevel) {
        selectedLevel = savedLevel;
        document.getElementById('setup-screen').style.display = 'none';
        document.getElementById('main-screen').style.display  = 'block';
        document.getElementById('header-name').textContent = savedName + ' | ' + savedLevel;

        ['Voluntary Public Service','Personal Development','Physical Fitness','Expedition']
            .forEach(function(c) {
                updateDisplay(c);
                renderGoals(c);
            });
        updateBadges(savedLevel);
    }
};
