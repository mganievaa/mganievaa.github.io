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
            const media = item.querySelector('img, video');
            const isVideo = media instanceof HTMLVideoElement;
            const cycle = Math.floor(index / layoutPattern.length);
            const patternIndex = index % layoutPattern.length;
            item.classList.add(layoutPattern[patternIndex]);
            item.classList.toggle('is-video', isVideo);
            item.style.gridRow = String(layoutRowPattern[patternIndex] + (cycle * 7));
            item.dataset.frame = `FRAME ${String(index + 1).padStart(2, '0')}`;

            const readOrientation = () => {
                if (!media) return;
                const width = isVideo ? media.videoWidth : media.naturalWidth;
                const height = isVideo ? media.videoHeight : media.naturalHeight;
                if (!width || !height) return;
                const ratio = width / height;
                item.classList.toggle('is-portrait', ratio < .9);
                item.classList.toggle('is-square', ratio >= .9 && ratio <= 1.12);
                item.style.setProperty('--media-ratio', ratio.toFixed(3));
            };

            if (media instanceof HTMLImageElement) {
                media.loading = index === 0 ? 'eager' : 'lazy';
                media.decoding = 'async';
                if (index === 0) media.fetchPriority = 'high';
                if (media.complete) readOrientation();
                else media.addEventListener('load', readOrientation, { once: true });
            } else if (media instanceof HTMLVideoElement) {
                media.preload = media.preload || 'metadata';
                media.playsInline = true;
                if (media.readyState >= 1) readOrientation();
                else media.addEventListener('loadedmetadata', readOrientation, { once: true });
            }
        });
    });

    // Replace unavailable gallery files with a styled state while preserving their final layout slots.
    document.querySelectorAll('.gallery-item img, .gallery-item video').forEach((media) => {
        const showMissingState = () => {
            const item = media.closest('.gallery-item');
            if (!item || item.classList.contains('media-missing')) return;
            item.classList.add('media-missing');
            const notice = document.createElement('div');
            notice.className = 'missing-media';
            const sourcePath = media.getAttribute('src') || media.querySelector('source')?.getAttribute('src') || '';
            const filename = sourcePath.split('/').pop() || (media instanceof HTMLVideoElement ? 'video.mp4' : 'image');
            notice.textContent = `Place “${filename}” here — the editorial layout is already prepared for it.`;
            item.appendChild(notice);
        };

        media.addEventListener('error', showMissingState, { once: true });
        if (media instanceof HTMLImageElement && media.complete && media.naturalWidth === 0) showMissingState();
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

    // Immersive project pages: mixed image/video viewer, zoom for images,
    // keyboard navigation and swipe gestures.
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
        const mediaEntries = galleryItems
            .map((item) => ({ item, media: item.querySelector('img, video') }))
            .filter((entry) => entry.media);

        if (projectWrap && projectTitle && projectText && gallery && mediaEntries.length) {
            const matchedProjectIndex = projectOrder.findIndex((project) => project.file === currentPage || body.classList.contains(`project-${project.slug}`));
            const projectIndex = matchedProjectIndex >= 0 ? matchedProjectIndex : 0;
            const intro = document.createElement('section');
            intro.className = 'project-intro-v4';
            const introCopy = document.createElement('div');
            introCopy.className = 'project-intro-copy';
            const introMeta = document.createElement('aside');
            introMeta.className = 'project-intro-meta';
            introMeta.innerHTML = `
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
                        <img class="viewer-image" alt="" hidden>
                        <video class="viewer-video" controls playsinline preload="metadata" hidden></video>
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
            const viewerVideo = viewer.querySelector('.viewer-video');
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
            let activeIsVideo = false;

            viewerName.textContent = projectTitle.textContent.trim();

            const getMediaSource = (media) => (
                media.currentSrc
                || media.getAttribute('src')
                || media.querySelector('source')?.getAttribute('src')
                || ''
            );

            const getMediaCaption = (media, index) => (
                media.dataset.caption
                || media.getAttribute('alt')
                || media.getAttribute('aria-label')
                || media.getAttribute('title')
                || `Frame ${String(index + 1).padStart(2, '0')}`
            );

            const setZoom = (zoomed) => {
                const enabled = !activeIsVideo && zoomed;
                viewer.classList.toggle('is-zoomed', enabled);
                viewerZoom.textContent = enabled ? 'ZOOM −' : 'ZOOM +';
                viewerImageWrap.scrollTo({ top: 0, left: 0, behavior: 'auto' });
            };

            const stopViewerVideo = () => {
                viewerVideo.pause();
                viewerVideo.currentTime = 0;
            };

            const finishTransition = (width, height) => {
                const ratio = width && height ? width / height : 1;
                viewer.classList.toggle('is-portrait-frame', ratio < .9);
                requestAnimationFrame(() => viewer.classList.remove('is-changing'));
            };

            const renderFrame = (index, direction = 1) => {
                activeIndex = (index + mediaEntries.length) % mediaEntries.length;
                const source = mediaEntries[activeIndex].media;
                activeIsVideo = source instanceof HTMLVideoElement;
                setZoom(false);
                stopViewerVideo();
                viewer.classList.remove('move-next', 'move-prev');
                viewer.classList.add(direction >= 0 ? 'move-next' : 'move-prev', 'is-changing');
                viewer.classList.toggle('is-video-frame', activeIsVideo);

                window.setTimeout(() => {
                    const caption = getMediaCaption(source, activeIndex);
                    viewerIndex.textContent = `${String(activeIndex + 1).padStart(2, '0')} / ${String(mediaEntries.length).padStart(2, '0')}`;
                    viewerCaption.textContent = caption;
                    viewerProgress.style.transform = `scaleX(${(activeIndex + 1) / mediaEntries.length})`;

                    if (activeIsVideo) {
                        viewerImage.hidden = true;
                        viewerVideo.hidden = false;
                        viewerVideo.poster = source.getAttribute('poster') || '';
                        viewerVideo.src = getMediaSource(source);
                        viewerVideo.setAttribute('aria-label', caption);
                        viewerVideo.load();
                        if (viewerVideo.readyState >= 1) finishTransition(viewerVideo.videoWidth, viewerVideo.videoHeight);
                    } else {
                        viewerVideo.hidden = true;
                        viewerImage.hidden = false;
                        viewerImage.src = getMediaSource(source);
                        viewerImage.alt = caption;
                        if (viewerImage.complete && viewerImage.naturalWidth) {
                            finishTransition(viewerImage.naturalWidth, viewerImage.naturalHeight);
                        }
                    }
                }, reduceMotion ? 0 : 130);
            };

            viewerImage.addEventListener('load', () => {
                finishTransition(viewerImage.naturalWidth, viewerImage.naturalHeight);
            });

            viewerVideo.addEventListener('loadedmetadata', () => {
                finishTransition(viewerVideo.videoWidth, viewerVideo.videoHeight);
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
                stopViewerVideo();
                viewer.classList.remove('is-open', 'is-zoomed', 'is-video-frame');
                viewer.setAttribute('aria-hidden', 'true');
                body.classList.remove('viewer-open');
                if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus({ preventScroll: true });
            };

            const showNext = () => renderFrame(activeIndex + 1, 1);
            const showPrev = () => renderFrame(activeIndex - 1, -1);

            mediaEntries.forEach(({ item, media }, index) => {
                item.classList.add('gallery-view-trigger');
                item.tabIndex = 0;
                item.setAttribute('role', 'button');
                item.setAttribute('aria-label', `Open ${media instanceof HTMLVideoElement ? 'video' : 'frame'} ${index + 1} in fullscreen`);
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

            const hasCustomNextProject = body.hasAttribute('data-next-project-url');
            const customNextUrl = body.dataset.nextProjectUrl?.trim() || '';
            const customNextTitle = body.dataset.nextProjectTitle?.trim() || 'Next project';
            const nextProject = hasCustomNextProject
                ? (customNextUrl ? { file: customNextUrl, title: customNextTitle } : null)
                : projectOrder[(projectIndex + 1) % projectOrder.length];

            if (nextProject) {
                const nextLink = document.createElement('a');
                nextLink.className = 'next-project-link';
                nextLink.href = nextProject.file;
                nextLink.innerHTML = `<span>NEXT PROJECT</span><strong>${nextProject.title}</strong><i aria-hidden="true">↗</i>`;
                projectWrap.appendChild(nextLink);
            }
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

        const interactiveSelector = 'a, button, .work-card, .gallery-view-trigger, .viewer-image, .viewer-video';
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
