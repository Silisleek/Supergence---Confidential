const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');

function initReveals() {
  if (motionPreference.matches || !('IntersectionObserver' in window)) return;

  const elements = document.querySelectorAll(
    '.intro-grid > *, .cap-heading > *, .feature, .how-intro, .how-item, .manifesto-content, .final-grid > *, .sl-finale-message, .footer-lead > *, .footer-directory > *',
  );
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.08, rootMargin: '0px 0px -30px 0px' },
  );

  elements.forEach((element) => {
    if (element.getBoundingClientRect().top < window.innerHeight) return;
    element.classList.add('will-reveal');
    observer.observe(element);
  });
}

initReveals();
function initMotionVideo() {
  const video = document.querySelector('.ascii-video');
  if (!video || !('IntersectionObserver' in window)) return;

  let inView = false;
  let finished = false;
  const update = () => {
    if (inView && !finished && !motionPreference.matches) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  video.addEventListener('ended', () => {
    finished = true;
  });
  motionPreference.addEventListener('change', update);
  const observer = new IntersectionObserver(
    ([entry]) => {
      inView = entry.isIntersecting;
      update();
    },
    { threshold: 0.1 },
  );
  observer.observe(video);
}

initMotionVideo();
