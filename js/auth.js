let isSignUp = new URLSearchParams(window.location.search).get('mode') !== 'signin';

const nameGroup = document.getElementById('nameGroup');
const forgotPassword = document.getElementById('forgotPassword');
const termsText = document.getElementById('termsText');
const formTitle = document.getElementById('formTitle');
const formSubtitle = document.getElementById('formSubtitle');
const submitText = document.getElementById('submitText');
const switchQuestion = document.getElementById('switchQuestion');
const switchMode = document.getElementById('switchMode');
const leftTitle = document.getElementById('leftTitle');
const leftDescription = document.getElementById('leftDescription');
const authForm = document.getElementById('authForm');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const togglePasswordBtn = document.getElementById('togglePassword');
const eyeIcon = document.getElementById('eyeIcon');
const eyeOffIcon = document.getElementById('eyeOffIcon');
const submitBtn = document.getElementById('submitBtn');
const studentTypeGroup = document.getElementById('studentTypeGroup');
const universityFields = document.getElementById('universityFields');
const studentType = document.getElementById('studentType');

function updateStudentFields() {
  if (!studentType) return;
  universityFields.classList.toggle('hidden', studentType.value !== 'university');
}
studentType?.addEventListener('change', updateStudentFields);

function updateUI() {
  if (isSignUp) {
    nameGroup.classList.remove('hidden');
    studentTypeGroup.classList.remove('hidden');
    updateStudentFields();
    forgotPassword.classList.add('hidden');
    termsText.classList.remove('hidden');
    formTitle.textContent = 'Create Account';
    formSubtitle.textContent = 'Fill in your details to get started';
    submitText.textContent = 'Create Account';
    switchQuestion.textContent = 'Already have an account?';
    switchMode.textContent = 'Sign In';
    leftTitle.textContent = 'Your semester, in good order.';
    leftDescription.textContent = 'Bring courses, deadlines, exams, and study time into one clear workspace.';
  } else {
    nameGroup.classList.add('hidden');
    studentTypeGroup.classList.add('hidden');
    universityFields.classList.add('hidden');
    forgotPassword.classList.remove('hidden');
    termsText.classList.add('hidden');
    formTitle.textContent = 'Sign In';
    formSubtitle.textContent = 'Enter your credentials to continue';
    submitText.textContent = 'Sign In';
    switchQuestion.textContent = "Don't have an account?";
    switchMode.textContent = 'Sign Up';
    leftTitle.textContent = 'Welcome back.';
    leftDescription.textContent = 'Pick up your courses, plans, and progress right where you left them.';
  }
}

togglePasswordBtn.addEventListener('click', () => {
  passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password';
  eyeIcon.classList.toggle('hidden');
  eyeOffIcon.classList.toggle('hidden');
});

switchMode.addEventListener('click', () => {
  isSignUp = !isSignUp;
  updateUI();
  authForm.reset();
});

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'none';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(400px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => container.removeChild(toast), 300);
  }, 3000);
}

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const name = nameInput.value.trim();

  if (isSignUp && !name) { showToast('Please enter your name', 'error'); return; }
  if (!email) { showToast('Please enter your email', 'error'); return; }
  if (!password) { showToast('Please enter your password', 'error'); return; }
  if (password.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }

  submitBtn.disabled = true;
  submitText.textContent = 'Loading...';

  try {
    const cloud = await window.FirebaseSyncReady;
    const configured = Object.values(window.STUDYFLOW_FIREBASE_CONFIG || {}).filter(Boolean).length >= 4;
    if(configured&&!cloud)throw new Error('Firebase could not start. Check your project configuration and try again.');
    if (cloud?.enabled) {
      let account;
      if (isSignUp) {
        account = await cloud.signUp(email, password, name);
        await cloud.adoptLocalRecords(email, account.uid);
      } else {
        account = await cloud.signIn(email, password);
        await cloud.adoptLocalRecords(email, account.uid);
      }
      const profile = isSignUp ? {
        studentType: studentType?.value || 'university',
        institution: document.getElementById('institution')?.value.trim() || '',
        faculty: document.getElementById('faculty')?.value.trim() || '',
        studyProgram: document.getElementById('studyProgram')?.value.trim() || '',
        academicYear: document.getElementById('academicYear')?.value || '',
        institutionEmail: document.getElementById('institutionEmail')?.value.trim() || '',
      } : DB.getProfile(account.uid);
      if (isSignUp) DB.saveProfile(account.uid, profile);
      DB.initStats(account.uid);
      const userData = {id:account.uid,email:account.email,name:account.displayName||name||account.email.split('@')[0],firebaseUser:true,...profile};
      const localUsers=DB._get(DB.USERS_KEY);if(!localUsers.some(u=>u.id===account.uid)){localUsers.push({id:account.uid,email:account.email,name:userData.name,createdAt:Date.now()});DB._set(DB.USERS_KEY,localUsers);}
      localStorage.setItem('sf_current_user',JSON.stringify(userData));
      await cloud.startSync(account.uid);
      const syncedProfile=DB.getProfile(account.uid);
      localStorage.setItem('sf_current_user',JSON.stringify({...userData,...syncedProfile}));
      showToast(isSignUp ? 'Account created. Your data is syncing.' : 'Signed in. Your data is syncing.','success');
      window.location.href='dashboard.html';
      return;
    }
    if (isSignUp) {
      const existing = DB.getUserByEmail(email);
      if (existing) {
        showToast('Email already registered', 'error');
        submitBtn.disabled = false;
        submitText.textContent = 'Create Account';
        return;
      }
      const user = await DB.addUser(email, password, name);
      const profile = {
        studentType: studentType?.value || 'university',
        institution: document.getElementById('institution')?.value.trim() || '',
        faculty: document.getElementById('faculty')?.value.trim() || '',
        studyProgram: document.getElementById('studyProgram')?.value.trim() || '',
        academicYear: document.getElementById('academicYear')?.value || '',
        institutionEmail: document.getElementById('institutionEmail')?.value.trim() || '',
        institutionBrand: /FER|Faculty of Electrical Engineering and Computing/i.test(document.getElementById('institution')?.value || '') ? 'fer' : /Harvard/i.test(document.getElementById('institution')?.value || '') ? 'harvard' : /MIT|Massachusetts Institute/i.test(document.getElementById('institution')?.value || '') ? 'mit' : 'default'
      };
      DB.saveProfile(user.id, profile);
      localStorage.setItem('sf_current_user', JSON.stringify({ id: user.id, email, name, ...profile }));
      showToast('Account created! Welcome to StudyFlow 🎉', 'success');
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 1000);
    } else {
      if (await DB.validateLogin(email, password)) {
        const user = DB.getUserByEmail(email);
        const profile = DB.getProfile(user.id);
        localStorage.setItem('sf_current_user', JSON.stringify({ id: user.id, email: user.email, name: user.name, ...profile }));
        showToast('Welcome back! 👋', 'success');
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 1000);
      } else {
        showToast('Invalid email or password', 'error');
        submitBtn.disabled = false;
        submitText.textContent = 'Sign In';
      }
    }
  } catch (err) {
    console.error(err);
    const messages={
      'auth/email-already-in-use':'An account already exists for this email.',
      'auth/invalid-email':'Enter a valid email address.',
      'auth/invalid-credential':'Invalid email or password.',
      'auth/user-not-found':'Invalid email or password.',
      'auth/wrong-password':'Invalid email or password.',
      'auth/weak-password':'Choose a stronger password (at least 6 characters).',
      'auth/network-request-failed':'Could not reach Firebase. Check your connection.',
      'permission-denied':'Firestore denied access. Check the deployed security rules.'
    };
    showToast(messages[err.code] || err.message || 'Something went wrong. Try again.', 'error');
    submitBtn.disabled = false;
    submitText.textContent = isSignUp ? 'Create Account' : 'Sign In';
  }
});

updateUI();

document.querySelector('.forgot-link')?.addEventListener('click', async () => {
  const email=emailInput.value.trim();
  if(!email){showToast('Enter your email first.', 'error');return;}
  try { const cloud=await window.FirebaseSyncReady;if(cloud?.enabled){await cloud.resetPassword(email);showToast('Password reset email sent.','success');}else showToast('Password reset requires Firebase account setup.','error'); }
  catch(error){showToast(error.message||'Could not send password reset email.','error');}
});
