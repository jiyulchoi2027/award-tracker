// ════════════════════════════════════════════
// firebase.js — Award Compass Firebase 설정
// ════════════════════════════════════════════

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, OAuthProvider, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged,
         createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail }
    from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc,
         collection, getDocs, writeBatch }
    from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js';

// ── Firebase Config ──
const firebaseConfig = {
    apiKey:            "AIzaSyCloXw1NmF8kbvNxExX9-_D7KE5MnS1SA8",
    authDomain:        "award-compass.firebaseapp.com",
    projectId:         "award-compass",
    storageBucket:     "award-compass.firebasestorage.app",
    messagingSenderId: "626003001276",
    appId:             "1:626003001276:web:a2834848ec3028fb5035b9",
    measurementId:     "G-SG0KNFQZM6"
};

const app      = initializeApp(firebaseConfig);
const auth     = getAuth(app);
const db       = getFirestore(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

// ── 현재 유저 uid ──
let currentUid = null;

// ════════════════════════════════════════════
// Auth 함수
// ════════════════════════════════════════════

// Google 로그인 (redirect 방식 — iOS WebView/Safari 호환)
async function signInWithGoogle() {
    try {
        await signInWithRedirect(auth, provider);
        // redirect 방식은 즉시 결과를 반환하지 않음.
        // 로그인 후 페이지가 다시 로드되면 handleRedirectResult()에서 결과를 받음.
    } catch (e) {
        console.error('Login failed:', e);
        throw e;
    }
}

// Apple 로그인 (redirect 방식)
async function signInWithApple() {
    try {
        const appleProvider = new OAuthProvider('apple.com');
        appleProvider.addScope('email');
        appleProvider.addScope('name');
        await signInWithRedirect(auth, appleProvider);
    } catch (e) {
        console.error('Apple Login failed:', e);
        throw e;
    }
}

// redirect 로그인 결과 처리 — 앱 로드 시 반드시 호출 필요
async function handleRedirectResult() {
    try {
        const result = await getRedirectResult(auth);
        if (result && result.user) {
            currentUid = result.user.uid;
            return result.user;
        }
        return null;
    } catch (e) {
        console.error('Redirect result error:', e);
        return null;
    }
}

// 로그아웃
async function signOutUser() {
    try {
        await signOut(auth);
        currentUid = null;
    } catch (e) {
        console.error('Logout failed:', e);
    }
}

// Auth 상태 변경 감지
function onAuthChange(callback) {
    onAuthStateChanged(auth, function(user) {
        currentUid = user ? user.uid : null;
        callback(user);
    });
}

// ════════════════════════════════════════════
// Firestore 경로 헬퍼
// ════════════════════════════════════════════
// users/{uid}/profile
// users/{uid}/levels/{levelName}/goals    → JSON 통째로 저장
// users/{uid}/levels/{levelName}/trips    → JSON 통째로 저장
// users/{uid}/levels/{levelName}/settings → { name, startDate }

function profileRef(uid) {
    return doc(db, 'users', uid, 'meta', 'profile');
}

function levelDataRef(uid, levelName, type) {
    // type: 'goals' | 'trips' | 'settings'
    return doc(db, 'users', uid, 'levels', levelName, 'data', type);
}

// ════════════════════════════════════════════
// 프로필 저장/불러오기
// ════════════════════════════════════════════

async function saveProfile(uid, data) {
    // data: { name, activeLevel, startDate }
    await setDoc(profileRef(uid), data, { merge: true });
}

async function loadProfile(uid) {
    const snap = await getDoc(profileRef(uid));
    return snap.exists() ? snap.data() : null;
}

// ════════════════════════════════════════════
// 레벨별 데이터 저장/불러오기
// ════════════════════════════════════════════

async function saveLevelData(uid, levelName, type, data) {
    // goals, trips, settings 를 JSON 문자열로 저장
    await setDoc(levelDataRef(uid, levelName, type), {
        payload:   JSON.stringify(data),
        updatedAt: new Date().toISOString()
    }, { merge: true });
}

async function loadLevelData(uid, levelName, type) {
    const snap = await getDoc(levelDataRef(uid, levelName, type));
    if (!snap.exists()) return null;
    try {
        return JSON.parse(snap.data().payload);
    } catch(e) {
        return null;
    }
}

// ════════════════════════════════════════════
// 전체 레벨 목록 불러오기
// ════════════════════════════════════════════

async function loadAllLevels(uid) {
    // users/{uid}/levels 컬렉션의 모든 문서 ID 반환
    const colRef = collection(db, 'users', uid, 'levels');
    const snap   = await getDocs(colRef);
    return snap.docs.map(function(d) { return d.id; });
}

// Email/Password 회원가입
async function signUpWithEmail(email, password) {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return result.user;
}

// Email/Password 로그인
async function signInWithEmail(email, password) {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
}

// 비밀번호 재설정 이메일 발송
async function resetPassword(email) {
    await sendPasswordResetEmail(auth, email);
}

// ════════════════════════════════════════════
// Export
// ════════════════════════════════════════════

window.FB = {
    auth, db,
    signInWithGoogle, signInWithApple, signOutUser, onAuthChange,
    handleRedirectResult,
    signUpWithEmail, signInWithEmail, resetPassword,
    saveProfile, loadProfile,
    saveLevelData, loadLevelData,
    loadAllLevels,
    getCurrentUid: function() { return currentUid; }
};