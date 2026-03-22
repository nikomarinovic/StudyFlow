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

function updateUI() {
  if (isSignUp) {
    nameGroup.classList.remove('hidden');
    forgotPassword.classList.add('hidden');
    termsText.classList.remove('hidden');
    formTitle.textContent = 'Create Account';
    formSubtitle.textContent = 'Fill in your details to get started';
    submitText.textContent = 'Create Account';
    switchQuestion.textContent = 'Already have an account?';
    switchMode.textContent = 'Sign In';
    leftTitle.textContent = 'Start Your Journey';
    leftDescription.textContent = "Join thousands of students who've transformed their study habits.";
  } else {
    nameGroup.classList.add('hidden');
    forgotPassword.classList.remove('hidden');
    termsText.classList.add('hidden');
    formTitle.textContent = 'Sign In';
    formSubtitle.textContent = 'Enter your credentials to continue';
    submitText.textContent = 'Sign In';
    switchQuestion.textContent = "Don't have an account?";
    switchMode.textContent = 'Sign Up';
    leftTitle.textContent = 'Welcome Back';
    leftDescription.textContent = 'Continue your learning journey and keep that streak going!';
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
  toast.innerHTML = `<span class="toast-message">${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'none';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(400px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => container.removeChild(toast), 300);
  }, 3000);
}

authForm.addEventListener('submit', (e) => {
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
    if (isSignUp) {
      const existing = DB.getUserByEmail(email);
      if (existing) {
        showToast('Email already registered', 'error');
        submitBtn.disabled = false;
        submitText.textContent = 'Create Account';
        return;
      }
      const user = DB.addUser(email, password, name);
      localStorage.setItem('sf_current_user', JSON.stringify({ id: user.id, email, name }));
      showToast('Account created! Welcome to StudyFlow 🎉', 'success');
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 1000);
    } else {
      if (DB.validateLogin(email, password)) {
        const user = DB.getUserByEmail(email);
        localStorage.setItem('sf_current_user', JSON.stringify({ id: user.id, email: user.email, name: user.name }));
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
    showToast('Something went wrong. Try again.', 'error');
    submitBtn.disabled = false;
    submitText.textContent = isSignUp ? 'Create Account' : 'Sign In';
  }
});

updateUI();