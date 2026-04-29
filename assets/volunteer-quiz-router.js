function removeHeroQuizButton() {
  document.querySelectorAll('.hero-actions [data-start-quiz], .hero-actions [data-page-target="quiz"]').forEach(button => button.remove());
}

document.addEventListener('click', event => {
  const quizTrigger = event.target.closest('[data-start-quiz], [data-page-target="quiz"]');
  if (!quizTrigger) return;
  event.preventDefault();
  event.stopPropagation();
  removeHeroQuizButton();
  if (typeof window.switchPage === 'function') {
    window.switchPage('quiz');
  }
}, true);

document.addEventListener('DOMContentLoaded', () => {
  removeHeroQuizButton();
  window.setTimeout(removeHeroQuizButton, 0);
});
