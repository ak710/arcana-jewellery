/* ============================================================
   LUXURY CARD STACK - SWIPE MECHANICS
   ============================================================ */
let currentCardIndex = 0;
let cards = [];
let startX = 0;
let currentX = 0;
let isDragging = false;
let cardStack = null;
let isInitialized = false;

function initCardStack() {
    if (isInitialized) return;
    
    cardStack = document.getElementById('card-stack');
    if (!cardStack) {
        console.warn('Card stack not found');
        return;
    }

    // Collect all visible cards
    const allCards = Array.from(cardStack.querySelectorAll('.memory-card-swipe'));
    cards = allCards.filter(card => {
        const style = window.getComputedStyle(card);
        return style.display !== 'none' && !card.classList.contains('hidden');
    });
    
    if (cards.length === 0) {
        console.warn('No visible cards found in stack');
        return;
    }

    console.log(`Initializing card stack with ${cards.length} cards`);
    isInitialized = true;

    // Reset all card styles
    cards.forEach(card => {
        card.style.transform = '';
        card.style.opacity = '';
        card.style.transition = '';
    });

    // Set initial states
    currentCardIndex = 0;
    updateCardStates();

    // Event listeners
    setupEventListeners();

    // Show swipe hint
    setTimeout(() => {
        if (cards[0]) cards[0].classList.add('show-hint');
    }, 1500);
}

function setupEventListeners() {
    // Touch events
    cards.forEach(card => {
        card.addEventListener('touchstart', handleTouchStart, { passive: false });
        card.addEventListener('touchmove', handleTouchMove, { passive: false });
        card.addEventListener('touchend', handleTouchEnd);
        card.addEventListener('mousedown', handleMouseDown);
    });

    // Global mouse events
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Keyboard navigation
    document.addEventListener('keydown', handleKeyboardNav);
}

function updateCardStates() {
    cards.forEach((card, index) => {
        card.classList.remove('active', 'next', 'swiping-out');
        card.style.transition = 'all 0.6s cubic-bezier(0.22, 1, 0.36, 1)';
        
        if (index === currentCardIndex) {
            card.classList.add('active');
            card.style.zIndex = 10;
            card.style.transform = 'translateY(0) scale(1)';
            card.style.opacity = '1';
        } else if (index === currentCardIndex + 1) {
            card.classList.add('next');
            card.style.zIndex = 9;
            card.style.transform = 'translateY(20px) scale(0.95)';
            card.style.opacity = '0.7';
        } else if (index > currentCardIndex) {
            const offset = index - currentCardIndex;
            card.style.zIndex = 10 - offset;
            card.style.transform = `translateY(${20 * offset}px) scale(${1 - offset * 0.05})`;
            card.style.opacity = Math.max(0, 0.7 - (offset - 1) * 0.3);
        } else {
            card.style.zIndex = 1;
            card.style.transform = 'translateY(-100px) scale(0.8)';
            card.style.opacity = '0';
        }
    });
    
    // Remove transition after state update
    setTimeout(() => {
        const activeCard = cards[currentCardIndex];
        if (activeCard) {
            activeCard.style.transition = '';
        }
    }, 600);
}

function nextCard() {
    if (currentCardIndex >= cards.length - 1) return;
    
    const currentCard = cards[currentCardIndex];
    currentCard.style.transition = 'all 0.4s cubic-bezier(0.22, 1, 0.36, 1)';
    currentCard.classList.add('swiping-out');
    currentCard.style.transform = 'translateX(-120%) rotate(-8deg)';
    currentCard.style.opacity = '0';

    setTimeout(() => {
        currentCardIndex++;
        currentCard.style.transition = '';
        updateCardStates();
    }, 400);
}

function prevCard() {
    if (currentCardIndex <= 0) return;
    
    currentCardIndex--;
    updateCardStates();
}

// Touch handlers
function handleTouchStart(e) {
    const touch = e.touches[0];
    startX = touch.clientX;
    currentX = touch.clientX;
    isDragging = true;
}

function handleTouchMove(e) {
    if (!isDragging) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    currentX = touch.clientX;
    const deltaX = currentX - startX;
    const activeCard = cards[currentCardIndex];
    
    if (!activeCard) return;

    // Apply drag transform with damping
    const rotation = deltaX * 0.05;
    const opacity = 1 - Math.abs(deltaX) * 0.001;
    activeCard.style.transition = '';
    activeCard.style.transform = `translateX(${deltaX}px) rotate(${rotation}deg)`;
    activeCard.style.opacity = Math.max(0.3, opacity);
}

function handleTouchEnd() {
    if (!isDragging) return;
    isDragging = false;

    const deltaX = currentX - startX;
    const activeCard = cards[currentCardIndex];
    
    if (!activeCard) return;

    // Swipe threshold: 100px
    if (Math.abs(deltaX) > 100) {
        if (deltaX < 0) {
            nextCard();
        } else {
            prevCard();
        }
    } else {
        // Snap back
        activeCard.style.transition = 'all 0.4s cubic-bezier(0.22, 1, 0.36, 1)';
        activeCard.style.transform = '';
        activeCard.style.opacity = '';
        setTimeout(() => {
            activeCard.style.transition = '';
        }, 400);
    }
}

// Mouse handlers
function handleMouseDown(e) {
    if (e.target.closest('button, a, input, audio')) return;
    startX = e.clientX;
    currentX = e.clientX;
    isDragging = true;
}

function handleMouseMove(e) {
    if (!isDragging) return;
    
    currentX = e.clientX;
    const deltaX = currentX - startX;
    const activeCard = cards[currentCardIndex];
    
    if (!activeCard) return;

    const rotation = deltaX * 0.05;
    const opacity = 1 - Math.abs(deltaX) * 0.001;
    activeCard.style.transition = '';
    activeCard.style.transform = `translateX(${deltaX}px) rotate(${rotation}deg)`;
    activeCard.style.opacity = Math.max(0.3, opacity);
}

function handleMouseUp() {
    if (!isDragging) return;
    isDragging = false;

    const deltaX = currentX - startX;
    const activeCard = cards[currentCardIndex];
    
    if (!activeCard) return;

    if (Math.abs(deltaX) > 100) {
        if (deltaX < 0) {
            nextCard();
        } else {
            prevCard();
        }
    } else {
        activeCard.style.transition = 'all 0.4s cubic-bezier(0.22, 1, 0.36, 1)';
        activeCard.style.transform = '';
        activeCard.style.opacity = '';
        setTimeout(() => {
            activeCard.style.transition = '';
        }, 400);
    }
}

// Keyboard navigation
function handleKeyboardNav(e) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        nextCard();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        prevCard();
    }
}

// Export for use after data loads
window.initCardStack = initCardStack;
