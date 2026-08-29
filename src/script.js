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

    // Build an editorial rhythm for images, while all-video galleries use a
    // generic responsive row layout shared by every project page.
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
        const items = [...gallery.querySelectorAll(':scope > .gallery-item')];
        const isVideoGallery = items.length > 0 && items.every((item) => {
            const media = item.querySelector('img, video');
            return media instanceof HTMLVideoElement;
        });

        gallery.classList.toggle('video-gallery', isVideoGallery);
        gallery.classList.toggle('editorial-gallery', !isVideoGallery);

        items.forEach((item, index) => {
            const media = item.querySelector('img, video');
            const isVideo = media instanceof HTMLVideoElement;
            const cycle = Math.floor(index / layoutPattern.length);
            const patternIndex = index % layoutPattern.length;

            item.classList.toggle('is-video', isVideo);
            item.dataset.frame = `FRAME ${String(index + 1).padStart(2, '0')}`;

            if (isVideoGallery) {
                layoutPattern.forEach((className) => item.classList.remove(className));
                item.style.removeProperty('grid-row');
            } else {
                item.classList.add(layoutPattern[patternIndex]);
                item.style.gridRow = String(layoutRowPattern[patternIndex] + (cycle * 7));
            }

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

    // Custom portfolio video player. Native browser controls are removed and
    // replaced with a consistent, accessible interface in the site's visual language.
    const formatMediaTime = (seconds) => {
        if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
        const total = Math.floor(seconds);
        const hours = Math.floor(total / 3600);
        const minutes = Math.floor((total % 3600) / 60);
        const secs = String(total % 60).padStart(2, '0');
        return hours > 0
            ? `${hours}:${String(minutes).padStart(2, '0')}:${secs}`
            : `${minutes}:${secs}`;
    };

    const createCustomVideoPlayer = (video, options = {}) => {
        if (!(video instanceof HTMLVideoElement)) return null;
        if (video.customPlayerApi) return video.customPlayerApi;

        const shell = document.createElement('div');
        shell.className = `custom-video-player ${options.viewer ? 'is-viewer-player' : 'is-gallery-player'}`;
        shell.tabIndex = 0;
        shell.setAttribute('role', 'group');
        shell.setAttribute('aria-label', video.dataset.caption || video.getAttribute('aria-label') || 'Video player');

        const parent = video.parentNode;
        parent.insertBefore(shell, video);
        shell.appendChild(video);

        video.controls = false;
        video.removeAttribute('controls');
        video.playsInline = true;
        video.setAttribute('tabindex', '-1');
        const ui = document.createElement('div');
        ui.className = 'custom-video-ui';
        ui.innerHTML = `
            <button class="video-center-toggle" type="button" aria-label="Play video">
                <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
                    <path class="video-icon-play" d="M18 13.5 35 24 18 34.5Z"></path>
                </svg>
            </button>
            <div class="video-control-bar">
                <button class="video-control-button video-toggle" type="button" aria-label="Play video">
                    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
                        <path class="video-icon-play" d="M11 8.5 23 16 11 23.5Z"></path>
                        <g class="video-icon-pause"><rect x="9.5" y="8" width="4.5" height="16" rx="1"></rect><rect x="18" y="8" width="4.5" height="16" rx="1"></rect></g>
                    </svg>
                </button>
                <span class="video-time" aria-live="off">
                    <span class="video-current-time">0:00</span>
                    <span aria-hidden="true">/</span>
                    <span class="video-duration">0:00</span>
                </span>
                <span class="video-control-spacer"></span>
                <button class="video-control-button video-mute" type="button" aria-label="Mute video">
                    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
                        <path class="video-volume-body" d="M7 13h5l6-5v16l-6-5H7Z"></path>
                        <path class="video-volume-wave" d="M21 12.5c1.6 1.8 1.6 5.2 0 7M24 9.5c3.2 3.5 3.2 9.5 0 13"></path>
                        <path class="video-volume-muted" d="m21 12 7 8m0-8-7 8"></path>
                    </svg>
                </button>
                <button class="video-control-button video-fullscreen" type="button" aria-label="Enter fullscreen">
                    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
                        <path d="M7 13V7h6M19 7h6v6M25 19v6h-6M13 25H7v-6"></path>
                    </svg>
                </button>
            </div>
            <div class="video-timeline">
                <div class="video-timeline-track" aria-hidden="true">
                    <span class="video-buffered-bar"></span>
                    <span class="video-played-bar"></span>
                    <span class="video-timeline-thumb"></span>
                </div>
                <input class="video-seek" type="range" min="0" max="1000" value="0" step="1" aria-label="Video progress">
            </div>
        `;
        shell.appendChild(ui);

        const centerToggle = ui.querySelector('.video-center-toggle');
        const toggleButton = ui.querySelector('.video-toggle');
        const muteButton = ui.querySelector('.video-mute');
        const fullscreenButton = ui.querySelector('.video-fullscreen');
        const seek = ui.querySelector('.video-seek');
        const currentTime = ui.querySelector('.video-current-time');
        const duration = ui.querySelector('.video-duration');
        const playedBar = ui.querySelector('.video-played-bar');
        const bufferedBar = ui.querySelector('.video-buffered-bar');
        const thumb = ui.querySelector('.video-timeline-thumb');
        let controlsTimer = 0;
        let seeking = false;

        const syncState = () => {
            const total = Number.isFinite(video.duration) ? video.duration : 0;
            const current = Number.isFinite(video.currentTime) ? video.currentTime : 0;
            const progressValue = total > 0 ? Math.min(current / total, 1) : 0;
            const bufferedValue = (() => {
                if (!total || !video.buffered.length) return 0;
                try { return Math.min(video.buffered.end(video.buffered.length - 1) / total, 1); }
                catch (error) { return 0; }
            })();

            if (!seeking) seek.value = String(Math.round(progressValue * 1000));
            currentTime.textContent = formatMediaTime(current);
            duration.textContent = formatMediaTime(total);
            playedBar.style.transform = `scaleX(${progressValue})`;
            bufferedBar.style.transform = `scaleX(${bufferedValue})`;
            thumb.style.left = `${progressValue * 100}%`;

            const playing = !video.paused && !video.ended;
            shell.classList.toggle('is-playing', playing);
            shell.classList.toggle('is-muted', video.muted || video.volume === 0);
            shell.classList.toggle('is-ended', video.ended);
            toggleButton.setAttribute('aria-label', playing ? 'Pause video' : 'Play video');
            centerToggle.setAttribute('aria-label', playing ? 'Pause video' : 'Play video');
            muteButton.setAttribute('aria-label', video.muted || video.volume === 0 ? 'Unmute video' : 'Mute video');
        };

        const showControls = (linger = true) => {
            window.clearTimeout(controlsTimer);
            shell.classList.remove('is-idle');
            if (linger && !video.paused) {
                controlsTimer = window.setTimeout(() => shell.classList.add('is-idle'), 1900);
            }
        };

        const togglePlayback = () => {
            showControls();
            if (video.paused || video.ended) {
                const playback = video.play();
                if (playback && typeof playback.catch === 'function') playback.catch(() => {});
            } else {
                video.pause();
            }
        };

        const toggleMute = () => {
            video.muted = !video.muted;
            syncState();
            showControls();
        };

        const fullscreenTarget = options.fullscreenTarget || shell;
        const toggleFullscreen = async () => {
            try {
                if (document.fullscreenElement) await document.exitFullscreen();
                else if (fullscreenTarget.requestFullscreen) await fullscreenTarget.requestFullscreen();
            } catch (error) {
                // Fullscreen support is optional; playback remains available without it.
            }
        };

        [ui, centerToggle, toggleButton, muteButton, fullscreenButton, seek].forEach((element) => {
            element.addEventListener('click', (event) => event.stopPropagation());
            element.addEventListener('pointerdown', (event) => event.stopPropagation());
        });

        centerToggle.addEventListener('click', togglePlayback);
        toggleButton.addEventListener('click', togglePlayback);
        muteButton.addEventListener('click', toggleMute);
        fullscreenButton.addEventListener('click', toggleFullscreen);
        video.addEventListener('click', (event) => {
            event.stopPropagation();
            togglePlayback();
        });

        seek.addEventListener('pointerdown', () => { seeking = true; });
        seek.addEventListener('input', () => {
            const total = Number.isFinite(video.duration) ? video.duration : 0;
            const ratio = Number(seek.value) / 1000;
            playedBar.style.transform = `scaleX(${ratio})`;
            thumb.style.left = `${ratio * 100}%`;
            currentTime.textContent = formatMediaTime(total * ratio);
        });
        seek.addEventListener('change', () => {
            const total = Number.isFinite(video.duration) ? video.duration : 0;
            if (total > 0) video.currentTime = total * (Number(seek.value) / 1000);
            seeking = false;
            syncState();
            showControls();
        });
        seek.addEventListener('pointerup', () => { seeking = false; });

        shell.addEventListener('pointermove', () => showControls());
        shell.addEventListener('pointerenter', () => showControls(false));
        shell.addEventListener('pointerleave', () => {
            if (!video.paused) shell.classList.add('is-idle');
        });
        shell.addEventListener('focusin', () => showControls(false));
        shell.addEventListener('focusout', () => {
            if (!video.paused) showControls();
        });
        shell.addEventListener('keydown', (event) => {
            if (event.target === seek) return;
            if (event.key === ' ' || event.key === 'k' || event.key === 'K') {
                event.preventDefault();
                togglePlayback();
            } else if (event.key === 'm' || event.key === 'M') {
                event.preventDefault();
                toggleMute();
            } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                video.currentTime = Math.min((video.duration || 0), video.currentTime + 5);
            } else if (event.key === 'ArrowLeft') {
                event.preventDefault();
                video.currentTime = Math.max(0, video.currentTime - 5);
            }
        });

        ['loadedmetadata', 'durationchange', 'timeupdate', 'progress', 'volumechange', 'play', 'pause', 'ended', 'emptied'].forEach((eventName) => {
            video.addEventListener(eventName, syncState);
        });
        video.addEventListener('play', () => showControls());
        video.addEventListener('pause', () => showControls(false));
        document.addEventListener('fullscreenchange', () => {
            const isFullscreen = document.fullscreenElement === fullscreenTarget;
            shell.classList.toggle('is-native-fullscreen', isFullscreen);
            fullscreenButton.setAttribute('aria-label', isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen');
        });

        const api = {
            shell,
            video,
            sync: syncState,
            reset: (clearSource = false) => {
                video.pause();
                try { video.currentTime = 0; } catch (error) {}
                if (clearSource) {
                    video.removeAttribute('src');
                    video.load();
                }
                syncState();
            },
            setSource: ({ src, poster = '', caption = '', muted = false, autoplay = false }) => {
                video.pause();
                video.muted = muted;
                video.poster = poster;
                video.src = src;
                video.setAttribute('aria-label', caption || 'Video');
                shell.setAttribute('aria-label', caption || 'Video player');
                video.load();
                syncState();
                if (autoplay) {
                    const playback = video.play();
                    if (playback && typeof playback.catch === 'function') playback.catch(() => {});
                }
            }
        };

        video.customPlayerApi = api;
        syncState();
        return api;
    };
    const inlineVideoPlayers = new Map();
    document.querySelectorAll('.page-project .gallery-item video').forEach((video) => {
        const api = createCustomVideoPlayer(video);
        if (!api) return;
        inlineVideoPlayers.set(video, api);
        video.closest('.gallery-item')?.classList.add('has-custom-video');
    });

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
                        <video class="viewer-video" playsinline preload="metadata" hidden></video>
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
            const viewerVideoPlayer = createCustomVideoPlayer(viewerVideo, { viewer: true, fullscreenTarget: viewer });
            viewerVideo.hidden = false;
            viewerVideoPlayer.shell.hidden = true;
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
                viewerVideoPlayer.reset();
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
                        viewerVideoPlayer.shell.hidden = false;
                        viewerVideoPlayer.setSource({
                            src: getMediaSource(source),
                            poster: source.getAttribute('poster') || '',
                            caption,
                            muted: source.muted,
                            autoplay: true
                        });
                        if (viewerVideo.readyState >= 1) finishTransition(viewerVideo.videoWidth, viewerVideo.videoHeight);
                    } else {
                        viewerVideoPlayer.shell.hidden = true;
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
                if (media instanceof HTMLVideoElement) {
                    item.classList.remove('gallery-view-trigger');
                    item.removeAttribute('role');
                    item.removeAttribute('tabindex');
                    item.setAttribute('aria-label', `Video ${index + 1}`);
                    return;
                }

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

            viewer.addEventListener('pointerdown', (event) => {
                touchStartX = event.target.closest('.custom-video-player') ? null : event.clientX;
            }, { passive: true });
            viewer.addEventListener('pointerup', (event) => {
                // Controls inside the custom video player must never be interpreted
                // as gallery swipe navigation. Otherwise a mute/fullscreen click can
                // re-render the same video and reset playback to 0:00.
                if (event.target.closest('.custom-video-player')) {
                    touchStartX = null;
                    return;
                }

                if (viewer.classList.contains('is-zoomed') || touchStartX === null) {
                    touchStartX = null;
                    return;
                }

                const distance = event.clientX - touchStartX;
                touchStartX = null;
                if (Math.abs(distance) < 55) return;
                distance < 0 ? showNext() : showPrev();
            }, { passive: true });

            viewer.addEventListener('pointercancel', () => {
                touchStartX = null;
            }, { passive: true });

            document.addEventListener('keydown', (event) => {
                if (!viewer.classList.contains('is-open')) return;
                if (event.key === 'Escape') {
                    closeViewer();
                    return;
                }
                if (event.target.closest('.custom-video-player')) return;
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

        // Native fullscreen only renders the fullscreen element and its descendants.
        // Move the custom cursor into that subtree while fullscreen is active, then
        // return it to <body> on exit so the cursor never disappears.
        const syncFullscreenCursor = () => {
            const fullscreenElement = document.fullscreenElement;

            if (fullscreenElement) {
                if (!fullscreenElement.contains(cursor)) fullscreenElement.appendChild(cursor);
                cursor.classList.add('is-native-fullscreen', 'is-visible');
            } else {
                if (cursor.parentElement !== body) body.appendChild(cursor);
                cursor.classList.remove('is-native-fullscreen');
            }
        };

        document.addEventListener('fullscreenchange', syncFullscreenCursor);

        const interactiveSelector = 'a, button, .work-card, .gallery-view-trigger, .viewer-image, .custom-video-player, .video-seek';
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
