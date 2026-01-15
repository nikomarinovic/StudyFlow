let isSignUp = true;

// URL params for mode
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('mode') === 'signin') isSignUp = false;

// DOM elements
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

// UI based on sign up / sign in
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
        leftDescription.textContent = "Join thousands of students who've transformed their study habits with personalized AI-powered schedules.";
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

// Toggle password visibility
togglePasswordBtn.addEventListener('click', () => {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    eyeIcon.classList.toggle('hidden');
    eyeOffIcon.classList.toggle('hidden');
});

// Switch between sign up and sign in
switchMode.addEventListener('click', () => {
    isSignUp = !isSignUp;
    updateUI();
    authForm.reset();
});

// Toast notifications
function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="toast-message">${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toastContainer.removeChild(toast), 300);
    }, 3000);
}

// Form submission
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const name = nameInput.value.trim();

    // Validation
    if (isSignUp && !name) { showToast('Please enter your name', 'error'); return; }
    if (!email) { showToast('Please enter your email', 'error'); return; }
    if (!password) { showToast('Please enter your password', 'error'); return; }
    if (password.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }

    submitBtn.disabled = true;
    submitText.textContent = 'Loading...';

    try {
        if (isSignUp) {
            const existingUser = await getUserByEmail(email);
            if (existingUser) {
                showToast('Email already registered', 'error');
                submitBtn.disabled = false;
                submitText.textContent = 'Create Account';
                return;
            }

            await addUser(email, password, name);
            showToast('Account created successfully!', 'success');
            sessionStorage.setItem('userEmail', email);
            sessionStorage.setItem('userName', name);
            setTimeout(() => { window.location.href = '/dashboard.html'; }, 1000);
        } else {
            const isValid = await validateLogin(email, password);
            if (isValid) {
                const user = await getUserByEmail(email);
                showToast('Welcome back!', 'success');
                sessionStorage.setItem('userEmail', email);
                sessionStorage.setItem('userName', user.name);
                setTimeout(() => { window.location.href = '/dashboard.html'; }, 1000);
            } else {
                showToast('Invalid email or password', 'error');
                submitBtn.disabled = false;
                submitText.textContent = 'Sign In';
            }
        }
    } catch (error) {
        console.error('Auth error:', error);
        showToast('An error occurred. Please try again.', 'error');
        submitBtn.disabled = false;
        submitText.textContent = isSignUp ? 'Create Account' : 'Sign In';
    }
});

// Initialize UI
updateUI();

// Redirect if already logged in
const userEmail = sessionStorage.getItem('userEmail');
if (userEmail) window.location.href = '/dashboard.html';