// Log 404 error to console
console.error(
  "404 Error: User attempted to access non-existent route:",
  window.location.pathname
);

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  // Back button functionality
  const backButton = document.getElementById('backButton');
  
  backButton.addEventListener('click', () => {
    if (document.referrer && document.referrer !== window.location.href) {
      // Go back to previous page if available
      window.history.back();
    } else {
      // Fallback to home if no previous page
      window.location.href = '/';
    }
  });

  // Add animation to floating elements on scroll
  window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const floatItems = document.querySelectorAll('.float-item');
    
    floatItems.forEach((item, index) => {
      const speed = 0.5 + (index * 0.1);
      item.style.transform = `translateY(${scrolled * speed}px)`;
    });
  });

  // Add parallax effect to the book icon
  const bookIcon = document.querySelector('.book-icon');
  let mouseX = 0;
  let mouseY = 0;
  let bookX = 0;
  let bookY = 0;

  document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 20;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 20;
  });

  function animateBook() {
    bookX += (mouseX - bookX) * 0.1;
    bookY += (mouseY - bookY) * 0.1;
    
    if (bookIcon) {
      bookIcon.style.transform = `translate(${bookX}px, ${bookY}px)`;
    }
    
    requestAnimationFrame(animateBook);
  }

  animateBook();

  // Add click animation to buttons
  const buttons = document.querySelectorAll('.btn-primary, .btn-outline, .quick-link');
  
  buttons.forEach(button => {
    button.addEventListener('click', function(e) {
      // Create ripple effect
      const ripple = document.createElement('span');
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = x + 'px';
      ripple.style.top = y + 'px';
      ripple.classList.add('ripple');
      
      this.appendChild(ripple);
      
      setTimeout(() => {
        ripple.remove();
      }, 600);
    });
  });

  // Add CSS for ripple effect dynamically
  const style = document.createElement('style');
  style.textContent = `
    .btn-primary, .btn-outline, .quick-link {
      position: relative;
      overflow: hidden;
    }
    
    .ripple {
      position: absolute;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.4);
      transform: scale(0);
      animation: ripple-animation 0.6s ease-out;
      pointer-events: none;
    }
    
    @keyframes ripple-animation {
      to {
        transform: scale(4);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);

  // Track page view analytics (if you have analytics)
  if (typeof gtag !== 'undefined') {
    gtag('event', 'page_view', {
      page_title: '404 Not Found',
      page_path: window.location.pathname,
      page_location: window.location.href
    });
  }

  // Optional: Log to your own analytics endpoint
  try {
    fetch('/api/analytics/404', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: window.location.pathname,
        referrer: document.referrer,
        timestamp: new Date().toISOString()
      })
    }).catch(() => {
      // Silently fail if analytics endpoint doesn't exist
    });
  } catch (error) {
    // Silently fail
  }
});