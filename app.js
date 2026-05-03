// ─── Congressional Award 전체 레벨 요건 ───
// Program Book p.4 기준
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
let selectedLevel = localStorage.getItem('selectedLevel') || 'Silver Medal';

// 현재 선택된 영역 저장
let currentCategory = '';

// 각 영역별 활동 데이터
let activities = JSON.parse(localStorage.getItem('activities')) || {
    'Voluntary Public Service': [],
    'Personal Development': [],
    'Physical Fitness': [],
    'Expedition': []
};

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
    document.getElementById(textId).textContent = 
        totalHours + ' / ' + goal + ' hours completed (Silver Goal)';
    
    if (monthsId) {
        document.getElementById(monthsId).textContent = 
            'Active months: ' + activeMonths + ' / 12 months';
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
}// 데이터 저장
    localStorage.setItem('activities', JSON.stringify(activities));
}
// 페이지 열릴 때 저장된 데이터 불러오기
window.onload = function() {
    updateDisplay('Voluntary Public Service');
    updateDisplay('Personal Development');
    updateDisplay('Physical Fitness');
    updateDisplay('Expedition');
};