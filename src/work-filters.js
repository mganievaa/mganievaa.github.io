document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    if (!body.classList.contains('page-work')) return;

    const desktopButtons = [...document.querySelectorAll('.work-filter-pill[data-filter]')];
    const overlay = document.getElementById('workFilterOverlay');
    const overlayButtons = [...document.querySelectorAll('.work-filter-overlay-option[data-filter]')];
    const closeButton = overlay?.querySelector('.work-filter-close');
    const projectItems = [...document.querySelectorAll('.work-project-item[data-tags]')];
    const mobileQuery = window.matchMedia('(max-width: 991.98px)');
    const activeFilters = new Set();

    const allFilterButtons = [...desktopButtons, ...overlayButtons];

    document.querySelectorAll('.work-card img').forEach((image) => {
        image.draggable = false;
        image.setAttribute('draggable', 'false');
    });


    const syncButtons = () => {
        allFilterButtons.forEach((button) => {
            const selected = activeFilters.has(button.dataset.filter);
            button.classList.toggle('is-selected', selected);
            button.setAttribute('aria-pressed', String(selected));
        });
    };

    const applyFilters = () => {
        projectItems.forEach((item) => {
            const tags = new Set((item.dataset.tags || '').split(/\s+/).filter(Boolean));
            const visible = activeFilters.size === 0
                || [...activeFilters].every((filter) => tags.has(filter));

            item.hidden = !visible;
            item.setAttribute('aria-hidden', String(!visible));
        });
    };

    const toggleFilter = (filter) => {
        if (!filter) return;
        if (activeFilters.has(filter)) activeFilters.delete(filter);
        else activeFilters.add(filter);

        syncButtons();
        applyFilters();
    };

    allFilterButtons.forEach((button) => {
        button.addEventListener('click', () => toggleFilter(button.dataset.filter));
    });

    const closeOverlay = () => {
        if (!overlay) return;
        window.cancelAnimationFrame(openingFrame);
        overlay.classList.remove('is-open', 'is-preparing');
        overlay.setAttribute('aria-hidden', 'true');
        body.classList.remove('filter-menu-open');
    };

    closeButton?.addEventListener('click', closeOverlay);

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && overlay?.classList.contains('is-open')) {
            closeOverlay();
        }
    });

    window.addEventListener('resize', () => {
        if (!mobileQuery.matches) closeOverlay();
    });

    /* ---------------------------------------------------------
       Mobile long press anywhere
       ---------------------------------------------------------
       Long-press works over project cards and links as well as empty page space.
       Ordinary taps and swipes are preserved. The logo, burger/mobile menu and
       the filter overlay itself are excluded.
    */

    const HOLD_MS = 3000;
    const MOVE_TOLERANCE = 24;

    let holdTimer = 0;
    let holdStartX = 0;
    let holdStartY = 0;
    let holdTriggered = false;
    let suppressNextClick = false;
    let activePointerId = null;
    let activeTouchId = null;
    let openingFrame = 0;
    let holdGuardTimer = 0;

    const clearHoldTimer = () => {
        window.clearTimeout(holdTimer);
        window.clearTimeout(holdGuardTimer);
        holdTimer = 0;
        holdGuardTimer = 0;
        body.classList.remove('is-filter-holding');
    };

    const resetHold = () => {
        clearHoldTimer();
        activePointerId = null;
        activeTouchId = null;
        holdTriggered = false;
    };

    const isHoldExcludedTarget = (target) => {
        if (!(target instanceof Element)) return false;

        return Boolean(target.closest([
            '.burger',
            '.brand',
            '.mobile-brand',
            '#mobileMenu',
            '.mobile-menu',
            '#workFilterOverlay',
            '.work-filter-overlay'
        ].join(',')));
    };

    const canStartHold = (target) => {
        if (!mobileQuery.matches || !overlay) return false;
        if (overlay.classList.contains('is-open')) return false;
        if (body.classList.contains('menu-open')) return false;
        if (isHoldExcludedTarget(target)) return false;

        const mobileMenu = document.getElementById('mobileMenu');
        if (mobileMenu?.classList.contains('show')) return false;

        return true;
    };

    const openOverlayAt = (x, y) => {
        if (!overlay || !mobileQuery.matches) return;

        // Cancel any previous pending animation frame and hard-reset the closed
        // circle at the new point before allowing the opening transition.
        window.cancelAnimationFrame(openingFrame);
        overlay.classList.remove('is-open');
        overlay.classList.add('is-preparing');

        overlay.style.setProperty('--filter-origin-x', `${x}px`);
        overlay.style.setProperty('--filter-origin-y', `${y}px`);
        overlay.setAttribute('aria-hidden', 'false');

        // Force style/layout calculation with the NEW origin.
        void overlay.getBoundingClientRect();

        openingFrame = window.requestAnimationFrame(() => {
            overlay.classList.remove('is-preparing');

            // A second frame guarantees the browser has committed the collapsed
            // state before transitioning to the expanded circle.
            openingFrame = window.requestAnimationFrame(() => {
                overlay.classList.add('is-open');
                body.classList.add('filter-menu-open');
                syncButtons();

                window.setTimeout(() => {
                    const first = overlay.querySelector('.work-filter-overlay-option');
                    if (first) first.focus({ preventScroll: true });
                }, 360);
            });
        });
    };

    const startHold = (x, y, target) => {
        if (!canStartHold(target)) return false;

        clearHoldTimer();
        holdStartX = x;
        holdStartY = y;
        holdTriggered = false;

        holdGuardTimer = window.setTimeout(() => {
            if (holdTimer) body.classList.add('is-filter-holding');
        }, 320);

        holdTimer = window.setTimeout(() => {
            holdTriggered = true;
            suppressNextClick = true;
            openOverlayAt(holdStartX, holdStartY);

            if (navigator.vibrate) navigator.vibrate(18);
        }, HOLD_MS);

        return true;
    };

    const movedTooFar = (x, y) => (
        Math.hypot(x - holdStartX, y - holdStartY) > MOVE_TOLERANCE
    );

    /* Touch events are used explicitly because mobile browsers may cancel
       Pointer Events during a long press on links/images before 3 seconds. */
    document.addEventListener('touchstart', (event) => {
        if (event.touches.length !== 1) {
            resetHold();
            return;
        }

        const touch = event.touches[0];
        if (!startHold(touch.clientX, touch.clientY, event.target)) return;

        activeTouchId = touch.identifier;
    }, { capture: true, passive: true });

    document.addEventListener('touchmove', (event) => {
        if (activeTouchId === null || !holdTimer) return;

        const touch = [...event.touches].find((item) => item.identifier === activeTouchId);
        if (!touch) {
            resetHold();
            return;
        }

        if (movedTooFar(touch.clientX, touch.clientY)) {
            resetHold();
            return;
        }

        if (body.classList.contains('is-filter-holding')) {
            event.preventDefault();
        }
    }, { capture: true, passive: false });

    document.addEventListener('touchend', (event) => {
        if (activeTouchId === null) return;

        const endedTouch = [...event.changedTouches].find((item) => item.identifier === activeTouchId);
        if (!endedTouch) return;

        const completedHold = holdTriggered;
        clearHoldTimer();
        activeTouchId = null;
        holdTriggered = false;

        // Only the release after an actual 3-second hold is consumed.
        // Normal taps on work-card links remain completely untouched.
        if (completedHold) {
            event.preventDefault();
            event.stopPropagation();
        }
    }, { capture: true, passive: false });

    document.addEventListener('touchcancel', () => {
        resetHold();
    }, { capture: true, passive: true });

    /* Pointer fallback for pen/mouse-style input on narrow touch devices.
       Touch pointers are ignored here to avoid double timers. */
    document.addEventListener('pointerdown', (event) => {
        if (event.pointerType === 'touch') return;
        if (event.button !== 0) return;
        if (!startHold(event.clientX, event.clientY, event.target)) return;

        activePointerId = event.pointerId;
    }, true);

    document.addEventListener('pointermove', (event) => {
        if (event.pointerId !== activePointerId || !holdTimer) return;
        if (movedTooFar(event.clientX, event.clientY)) resetHold();
    }, true);

    document.addEventListener('pointerup', (event) => {
        if (event.pointerId !== activePointerId) return;

        const completedHold = holdTriggered;
        clearHoldTimer();
        activePointerId = null;
        holdTriggered = false;

        if (completedHold) {
            event.preventDefault();
            event.stopPropagation();
        }
    }, true);

    document.addEventListener('pointercancel', (event) => {
        if (event.pointerId === activePointerId) resetHold();
    }, true);

    // Suppress the synthetic click that follows a completed hold only.
    document.addEventListener('click', (event) => {
        if (!suppressNextClick) return;

        suppressNextClick = false;
        event.preventDefault();
        event.stopImmediatePropagation();
    }, true);

    // Prevent the browser's own link/image long-press menu from interrupting
    // the custom 3-second gesture, including directly over project cards.
    document.addEventListener('contextmenu', (event) => {
        if (!mobileQuery.matches) return;
        if (isHoldExcludedTarget(event.target)) return;

        event.preventDefault();
    }, true);

    document.addEventListener('selectionstart', (event) => {
        if (!mobileQuery.matches) return;
        if (isHoldExcludedTarget(event.target)) return;
        event.preventDefault();
    }, true);

    document.addEventListener('dragstart', (event) => {
        if (!mobileQuery.matches) return;
        if (event.target instanceof Element && event.target.closest('.work-grid')) {
            event.preventDefault();
        }
    }, true);

    syncButtons();
    applyFilters();
});
