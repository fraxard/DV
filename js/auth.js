/* ============================================================
   DIGIVIRASAT — Auth Logic (Firebase)
   Handles: Email/Password + Phone OTP, tab switching,
            redirect to dashboard on success.
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

/* ── Firebase init ───────────────────────────────────────── */
const firebaseConfig = {
  apiKey:            "AIzaSyB4D7xjfOELTYwKvEMpr1P0IP6lTvM6bRc",
  authDomain:        "digiviraasat.firebaseapp.com",
  projectId:         "digiviraasat",
  storageBucket:     "digiviraasat.firebasestorage.app",
  messagingSenderId: "77734538548",
  appId:             "1:77734538548:web:3422873609ebbf803b4961"
};
const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);

/* ── Redirect if already logged in ──────────────────────── */
onAuthStateChanged(auth, user => {
  if (user) window.location.href = 'dashboard.html';
});

/* ── DOM refs ────────────────────────────────────────────── */
const tabs         = document.querySelectorAll('.auth-tab');
const methodBtns   = document.querySelectorAll('.method-btn');
const emailSection = document.getElementById('email-section');
const phoneSection = document.getElementById('phone-section');

const emailLoginForm  = document.getElementById('email-login-form');
const emailSignupForm = document.getElementById('email-signup-form');

const phoneInput     = document.getElementById('phone-input');
const sendOtpBtn     = document.getElementById('send-otp-btn');
const otpStep        = document.getElementById('otp-step');
const phoneEntryStep = document.getElementById('phone-entry-step');
const otpSentTo      = document.getElementById('otp-sent-to');
const otpDigits      = document.querySelectorAll('.otp-digit');
const verifyOtpBtn   = document.getElementById('verify-otp-btn');
const resendBtn      = document.getElementById('resend-btn');
const resendTimer    = document.getElementById('resend-timer');
const forgotLink     = document.getElementById('forgot-link');

/* ── State ───────────────────────────────────────────────── */
let currentTab    = 'login';   // 'login' | 'signup'
let currentMethod = 'email';   // 'email' | 'phone'
let confirmResult = null;
let resendInterval = null;
let recaptchaVerifier = null;

/* ── Helpers ─────────────────────────────────────────────── */
function showMsg(id, text, type = 'error') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.className = `auth-message ${type}`;
}
function clearMsg(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = '';
  el.className = 'auth-message';
}
function setLoading(btn, on) {
  btn.classList.toggle('loading', on);
  btn.disabled = on;
}

function friendlyError(code) {
  const map = {
    'auth/invalid-email':          'Please enter a valid email address.',
    'auth/user-not-found':         'No account found with this email.',
    'auth/wrong-password':         'Incorrect password. Try again.',
    'auth/email-already-in-use':   'An account with this email already exists.',
    'auth/weak-password':          'Password must be at least 6 characters.',
    'auth/too-many-requests':      'Too many attempts. Please wait a moment.',
    'auth/invalid-phone-number':   'Please enter a valid 10-digit mobile number.',
    'auth/invalid-verification-code': 'The OTP you entered is incorrect.',
    'auth/code-expired':           'OTP expired. Please request a new one.',
  };
  return map[code] || 'Something went wrong. Please try again.';
}

/* ── Tab switching ───────────────────────────────────────── */
tabs.forEach(tab => {
  tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  tab.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') switchTab(tab.dataset.tab);
  });
});

function switchTab(tab) {
  currentTab = tab;
  tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tab));

  if (currentMethod === 'email') {
    emailLoginForm.classList.toggle('hidden', tab !== 'login');
    emailSignupForm.classList.toggle('hidden', tab !== 'signup');
  }
  // Phone flow doesn't have separate login/signup — same OTP flow
  clearMsg('login-email-msg');
  clearMsg('signup-email-msg');
  clearMsg('phone-msg');
  clearMsg('otp-msg');
}

/* ── Method switching ────────────────────────────────────── */
methodBtns.forEach(btn => {
  btn.addEventListener('click', () => switchMethod(btn.dataset.method));
});

function switchMethod(method) {
  currentMethod = method;
  methodBtns.forEach(b => b.classList.toggle('active', b.dataset.method === method));

  emailSection.classList.toggle('hidden', method !== 'email');
  phoneSection.classList.toggle('hidden', method !== 'phone');

  if (method === 'email') {
    // Re-apply tab state for email forms
    emailLoginForm.classList.toggle('hidden', currentTab !== 'login');
    emailSignupForm.classList.toggle('hidden', currentTab !== 'signup');
  }

  clearMsg('login-email-msg');
  clearMsg('signup-email-msg');
  clearMsg('phone-msg');
  clearMsg('otp-msg');
}

/* ── Email: Sign In ──────────────────────────────────────── */
emailLoginForm.addEventListener('submit', async e => {
  e.preventDefault();
  clearMsg('login-email-msg');
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) {
    showMsg('login-email-msg', 'Please fill in all fields.');
    return;
  }
  const btn = emailLoginForm.querySelector('.auth-submit');
  setLoading(btn, true);
  try {
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged will redirect
  } catch (err) {
    showMsg('login-email-msg', friendlyError(err.code));
    setLoading(btn, false);
  }
});

/* ── Email: Sign Up ──────────────────────────────────────── */
emailSignupForm.addEventListener('submit', async e => {
  e.preventDefault();
  clearMsg('signup-email-msg');
  const name     = document.getElementById('signup-name').value.trim();
  const email    = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  if (!name || !email || !password) {
    showMsg('signup-email-msg', 'Please fill in all fields.');
    return;
  }
  if (password.length < 8) {
    showMsg('signup-email-msg', 'Password must be at least 8 characters.');
    return;
  }
  const btn = emailSignupForm.querySelector('.auth-submit');
  setLoading(btn, true);
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    // onAuthStateChanged will redirect
  } catch (err) {
    showMsg('signup-email-msg', friendlyError(err.code));
    setLoading(btn, false);
  }
});

/* ── Forgot password ─────────────────────────────────────── */
forgotLink.addEventListener('click', async e => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  if (!email) {
    showMsg('login-email-msg', 'Enter your email address above first.');
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    showMsg('login-email-msg', 'Password reset email sent! Check your inbox.', 'success');
  } catch (err) {
    showMsg('login-email-msg', friendlyError(err.code));
  }
});

/* ── Phone: setup reCAPTCHA ──────────────────────────────── */
function setupRecaptcha() {
  if (recaptchaVerifier) {
    recaptchaVerifier.clear();
    recaptchaVerifier = null;
    document.getElementById('recaptcha-container').innerHTML = '';
  }
  recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
    size: 'invisible',
    callback: () => {}
  });
}

/* ── Phone: Send OTP ─────────────────────────────────────── */
sendOtpBtn.addEventListener('click', async () => {
  clearMsg('phone-msg');
  const raw = phoneInput.value.trim().replace(/\s+/g, '');
  if (!/^\d{10}$/.test(raw)) {
    showMsg('phone-msg', 'Enter a valid 10-digit mobile number.');
    return;
  }
  const phoneNumber = '+91' + raw;
  setLoading(sendOtpBtn, true);
  try {
    setupRecaptcha();
    confirmResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
    // Show OTP step
    phoneEntryStep.style.display = 'none';
    otpSentTo.textContent = phoneNumber;
    otpStep.classList.add('visible');
    otpDigits[0].focus();
    startResendTimer();
  } catch (err) {
    showMsg('phone-msg', friendlyError(err.code));
    setLoading(sendOtpBtn, false);
  }
});

/* ── OTP digit keyboard handling ─────────────────────────── */
otpDigits.forEach((digit, i) => {
  digit.addEventListener('input', () => {
    const val = digit.value.replace(/\D/g, '');
    digit.value = val.slice(-1);
    if (val && i < otpDigits.length - 1) otpDigits[i + 1].focus();
  });
  digit.addEventListener('keydown', e => {
    if (e.key === 'Backspace' && !digit.value && i > 0) otpDigits[i - 1].focus();
  });
  digit.addEventListener('paste', e => {
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
    pasted.split('').slice(0, 6).forEach((ch, j) => {
      if (otpDigits[j]) otpDigits[j].value = ch;
    });
    const next = Math.min(pasted.length, 5);
    otpDigits[next].focus();
  });
});

/* ── Phone: Verify OTP ───────────────────────────────────── */
verifyOtpBtn.addEventListener('click', async () => {
  clearMsg('otp-msg');
  const code = Array.from(otpDigits).map(d => d.value).join('');
  if (code.length < 6) {
    showMsg('otp-msg', 'Please enter all 6 digits.');
    return;
  }
  setLoading(verifyOtpBtn, true);
  try {
    await confirmResult.confirm(code);
    // onAuthStateChanged will redirect
  } catch (err) {
    showMsg('otp-msg', friendlyError(err.code));
    setLoading(verifyOtpBtn, false);
  }
});

/* ── Resend OTP timer ────────────────────────────────────── */
function startResendTimer() {
  let seconds = 30;
  resendBtn.disabled = true;
  resendTimer.textContent = seconds;
  resendBtn.textContent = `Resend OTP in ${seconds}s`;
  resendInterval = setInterval(() => {
    seconds--;
    resendBtn.textContent = `Resend OTP in ${seconds}s`;
    if (seconds <= 0) {
      clearInterval(resendInterval);
      resendBtn.textContent = 'Resend OTP';
      resendBtn.disabled = false;
    }
  }, 1000);
}

resendBtn.addEventListener('click', async () => {
  if (resendBtn.disabled) return;
  clearMsg('otp-msg');
  const raw = phoneInput.value.trim().replace(/\s+/g, '');
  const phoneNumber = '+91' + raw;
  setLoading(verifyOtpBtn, true);
  try {
    setupRecaptcha();
    confirmResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
    otpDigits.forEach(d => d.value = '');
    otpDigits[0].focus();
    showMsg('otp-msg', 'OTP resent successfully!', 'success');
    startResendTimer();
  } catch (err) {
    showMsg('otp-msg', friendlyError(err.code));
  } finally {
    setLoading(verifyOtpBtn, false);
  }
});