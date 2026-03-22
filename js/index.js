// Intersection Observer for scroll animations
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.1 });

document.addEventListener('DOMContentLoaded', () => {
  const animated = document.querySelectorAll('.feature-card, .benefit-item, .section-header, .how-it-works-content, .how-it-works-visual, .cta-card');
  animated.forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = `opacity 0.6s ease-out ${i * 0.1}s, transform 0.6s ease-out ${i * 0.1}s`;
    observer.observe(el);
  });

  // Smooth scroll
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Nav shadow on scroll
  const nav = document.querySelector('.nav-bar');
  if (nav) {
    window.addEventListener('scroll', () => {
      nav.style.boxShadow = window.pageYOffset > 50
        ? '0 4px 20px -4px rgba(41, 37, 32, 0.12)'
        : '0 4px 20px -4px rgba(41, 37, 32, 0.08)';
    });
  }

  // Parallax bg decorations
  window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    document.querySelectorAll('.bg-decoration').forEach((el, i) => {
      el.style.transform = `translateY(${scrolled * (i + 1) * 0.5}px)`;
    });
  });
});