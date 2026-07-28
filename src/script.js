document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    const burger = document.querySelector('.burger');
    const menu = document.getElementById('mobileMenu');
    const mobileLinks = document.querySelectorAll('.mobile-menu a');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    // Move the mobile control out of the animated header stacking context.
    // This keeps the close icon clickable above the full-screen menu.
    if (burger && burger.parentElement !== body) body.appendChild(burger);

    body.classList.add('page-enter');

    // Active navigation state.
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-desktop a, .mobile-nav a').forEach((link) => {
        if (link.getAttribute('href') === currentPage) link.setAttribute('aria-current', 'page');
    });

    // Accessible mobile menu with a reliably visible close control.
    if (burger && menu) {
        burger.setAttribute('aria-controls', 'mobileMenu');
        burger.setAttribute('aria-expanded', 'false');
        menu.setAttribute('aria-hidden', 'true');

        const closeMenu = () => {
            burger.classList.remove('active');
            menu.classList.remove('show');
            body.classList.remove('menu-open');
            burger.setAttribute('aria-expanded', 'false');
            burger.setAttribute('aria-label', 'Open menu');
            menu.setAttribute('aria-hidden', 'true');
        };

        const openMenu = () => {
            burger.classList.add('active');
            menu.classList.add('show');
            body.classList.add('menu-open');
            burger.setAttribute('aria-expanded', 'true');
            burger.setAttribute('aria-label', 'Close menu');
            menu.setAttribute('aria-hidden', 'false');
        };

        burger.addEventListener('click', () => {
            menu.classList.contains('show') ? closeMenu() : openMenu();
        });

        mobileLinks.forEach((link) => link.addEventListener('click', closeMenu));
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') closeMenu();
        });
        window.addEventListener('resize', () => {
            if (window.innerWidth > 991) closeMenu();
        });
    }

    // Scroll progress on content-heavy pages.
    const progress = document.createElement('div');
    progress.className = 'scroll-progress';
    progress.setAttribute('aria-hidden', 'true');
    body.appendChild(progress);

    const updateProgress = () => {
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const value = maxScroll > 0 ? Math.min(window.scrollY / maxScroll, 1) : 0;
        progress.style.transform = `scaleX(${value})`;
    };

    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);

    // Build an editorial image rhythm without cropping any supplied artwork.
    const layoutPattern = [
        'layout-wide',
        'layout-left',
        'layout-right',
        'layout-center',
        'layout-small-left',
        'layout-large-right',
        'layout-wide',
        'layout-large-left',
        'layout-small-right',
        'layout-center'
    ];
    const layoutRowPattern = [1, 2, 2, 3, 4, 4, 5, 6, 6, 7];

    document.querySelectorAll('.page-project .gallery').forEach((gallery) => {
        gallery.classList.add('editorial-gallery');
        const items = [...gallery.querySelectorAll('.gallery-item')];

        items.forEach((item, index) => {
            const image = item.querySelector('img');
            const cycle = Math.floor(index / layoutPattern.length);
            const patternIndex = index % layoutPattern.length;
            item.classList.add(layoutPattern[patternIndex]);
            item.style.gridRow = String(layoutRowPattern[patternIndex] + (cycle * 7));
            item.dataset.frame = `FRAME ${String(index + 1).padStart(2, '0')}`;

            const readOrientation = () => {
                if (!image || !image.naturalWidth || !image.naturalHeight) return;
                const ratio = image.naturalWidth / image.naturalHeight;
                item.classList.toggle('is-portrait', ratio < .9);
                item.classList.toggle('is-square', ratio >= .9 && ratio <= 1.12);
                item.style.setProperty('--media-ratio', ratio.toFixed(3));
            };

            if (image) {
                image.loading = index === 0 ? 'eager' : 'lazy';
                image.decoding = 'async';
                if (index === 0) image.fetchPriority = 'high';
                if (image.complete) readOrientation();
                else image.addEventListener('load', readOrientation, { once: true });
            }
        });
    });

    // Replace unavailable gallery files with a styled state while preserving their final layout slots.
    document.querySelectorAll('.gallery-item img').forEach((image) => {
        const showMissingState = () => {
            const item = image.closest('.gallery-item');
            if (!item || item.classList.contains('media-missing')) return;
            item.classList.add('media-missing');
            const notice = document.createElement('div');
            notice.className = 'missing-media';
            const filename = image.getAttribute('src')?.split('/').pop() || 'image';
            notice.textContent = `Place “${filename}” here — the editorial layout is already prepared for it.`;
            item.appendChild(notice);
        };

        image.addEventListener('error', showMissingState, { once: true });
        if (image.complete && image.naturalWidth === 0) showMissingState();
    });

    // Reveal sections and gallery items as they enter the viewport.
    if (!reduceMotion && 'IntersectionObserver' in window) {
        const targets = [
            ...document.querySelectorAll('.work-card'),
            ...document.querySelectorAll('.about-top > *'),
            ...document.querySelectorAll('.bottom-grid > *'),
            ...document.querySelectorAll('.project-title, .project-text'),
            ...document.querySelectorAll('.gallery-item')
        ];

        targets.forEach((element, index) => {
            element.classList.add('reveal-ready');
            if (element.matches('.work-card, .gallery-item')) element.classList.add('reveal-scale');
            if (element.matches('.about-top > :first-child')) element.classList.add('reveal-left');
            element.style.transitionDelay = `${Math.min((index % 4) * 70, 210)}ms`;
        });

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            });
        }, { threshold: 0.08, rootMargin: '0px 0px -8% 0px' });

        targets.forEach((element) => observer.observe(element));
    }

    // Subtle pointer parallax for the home collage.
    const scene = document.querySelector('.polaroid-scene');
    if (scene && !reduceMotion && finePointer) {
        scene.addEventListener('pointermove', (event) => {
            const bounds = scene.getBoundingClientRect();
            const x = (event.clientX - bounds.left) / bounds.width - 0.5;
            const y = (event.clientY - bounds.top) / bounds.height - 0.5;
            scene.style.transform = `perspective(900px) rotateX(${-y * 3}deg) rotateY(${x * 4}deg)`;
        });
        scene.addEventListener('pointerleave', () => {
            scene.style.transform = '';
        });
    }

    // Immersive project pages: editorial intro, fullscreen series viewer, zoom, keyboard and swipe navigation.
    if (body.classList.contains('page-project')) {
        const projectOrder = [
            { file: 'bahore.html', slug: 'bahore', title: 'Bahoré' },
            { file: 'dark.html', slug: 'dark', title: 'Dark Matter' },
            { file: 'kazimir.html', slug: 'kazimir', title: 'Kazimir' },
            { file: 'lionel.html', slug: 'lionel', title: 'Lionel' }
        ];
        const projectWrap = document.querySelector('.project-wrap');
        const projectTitle = projectWrap?.querySelector('.project-title');
        const projectText = projectWrap?.querySelector('.project-text');
        const gallery = projectWrap?.querySelector('.gallery');
        const galleryItems = gallery ? [...gallery.querySelectorAll('.gallery-item')] : [];
        const images = galleryItems.map((item) => item.querySelector('img')).filter(Boolean);

        if (projectWrap && projectTitle && projectText && gallery && images.length) {
            const projectIndex = Math.max(0, projectOrder.findIndex((project) => project.file === currentPage || body.classList.contains(`project-${project.slug}`)));
            const intro = document.createElement('section');
            intro.className = 'project-intro-v4';
            const introCopy = document.createElement('div');
            introCopy.className = 'project-intro-copy';
            const introMeta = document.createElement('aside');
            introMeta.className = 'project-intro-meta';
            introMeta.innerHTML = `
                <span class="project-eyebrow">PROJECT / ${String(projectIndex + 1).padStart(2, '0')}</span>
                <button class="open-series" type="button">VIEW SERIES <span aria-hidden="true">↗</span></button>
                <span class="project-view-note">click any frame for fullscreen</span>
            `;
            projectTitle.before(intro);
            introCopy.append(projectTitle, introMeta, projectText);
            intro.append(introCopy);

            const viewer = document.createElement('div');
            viewer.className = 'project-viewer';
            viewer.setAttribute('aria-hidden', 'true');
            viewer.innerHTML = `
                <div class="viewer-grain" aria-hidden="true"></div>
                <header class="viewer-header">
                    <a href="index.html" class="viewer-brand">MG</a>
                    <div class="viewer-project-name"></div>
                    <button class="viewer-close" type="button" aria-label="Close fullscreen viewer"><span></span><span></span></button>
                </header>
                <button class="viewer-arrow viewer-prev" type="button" aria-label="Previous frame">←</button>
                <div class="viewer-stage">
                    <div class="viewer-image-wrap">
                        <img class="viewer-image" alt="">
                    </div>
                </div>
                <button class="viewer-arrow viewer-next" type="button" aria-label="Next frame">→</button>
                <footer class="viewer-footer">
                    <span class="viewer-index"></span>
                    <div class="viewer-progress"><span></span></div>
                    <span class="viewer-caption"></span>
                    <button class="viewer-zoom" type="button">ZOOM +</button>
                </footer>
            `;
            body.appendChild(viewer);

            const viewerImage = viewer.querySelector('.viewer-image');
            const viewerImageWrap = viewer.querySelector('.viewer-image-wrap');
            const viewerIndex = viewer.querySelector('.viewer-index');
            const viewerCaption = viewer.querySelector('.viewer-caption');
            const viewerProgress = viewer.querySelector('.viewer-progress span');
            const viewerName = viewer.querySelector('.viewer-project-name');
            const viewerZoom = viewer.querySelector('.viewer-zoom');
            const closeButton = viewer.querySelector('.viewer-close');
            const prevButton = viewer.querySelector('.viewer-prev');
            const nextButton = viewer.querySelector('.viewer-next');
            const openButton = introMeta.querySelector('.open-series');
            let activeIndex = 0;
            let previousFocus = null;
            let touchStartX = 0;

            viewerName.textContent = projectTitle.textContent.trim();

            const setZoom = (zoomed) => {
                viewer.classList.toggle('is-zoomed', zoomed);
                viewerZoom.textContent = zoomed ? 'ZOOM −' : 'ZOOM +';
                viewerImageWrap.scrollTo({ top: 0, left: 0, behavior: 'auto' });
            };

            const renderFrame = (index, direction = 1) => {
                activeIndex = (index + images.length) % images.length;
                const source = images[activeIndex];
                setZoom(false);
                viewer.classList.remove('move-next', 'move-prev');
                viewer.classList.add(direction >= 0 ? 'move-next' : 'move-prev', 'is-changing');

                window.setTimeout(() => {
                    viewerImage.src = source.currentSrc || source.src;
                    viewerImage.alt = source.alt || `${projectTitle.textContent.trim()} frame ${activeIndex + 1}`;
                    viewerIndex.textContent = `${String(activeIndex + 1).padStart(2, '0')} / ${String(images.length).padStart(2, '0')}`;
                    viewerCaption.textContent = source.alt || `Frame ${String(activeIndex + 1).padStart(2, '0')}`;
                    viewerProgress.style.transform = `scaleX(${(activeIndex + 1) / images.length})`;
                }, reduceMotion ? 0 : 130);
            };

            viewerImage.addEventListener('load', () => {
                const ratio = viewerImage.naturalWidth / viewerImage.naturalHeight;
                viewer.classList.toggle('is-portrait-frame', ratio < .9);
                requestAnimationFrame(() => viewer.classList.remove('is-changing'));
            });

            const openViewer = (index = 0) => {
                previousFocus = document.activeElement;
                viewer.classList.add('is-open');
                viewer.setAttribute('aria-hidden', 'false');
                body.classList.add('viewer-open');
                renderFrame(index);
                closeButton.focus({ preventScroll: true });
            };

            const closeViewer = () => {
                viewer.classList.remove('is-open', 'is-zoomed');
                viewer.setAttribute('aria-hidden', 'true');
                body.classList.remove('viewer-open');
                if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus({ preventScroll: true });
            };

            const showNext = () => renderFrame(activeIndex + 1, 1);
            const showPrev = () => renderFrame(activeIndex - 1, -1);

            galleryItems.forEach((item, index) => {
                item.classList.add('gallery-view-trigger');
                item.tabIndex = 0;
                item.setAttribute('role', 'button');
                item.setAttribute('aria-label', `Open frame ${index + 1} in fullscreen`);
                item.addEventListener('click', () => {
                    if (!item.classList.contains('media-missing')) openViewer(index);
                });
                item.addEventListener('keydown', (event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    if (!item.classList.contains('media-missing')) openViewer(index);
                });
            });

            const handleOpenSeries = (event) => {
                event.preventDefault();
                event.stopPropagation();
                openViewer(0);
            };
            openButton.addEventListener('click', handleOpenSeries);
            closeButton.addEventListener('click', closeViewer);
            prevButton.addEventListener('click', showPrev);
            nextButton.addEventListener('click', showNext);
            viewerZoom.addEventListener('click', () => setZoom(!viewer.classList.contains('is-zoomed')));
            viewerImage.addEventListener('click', () => setZoom(!viewer.classList.contains('is-zoomed')));
            viewer.addEventListener('click', (event) => {
                if (event.target === viewer.querySelector('.viewer-stage')) closeViewer();
            });

            viewer.addEventListener('pointerdown', (event) => { touchStartX = event.clientX; }, { passive: true });
            viewer.addEventListener('pointerup', (event) => {
                if (viewer.classList.contains('is-zoomed')) return;
                const distance = event.clientX - touchStartX;
                if (Math.abs(distance) < 55) return;
                distance < 0 ? showNext() : showPrev();
            }, { passive: true });

            document.addEventListener('keydown', (event) => {
                if (!viewer.classList.contains('is-open')) return;
                if (event.key === 'Escape') closeViewer();
                if (event.key === 'ArrowRight') showNext();
                if (event.key === 'ArrowLeft') showPrev();
            });

            const nextProject = projectOrder[(projectIndex + 1) % projectOrder.length];
            const nextLink = document.createElement('a');
            nextLink.className = 'next-project-link';
            nextLink.href = nextProject.file;
            nextLink.innerHTML = `<span>NEXT PROJECT</span><strong>${nextProject.title}</strong><i aria-hidden="true">↗</i>`;
            projectWrap.appendChild(nextLink);
        }
    }

    // Vector cursor for mouse and trackpad users. The ring scales inside SVG,
    // so its contour stays crisp on high-DPI screens and interactive hover states.
    if (finePointer && !reduceMotion) {
        const cursor = document.createElement('div');
        cursor.className = 'modern-cursor';
        cursor.setAttribute('aria-hidden', 'true');
        cursor.innerHTML = `
            <svg viewBox="0 0 64 64" focusable="false" aria-hidden="true">
                <circle class="modern-cursor-ring" cx="32" cy="32" r="15" vector-effect="non-scaling-stroke"></circle>
                <circle class="modern-cursor-dot" cx="32" cy="32" r="2.4"></circle>
            </svg>
        `;
        body.appendChild(cursor);
        body.classList.add('cursor-enabled');

        let targetX = -100;
        let targetY = -100;
        let currentX = -100;
        let currentY = -100;
        let isInteractive = false;

        const renderCursor = () => {
            currentX += (targetX - currentX) * 0.28;
            currentY += (targetY - currentY) * 0.28;
            cursor.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;
            requestAnimationFrame(renderCursor);
        };
        requestAnimationFrame(renderCursor);

        document.addEventListener('pointermove', (event) => {
            targetX = event.clientX;
            targetY = event.clientY;
            cursor.classList.add('is-visible');
        }, { passive: true });

        document.documentElement.addEventListener('mouseleave', () => cursor.classList.remove('is-visible'));

        const interactiveSelector = 'a, button, .work-card, .gallery-view-trigger, .viewer-image';
        document.querySelectorAll(interactiveSelector).forEach((element) => {
            element.addEventListener('pointerenter', () => {
                isInteractive = true;
                cursor.classList.add('is-active');
            });
            element.addEventListener('pointerleave', () => {
                isInteractive = false;
                cursor.classList.remove('is-active');
            });
        });

        document.addEventListener('pointerdown', () => cursor.classList.add('is-pressed'));
        document.addEventListener('pointerup', () => {
            cursor.classList.remove('is-pressed');
            cursor.classList.toggle('is-active', isInteractive);
        });
    }

});
