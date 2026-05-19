// ─── Congressional Award 전체 레벨 요건 ───
// Program Book p.4 기준 (Updated May 2026)
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

// 현재 선택된 레벨 (기본값: Silver Medal)
let selectedLevel = localStorage.getItem('selectedLevel') || '';

// 현재 선택된 영역 저장
let currentCategory = '';

// 각 영역별 활동 데이터
let activities = JSON.parse(localStorage.getItem('activities')) || {
    'Voluntary Public Service': [],
    'Personal Development': [],
    'Physical Fitness': [],
    'Expedition': []
};
// 각 영역별 Goal 데이터
let goals = JSON.parse(localStorage.getItem('goals')) || {
    'Voluntary Public Service': [],
    'Personal Development': [],
    'Physical Fitness': [],
    'Expedition': []
};
// Goal 모달창 열기
function openGoalModal(category) {
    currentCategory = category;
    document.getElementById('goal-modal-title').textContent = 
        'Add Goal - ' + category;
    document.getElementById('goal-name').value = '';
    document.getElementById('goal-validator').value = '';
    document.getElementById('goal-validator-email').value = '';
    document.getElementById('goal-modal').style.display = 'flex';
}

// Goal 모달창 닫기
function closeGoalModal() {
    document.getElementById('goal-modal').style.display = 'none';
}

// Goal 저장
function saveGoal() {
    let name = document.getElementById('goal-name').value.trim();
    let validator = document.getElementById('goal-validator').value.trim();
    let email = document.getElementById('goal-validator-email').value.trim();

    if (!name) {
        alert('Please enter a goal name!');
        return;
    }

        // Goal 개수 제한
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
    
    // Goal 데이터 저장
    let goal = {
        name: name,
        validator: validator,
        email: email,
        activities: []
    };

    goals[currentCategory].push(goal);
    localStorage.setItem('goals', JSON.stringify(goals));
    renderGoals(currentCategory);
    closeGoalModal();
}
// 모달창 열기
function openModal(category) {
    currentCategory = category;
    document.getElementById('modal-title').textContent = 
        'Add Activity - ' + category;
    document.getElementById('modal').style.display = 'flex';
    document.getElementById('input-date').value = '';
    document.getElementById('input-hours').value = '';
    document.getElementById('input-desc').value = '';
    document.getElementById('input-photo').value = '';
}

// 모달창 닫기
function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

// 활동 저장
function saveActivity() {
    let date = document.getElementById('input-date').value;
    let hours = parseFloat(document.getElementById('input-hours').value);
    let desc = document.getElementById('input-desc').value;
    let photoFile = document.getElementById('input-photo').files[0];

    // 빈칸 체크
    if (!date || !hours || !desc) {
        alert('Please fill in all fields!');
        return;
    }

    // 하루 8시간 초과 체크
    if (hours > 8) {
        alert('Maximum 8 hours per day allowed!');
        return;
    }

    // 사진 처리
    if (photoFile) {
        let reader = new FileReader();
        reader.onload = function(e) {
            let activity = {
                date: date,
                hours: hours,
                desc: desc,
                photo: e.target.result
            };
            activities[currentCategory].push(activity);
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
        activities[currentCategory].push(activity);
        updateDisplay(currentCategory);
        closeModal();
    }
}

// 화면 업데이트
function updateDisplay(category) {
    let list = activities[category];
    
    // 총 시간 계산
    let totalHours = 0;
    list.forEach(a => totalHours += a.hours);

    // 활성 월 계산
    let months = new Set();
    list.forEach(a => {
        let month = a.date.substring(0, 7);
        months.add(month);
    });
    let activeMonths = months.size;

    // 영역별 ID 설정
    let barId, textId, monthsId, listId;
    if (category === 'Voluntary Public Service') {
        barId = 'vps-bar'; textId = 'vps-text'; 
        monthsId = 'vps-months'; listId = 'vps-list';
    } else if (category === 'Personal Development') {
        barId = 'pd-bar'; textId = 'pd-text'; 
        monthsId = 'pd-months'; listId = 'pd-list';
    } else if (category === 'Physical Fitness') {
        barId = 'pf-bar'; textId = 'pf-text'; 
        monthsId = 'pf-months'; listId = 'pf-list';
    } else {
        barId = 'exp-bar'; textId = 'exp-text'; 
        monthsId = null; listId = 'exp-list';
    }
    
    // 진행률 바 업데이트
    // 현재 선택된 레벨의 요건 가져오기
let req = REQUIREMENTS[selectedLevel];
let sectionKey = {
    'Voluntary Public Service': 'vps',
    'Personal Development': 'pd',
    'Physical Fitness': 'pf',
    'Expedition': 'exp'
}[category];
let goal = req[sectionKey].hours;
    let percent = Math.min((totalHours / goal) * 100, 100);
    document.getElementById(barId).style.width = percent + '%';

    // 텍스트 업데이트
    // Expedition은 hours 대신 days/nights 표시
    if (sectionKey === 'exp') {
        let expDays = req.exp.days;
        let expNights = req.exp.nights;
        document.getElementById(textId).textContent = 
            'Required: ' + expDays + ' days' + 
            (expNights > 0 ? ' / ' + expNights + ' nights' : '') + 
            ' (' + selectedLevel + ')';
    } else {
        document.getElementById(textId).textContent = 
            totalHours + ' / ' + goal + ' hours completed (' + selectedLevel + ')';
    }
    
    if (monthsId) {
        let monthReq = req[sectionKey].months;
        // Certificate 레벨은 월 요건 없음
        if (monthReq === 0) {
            document.getElementById(monthsId).textContent = 
                'Active months: ' + activeMonths + ' (no month requirement)';
        } else {
            document.getElementById(monthsId).textContent = 
                'Active months: ' + activeMonths + ' / ' + monthReq + ' months';
        }
    }

    // 활동 목록 표시
    let listEl = document.getElementById(listId);
    listEl.innerHTML = '';
    list.forEach(function(a) {
        let item = document.createElement('div');
        item.className = 'activity-item';
        item.innerHTML = `
            <strong>${a.date}</strong> — ${a.hours} hrs<br>
            <span>${a.desc}</span>
            ${a.photo ? '<br><img src="' + a.photo + '" class="activity-photo">' : ''}
        `;
        listEl.appendChild(item);
    });
    // 데이터 저장
    localStorage.setItem('activities', JSON.stringify(activities));
}
// 앱 시작
function startApp() {
    let name = document.getElementById('setup-name').value.trim();
    let level = document.getElementById('setup-level').value;

    // 이름 입력 안 했을 때 경고
    if (!name) {
        alert('Please enter your name!');
        return;
    }
    // 레벨 선택 안 했을 때 경고
    if (!level) {
        alert('Please select your target award level!');
        return;
    }

    // 선택한 레벨 저장
    selectedLevel = level;
    localStorage.setItem('selectedLevel', level);
    localStorage.setItem('userName', name);

    // 화면 전환
    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('main-screen').style.display = 'block';

    // 헤더에 이름 표시
    document.getElementById('header-name').textContent = 
        name + ' | ' + level;

    updateDisplay('Voluntary Public Service');
    updateDisplay('Personal Development');
    updateDisplay('Physical Fitness');
    updateDisplay('Expedition');
    // 선택한 레벨에 맞게 배지 업데이트
    updateBadges(level);
}
// 레벨에 맞게 배지 업데이트
function updateBadges(level) {
    let req = REQUIREMENTS[level];

    // VPS 배지
    document.getElementById('vps-badge').textContent = 
        level + ': ' + req.vps.hours + 'hrs';

    // PD 배지
    document.getElementById('pd-badge').textContent = 
        level + ': ' + req.pd.hours + 'hrs';

    // PF 배지
    document.getElementById('pf-badge').textContent = 
        level + ': ' + req.pf.hours + 'hrs';

    // Expedition 배지
    document.getElementById('exp-badge').textContent = 
        level + ': ' + req.exp.days + ' days ' + 
        (req.exp.nights > 0 ? req.exp.nights + ' nights' : '');
}
// Goal 화면에 표시
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
        div.innerHTML = `
            <p><strong>📌 ${goal.name}</strong></p>
            <p>Validator: ${goal.validator || 'Not set'}</p>
            <p>Email: ${goal.email || 'Not set'}</p>
            <button class="delete-btn" onclick="deleteGoal('${category}', ${index})">🗑️ Delete Goal</button>
        `;
        container.appendChild(div);
    });
}
// Goal 삭제
function deleteGoal(category, index) {
    if (confirm('Delete this goal?')) {
        goals[category].splice(index, 1);
        localStorage.setItem('goals', JSON.stringify(goals));
        renderGoals(category);
    }
}
// CSV 내보내기 기능
function exportCSV() {

    // CSV 첫 줄 (제목행)
    let csv = "Section,Date,Hours,Description\n";

    // 4개 영역 순서대로
    let categories = [
        'Voluntary Public Service',
        'Personal Development',
        'Physical Fitness',
        'Expedition'
    ];

    categories.forEach(function(category) {
        activities[category].forEach(function(a) {
            csv += category + ","
                 + a.date + ","
                 + a.hours + ","
                 + a.desc + "\n";
        });
    });

    // 파일 다운로드
    let blob = new Blob([csv], { type: 'text/csv' });
    let url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = url;
    a.download = "congressional-award.csv";
    a.click();
}
// 페이지 열릴 때
window.onload = function() {
    let savedName = localStorage.getItem('userName');
    let savedLevel = localStorage.getItem('selectedLevel');

    // 이미 설정했으면 바로 메인 화면으로
    if (savedName && savedLevel) {
        selectedLevel = savedLevel;
        document.getElementById('setup-screen').style.display = 'none';
        document.getElementById('main-screen').style.display = 'block';
        document.getElementById('header-name').textContent = 
            savedName + ' | ' + savedLevel;
        updateDisplay('Voluntary Public Service');
        updateDisplay('Personal Development');
        updateDisplay('Physical Fitness');
        updateDisplay('Expedition');
        // 저장된 레벨로 배지 업데이트
        updateBadges(savedLevel);
    }
};