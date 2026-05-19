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

let goals = JSON.parse(localStorage.getItem('goals')) || {
    'Voluntary Public Service': [],
    'Personal Development': [],
    'Physical Fitness': [],
    'Expedition': []
};

// ─── Goal 모달 ───

function openGoalModal(category) {
    currentCategory = category;
    document.getElementById('goal-modal-title').textContent = 'Add Goal - ' + category;
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

    if (!name) {
        alert('Please enter a goal name!');
        return;
    }

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

    let goal = {
        name: name,
        validator: validator,
        email: email,
        activities: []
    };

    goals[currentCategory].push(goal);
    localStorage.setItem('goals', JSON.stringify(goals));
    renderGoals(currentCategory);
    updateDisplay(currentCategory);
    closeGoalModal();
}

// ─── Activity 모달 ───

function openActivityModal(category, goalIndex) {
    currentCategory = category;
    currentGoalIndex = goalIndex;
    let goalName = goals[category][goalIndex].name;
    document.getElementById('modal-title').textContent = 'Add Activity - ' + goalName;
    document.getElementById('modal').style.display = 'flex';
    document.getElementById('input-date').value = '';
    document.getElementById('input-hours').value = '';
    document.getElementById('input-desc').value = '';
    document.getElementById('input-photo').value = '';
    // FIX BUG-02: reset file label text
    document.getElementById('file-label-text').textContent = '📎 Attach Photo (optional)';
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
    currentGoalIndex = -1; // FIX WARN-01: reset on close
}

// FIX BUG-02: file input change handler - show selected filename
document.addEventListener('DOMContentLoaded', function() {
    let photoInput = document.getElementById('input-photo');
    if (photoInput) {
        photoInput.addEventListener('change', function() {
            let label = document.getElementById('file-label-text');
            if (this.files && this.files[0]) {
                label.textContent = '✅ ' + this.files[0].name;
            } else {
                label.textContent = '📎 Attach Photo (optional)';
            }
        });
    }
});

function saveActivity() {
    let date = document.getElementById('input-date').value; // YYYY-MM-DD from type=date
    let hours = parseFloat(document.getElementById('input-hours').value);
    let desc = document.getElementById('input-desc').value.trim();
    let photoFile = document.getElementById('input-photo').files[0];

    if (!date) {
        alert('Please select a date!');
        return;
    }

    // FIX BUG-05: proper hours validation
    if (isNaN(hours) || hours <= 0) {
        alert('Please enter valid hours (0.5 - 8)!');
        return;
    }

    if (!desc) {
        alert('Please describe your activity!');
        return;
    }

    if (hours > 8) {
        alert('Maximum 8 hours per day allowed!');
        return;
    }

    let startDate = localStorage.getItem('startDate');
    if (startDate && date < startDate) {
        alert('Activity date cannot be before your start date (' + startDate + ')!');
        return;
    }

    if (photoFile) {
        let reader = new FileReader();
        reader.onload = function(e) {
            let activity = {
                date: date,
                hours: hours,
                desc: desc,
                photo: null
            };
            goals[currentCategory][currentGoalIndex].activities.push(activity);
            localStorage.setItem('goals', JSON.stringify(goals));
            renderGoals(currentCategory);
            updateDisplay(currentCategory);
            closeModal();
        };
        reader.readAsDataURL(photoFile);
    } else {
        let activity = {
            date: date,
            hours: hours,
            desc: desc,
            photo: null
        };
        goals[currentCategory][currentGoalIndex].activities.push(activity);
        localStorage.setItem('goals', JSON.stringify(goals));
        renderGoals(currentCategory);
        updateDisplay(currentCategory);
        closeModal();
    }
}

// ─── 화면 업데이트 ───

function updateDisplay(category) {
    let totalHours = 0;
    goals[category].forEach(function(goal) {
        goal.activities.forEach(function(a) {
            totalHours += a.hours;
        });
    });

    let months = new Set();
    goals[category].forEach(function(goal) {
        goal.activities.forEach(function(a) {
            months.add(a.date.substring(0, 7));
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

    let percent = 0;
    if (sectionKey === 'exp') {
        let expDays = goals['Expedition'].reduce(function(total, g) {
            return total + g.activities.length;
        }, 0);
        percent = Math.min((expDays / req.exp.days) * 100, 100);
    } else {
        let goalHours = req[sectionKey].hours;
        percent = Math.min((totalHours / goalHours) * 100, 100);
    }
    document.getElementById(barId).style.width = percent.toFixed(1) + '%';

    // FIX BUG-04: Expedition text now shows actual completed days vs required
    if (sectionKey === 'exp') {
        let completedDays = goals['Expedition'].reduce(function(total, g) {
            return total + g.activities.length;
        }, 0);
        let reqDays = req.exp.days;
        let reqNights = req.exp.nights;
        document.getElementById(textId).textContent =
            completedDays + ' / ' + reqDays + ' days completed' +
            (reqNights > 0 ? ' (' + reqNights + ' nights required)' : '') +
            ' — ' + selectedLevel;
    } else {
        let goalHours = req[sectionKey].hours;
        document.getElementById(textId).textContent =
            totalHours + ' / ' + goalHours + ' hours completed (' + selectedLevel + ')';
    }

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

    goals[category].forEach(function(goal, index) {
        let div = document.createElement('div');
        div.className = 'goal-card';

        let activityHtml = '';
        goal.activities.forEach(function(a) {
            activityHtml += `
                <div class="activity-item">
                    <strong>${a.date}</strong> — ${a.hours} hrs<br>
                    <span>${a.desc}</span>
                </div>
            `;
        });

        div.innerHTML = `
            <p><strong>📌 ${goal.name}</strong></p>
            <p>Validator: ${goal.validator || 'Not set'}</p>
            <p>Email: ${goal.email || 'Not set'}</p>
            <div style="display:flex; gap:8px; margin-top:6px;">
                <button class="add-btn" onclick="openActivityModal('${category}', ${index})">+ Add Activity</button>
                <button class="delete-btn" onclick="deleteGoal('${category}', ${index})">🗑️ Delete Goal</button>
            </div>
            ${activityHtml}
        `;
        container.appendChild(div);
    });
}

function deleteGoal(category, index) {
    if (confirm('Delete this goal? All activities inside will also be deleted.')) {
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
    document.getElementById('pd-badge').textContent = level + ': ' + req.pd.hours + ' hrs';
    document.getElementById('pf-badge').textContent = level + ': ' + req.pf.hours + ' hrs';
    document.getElementById('exp-badge').textContent =
        level + ': ' + req.exp.days + ' days' +
        (req.exp.nights > 0 ? ' / ' + req.exp.nights + ' nights' : '');
}

// ─── CSV 내보내기 ───

function exportCSV() {
    let csv = "Section,Goal,Date,Hours,Description\n";

    let categories = [
        'Voluntary Public Service',
        'Personal Development',
        'Physical Fitness',
        'Expedition'
    ];

    // FIX BUG-06: wrap fields in quotes to handle commas in descriptions
    function csvField(val) {
        return '"' + String(val).replace(/"/g, '""') + '"';
    }

    categories.forEach(function(category) {
        goals[category].forEach(function(goal) {
            goal.activities.forEach(function(a) {
                csv += csvField(category) + ',' +
                       csvField(goal.name) + ',' +
                       csvField(a.dateDisplay || a.date) + ',' +
                       csvField(a.hours) + ',' +
                       csvField(a.desc) + '\n';
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

    if (!name) {
        alert('Please enter your name!');
        return;
    }
    if (!level) {
        alert('Please select your target award level!');
        return;
    }

    selectedLevel = level;
    localStorage.setItem('selectedLevel', level);
    localStorage.setItem('userName', name);

    let today = new Date().toISOString().split('T')[0];
    localStorage.setItem('startDate', today);

    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('main-screen').style.display = 'block';
    document.getElementById('header-name').textContent = name + ' | ' + level;

    updateDisplay('Voluntary Public Service');
    updateDisplay('Personal Development');
    updateDisplay('Physical Fitness');
    updateDisplay('Expedition');
    updateBadges(level);
}

// ─── Settings 모달 ───

function openSettingsModal() {
    document.getElementById('settings-name').value = localStorage.getItem('userName') || '';
    document.getElementById('settings-level').value = localStorage.getItem('selectedLevel') || '';
    document.getElementById('settings-modal').style.display = 'flex';
}

function closeSettingsModal() {
    document.getElementById('settings-modal').style.display = 'none';
}

// 데이터 유지하면서 이름/레벨만 변경
function saveSettings() {
    let name = document.getElementById('settings-name').value.trim();
    let level = document.getElementById('settings-level').value;

    if (!name) { alert('Please enter your name!'); return; }
    if (!level) { alert('Please select a level!'); return; }

    selectedLevel = level;
    localStorage.setItem('userName', name);
    localStorage.setItem('selectedLevel', level);

    document.getElementById('header-name').textContent = name + ' | ' + level;
    updateDisplay('Voluntary Public Service');
    updateDisplay('Personal Development');
    updateDisplay('Physical Fitness');
    updateDisplay('Expedition');
    updateBadges(level);
    closeSettingsModal();
}

// 전체 데이터 삭제 (Danger Zone)
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
            document.getElementById('setup-name').value = '';
            document.getElementById('setup-level').value = '';
            closeSettingsModal();
        }
    }
}

// ─── 페이지 열릴 때 ───

window.onload = function() {
    let savedName = localStorage.getItem('userName');
    let savedLevel = localStorage.getItem('selectedLevel');

    if (savedName && savedLevel) {
        selectedLevel = savedLevel;
        document.getElementById('setup-screen').style.display = 'none';
        document.getElementById('main-screen').style.display = 'block';
        document.getElementById('header-name').textContent = savedName + ' | ' + savedLevel;

        updateDisplay('Voluntary Public Service');
        updateDisplay('Personal Development');
        updateDisplay('Physical Fitness');
        updateDisplay('Expedition');
        updateBadges(savedLevel);

        renderGoals('Voluntary Public Service');
        renderGoals('Personal Development');
        renderGoals('Physical Fitness');
        renderGoals('Expedition');
    }
};
