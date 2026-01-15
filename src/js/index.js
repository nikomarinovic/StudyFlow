// Intersection Observer for scroll animations
const observerOptions = {
  root: null,
  rootMargin: '0px',
  threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, observerOptions);

// all feature cards and benefit items
document.addEventListener('DOMContentLoaded', () => {
  const animatedElements = document.querySelectorAll(
    '.feature-card, .benefit-item, .section-header, .how-it-works-content, .how-it-works-visual, .cta-card'
  );
  
  animatedElements.forEach((el, index) => {
    // initial state for animation
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = `opacity 0.6s ease-out ${index * 0.1}s, transform 0.6s ease-out ${index * 0.1}s`;
    
    observer.observe(el);
  });

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });

  // active state to nav on scroll
  let lastScroll = 0;
  const nav = document.querySelector('.nav-bar');
  
  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 50) {
      nav.style.boxShadow = '0 4px 20px -4px rgba(41, 37, 32, 0.12)';
    } else {
      nav.style.boxShadow = '0 4px 20px -4px rgba(41, 37, 32, 0.08)';
    }
    
    lastScroll = currentScroll;
  });

  // hover effect to buttons
  const buttons = document.querySelectorAll('.btn');
  buttons.forEach(btn => {
    btn.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-2px)';
    });
    
    btn.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0)';
    });
  });

  // Parallax effect for background decorations
  window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const decorations = document.querySelectorAll('.bg-decoration');
    
    decorations.forEach((decoration, index) => {
      const speed = (index + 1) * 0.5;
      decoration.style.transform = `translateY(${scrolled * speed}px)`;
    });
  });
});