function addQuizConfettiStyles() {
  if (document.querySelector('#quiz-confetti-styles')) return;
  const style = document.createElement('style');
  style.id = 'quiz-confetti-styles';
  style.textContent = `
    .quiz-confetti-layer {
      position: absolute;
      inset: 0;
      overflow: hidden;
      pointer-events: none;
      z-index: 0;
    }

    .quiz-confetti-piece {
      position: absolute;
      top: -1.5rem;
      width: 0.52rem;
      height: 0.86rem;
      border-radius: 0.16rem;
      opacity: 0.95;
      animation: quizConfettiFall var(--fall-duration, 1800ms) ease-out forwards;
      transform: translate3d(0, 0, 0) rotate(var(--start-rotate, 0deg));
    }

    @keyframes quizConfettiFall {
      0% {
        opacity: 0;
        transform: translate3d(0, -1rem, 0) rotate(var(--start-rotate, 0deg));
      }
      12% { opacity: 1; }
      100% {
        opacity: 0;
        transform: translate3d(var(--drift, 0px), var(--fall-distance, 58vh), 0) rotate(var(--end-rotate, 360deg));
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .quiz-confetti-piece { display: none; }
    }
  `;
  document.head.append(style);
}

function launchQuizConfetti() {
  const resultCard = document.querySelector('#quiz-result-card.quiz-splash-card:not([hidden])');
  if (!resultCard || resultCard.dataset.confettiPlayed === 'true') return;
  resultCard.dataset.confettiPlayed = 'true';
  addQuizConfettiStyles();

  const layer = document.createElement('div');
  layer.className = 'quiz-confetti-layer';
  layer.setAttribute('aria-hidden', 'true');
  resultCard.prepend(layer);

  const colors = ['#FFD700', '#26B5C6', '#FFFFFF', '#FFF9D6'];
  const pieceCount = 34;
  for (let index = 0; index < pieceCount; index += 1) {
    const piece = document.createElement('span');
    piece.className = 'quiz-confetti-piece';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[index % colors.length];
    piece.style.setProperty('--drift', `${Math.round((Math.random() - 0.5) * 220)}px`);
    piece.style.setProperty('--fall-distance', `${Math.round(42 + Math.random() * 38)}vh`);
    piece.style.setProperty('--fall-duration', `${Math.round(1350 + Math.random() * 900)}ms`);
    piece.style.setProperty('--start-rotate', `${Math.round(Math.random() * 180)}deg`);
    piece.style.setProperty('--end-rotate', `${Math.round(360 + Math.random() * 420)}deg`);
    piece.style.animationDelay = `${Math.round(Math.random() * 280)}ms`;
    layer.append(piece);
  }

  window.setTimeout(() => layer.remove(), 2800);
}

function observeQuizResults() {
  const main = document.querySelector('#main-content');
  if (!main) return;
  const observer = new MutationObserver(launchQuizConfetti);
  observer.observe(main, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden'] });
  launchQuizConfetti();
}

document.addEventListener('DOMContentLoaded', observeQuizResults);
