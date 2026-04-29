document.addEventListener('click', event => {
  const quizTrigger = event.target.closest('[data-start-quiz], [data-page-target="quiz"]');
  if (!quizTrigger) return;
  event.preventDefault();
  event.stopPropagation();
  if (typeof window.switchPage === 'function') {
    window.switchPage('quiz');
  }
}, true);
