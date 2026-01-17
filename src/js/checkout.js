// Plan configuration
const PLAN_CONFIG = {
  Pro: {
    price: "$9 / month",
    description: "Advanced tools to study smarter and stay consistent"
  },
  Elite: {
    price: "$19 / month",
    description: "Full AI coaching and peak performance insights"
  }
};

// Get plan from URL parameters
function getPlanFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  const plan = urlParams.get('plan') || 'Pro';
  return plan;
}

// Initialize page with selected plan
function initializePlan() {
  const plan = getPlanFromURL();
  const selectedPlan = PLAN_CONFIG[plan] || PLAN_CONFIG.Pro;
  
  document.getElementById('planName').textContent = plan;
  document.getElementById('planLabel').textContent = `${plan} Plan`;
  document.getElementById('planPrice').textContent = selectedPlan.price;
  document.getElementById('planDescription').textContent = selectedPlan.description;
}

// Format card number with spaces
function formatCardNumber(value) {
  const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
  const matches = v.match(/\d{4,16}/g);
  const match = (matches && matches[0]) || '';
  const parts = [];

  for (let i = 0; i < match.length; i += 4) {
    parts.push(match.substring(i, i + 4));
  }

  if (parts.length) {
    return parts.join(' ');
  } else {
    return value;
  }
}

// Format expiry date
function formatExpiry(value) {
  const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
  
  if (v.length >= 2) {
    return v.substring(0, 2) + ' / ' + v.substring(2, 4);
  }
  
  return v;
}

// Format CVC
function formatCVC(value) {
  return value.replace(/[^0-9]/gi, '').substring(0, 4);
}

// Validate and handle checkout
function handleCheckout() {
  const cardNumber = document.getElementById('cardNumber').value;
  const expiry = document.getElementById('expiry').value;
  const cvc = document.getElementById('cvc').value;
  const errorMessage = document.getElementById('errorMessage');
  const checkoutBtn = document.getElementById('checkoutBtn');
  const btnText = document.getElementById('btnText');
  
  // Clear previous error
  errorMessage.textContent = '';
  
  // Validate inputs
  if (!cardNumber || !expiry || !cvc) {
    errorMessage.textContent = 'Please fill in all payment details.';
    return;
  }
  
  if (cardNumber.replace(/\s/g, '').length < 16) {
    errorMessage.textContent = 'Invalid card number.';
    return;
  }
  
  // Show loading state
  checkoutBtn.disabled = true;
  btnText.textContent = 'Processing...';
  
  // Simulate processing
  setTimeout(() => {
    const plan = getPlanFromURL();
    window.location.href = `/auth?mode=signup&plan=${plan}`;
  }, 1800);
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Initialize plan details
  initializePlan();
  
  // Card number formatting
  const cardNumberInput = document.getElementById('cardNumber');
  cardNumberInput.addEventListener('input', (e) => {
    e.target.value = formatCardNumber(e.target.value);
  });
  
  // Expiry formatting
  const expiryInput = document.getElementById('expiry');
  expiryInput.addEventListener('input', (e) => {
    e.target.value = formatExpiry(e.target.value);
  });
  
  // CVC formatting
  const cvcInput = document.getElementById('cvc');
  cvcInput.addEventListener('input', (e) => {
    e.target.value = formatCVC(e.target.value);
  });
  
  // Checkout button
  const checkoutBtn = document.getElementById('checkoutBtn');
  checkoutBtn.addEventListener('click', handleCheckout);
  
  // Form submit prevention
  const paymentForm = document.getElementById('paymentForm');
  paymentForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleCheckout();
  });
  
  // Allow Enter key to submit
  document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCheckout();
    }
  });
});