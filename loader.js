/* ============================================================
   THINKAMIGO UNIFIED LOADER & INJECTOR v23.11
   Architecture: Triple-Slot Filmstrip + Sovereign Projector
   Updates: Footer-First Handshake | story-inline-video Sync
            Amigos Authentication Module | External Link Fix | Lock Removed
   v23.8: Apple iPad Mini Safari Bug Fix. On iOS Safari, position: fixed
          elements render offset from the viewport when the page has scrolled.
          Fix: window.scrollTo(0, 0) called before no-scroll class is applied
          and before the lightbox overlay is made visible. Order is critical —
          scroll first, lock second, show third. Chrome on iOS unaffected.
   v23.9: Apple iPad Mini Safari Bug Fix extended to video projector.
          Same root cause as v23.8. window.scrollTo(0, 0) now called before
          overflow lock and before projector display in openProjector().
   v23.10: autoplay=1 removed from Vimeo URL. iOS Safari blocks autoplay
           in iframes unless a qualifying user gesture is passed through,
           which is not guaranteed. Removing autoplay lets the user press
           play manually inside the iframe. Works reliably on all platforms.
   v23.12: autoplay=1 restored to Vimeo URL, YouTube and MP4. Removing autoplay
           caused Vimeo to serve a blurred thumbnail instead of the player.
           Autoplay was working correctly on desktop and iPhone before v23.10
           so the removal was incorrect. iOS Safari autoplay policy satisfied
           by the user tap gesture on the theatre card.
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. THE INJECTOR ENGINE (ASYNCHRONOUS) ---
    const base = document.body.getAttribute('data-base') || '';

    const loadPartials = async () => {
        try {
            // 1a. Inject Header
            const hRes = await fetch(`${base}header.html`);
            if (hRes.ok) {
                const hData = await hRes.text();
                const hSocket = document.getElementById('main-nav');
                if (hSocket) { 
                    hSocket.innerHTML = hData; 
                    setupMobileMenu(); 
                }
            }

            // 1b. Inject Footer (CONTAINING THE PROJECTOR)
            const fRes = await fetch(`${base}footer.html`);
            if (fRes.ok) {
                const fData = await fRes.text();
                const fSocket = document.getElementById('main-footer');
                if (fSocket) { 
                    fSocket.innerHTML = fData; 
                    
                    // --- THE HANDSHAKE ---
                    // Now that footer is physically in the DOM, we can bind video events
                    setupUI(); 
                    setupAudioPlayer(); 
                    
                    if (document.querySelector('.theatre-card')) {
                        setupProjectorLogic();
                    }
                }
            }

            // 1c. Global Lightbox (Images)
            if (document.querySelector('img[data-full]') || document.querySelector('.video-item')) {
                injectLightbox();
            }

        } catch (err) {
            console.warn("Partial injection missed a step:", err);
        }
    };

    // --- 2. MODULE: CINEMATIC THEATRE PROJECTOR (v5.4 SYNC) ---
    const setupProjectorLogic = () => {
        const projector = document.getElementById('video-theatre-projector');
        const target = document.getElementById('projector-video-container');
        const closeBtn = document.querySelector('.projector-close');
        const cards = document.querySelectorAll('.theatre-card');

        if (!projector || !target) {
            console.warn("Projector structure missing from Footer.");
            return;
        }

        const openProjector = (videoData) => {
            let finalHtml = "";

            // Handle Local MP4
            if (videoData.includes('.mp4')) {
                finalHtml = `<video controls autoplay playsinline controlsList="nodownload" style="width:100%;height:100%;display:block;">
                    <source src="${videoData}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>`;
            } 
            // Handle YouTube
            else if (videoData.includes('youtube.com') || videoData.includes('youtu.be')) {
                finalHtml = `<iframe src="${videoData}" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="width:100%;height:100%;border:none;display:block;"></iframe>`;
            }
            // Default to Vimeo (Project ID)
            else {
                const vimeoUrl = `https://player.vimeo.com/video/${videoData}?autoplay=1&color=ff6600&title=0&byline=0&portrait=0`;
                finalHtml = `<iframe src="${vimeoUrl}" frameborder="0" allow="fullscreen" allowfullscreen style="width:100%;height:100%;border:none;display:block;"></iframe>`;
            }

            target.innerHTML = finalHtml;

            // --- APPLE IPAD MINI SAFARI BUG FIX ---
            // On iOS Safari, position: fixed elements render offset from the
            // viewport when the page has scrolled. Scroll to top first, apply
            // the overflow lock second, show the projector third.
            // Order is critical.
            window.scrollTo(0, 0);
            document.body.style.overflow = 'hidden';
            projector.style.display = 'flex';
        };

        const closeProjector = () => {
            projector.style.display = 'none';
            target.innerHTML = ''; 
            document.body.style.overflow = 'auto'; 
        };

        // Bind events to cards (now that they are physically in the DOM)
        // External link cards (a tags with href) open naturally — do not intercept
        cards.forEach(card => {
            if (card.tagName === 'A' && card.getAttribute('href')) return;
            card.addEventListener('click', (e) => {
                e.preventDefault();
                const data = card.getAttribute('data-video');
                if (data) openProjector(data);
            });
        });

        if (closeBtn) closeBtn.addEventListener('click', closeProjector);

        // Escape Key Support
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && projector.style.display === 'flex') {
                closeProjector();
            }
        });
    };

    // --- 3. MODULE: LIGHTBOX INJECTOR & ENGINE (IMAGES) ---
    const injectLightbox = () => {
        if (document.getElementById('lightbox-overlay')) return;

        const lb = document.createElement('div');
        lb.id = 'lightbox-overlay';
        lb.className = 'lightbox';
        
        if (document.body.classList.contains('comic-mode')) {
            lb.classList.add('comic-mode');
        }

        lb.innerHTML = `
            <div class="lightbox-close"></div>
            <div class="lightbox-prev" id="prev-btn"></div>
            <div class="lightbox-next" id="next-btn"></div>
            <div class="lightbox-track" id="lb-track">
                <div class="lb-slot" id="slot-prev"></div>
                <div class="lb-slot" id="slot-curr"></div>
                <div class="lb-slot" id="slot-next"></div>
            </div>
            <div class="lightbox-info">
                <span class="lightbox-caption" id="lb-cap"></span>
            </div>
        `;
        document.body.appendChild(lb);
        setupLightboxLogic();
        setupLegacyVideoLogic(); 
    };

    const setupLightboxLogic = () => {
        const overlay = document.getElementById('lightbox-overlay');
        const track = document.getElementById('lb-track');
        const slotPrev = document.getElementById('slot-prev');
        const slotCurr = document.getElementById('slot-curr');
        const slotNext = document.getElementById('slot-next');
        const lbCap = document.getElementById('lb-cap');
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        
        let currentGallery = [];
        let currentIndex = 0;
        let touchStartX = 0;
        let isAnimating = false;

        const prepareSlots = () => {
            const total = currentGallery.length;
            const prevIdx = (currentIndex - 1 + total) % total;
            const nextIdx = (currentIndex + 1) % total;
            const getImg = (idx) => `<img src="${currentGallery[idx].getAttribute('data-full')}" class="lightbox-content">`;

            slotCurr.innerHTML = getImg(currentIndex);
            const rawCap = currentGallery[currentIndex].getAttribute('alt') || "";
            const isComic = document.body.classList.contains('comic-mode');
            const sep = rawCap ? (isComic ? ` &nbsp;/&nbsp; ` : ` &nbsp;—&nbsp; `) : "";
            lbCap.innerHTML = `<span class="lb-count-accent">${currentIndex + 1} / ${total}</span>${sep}${rawCap}`;

            if (total > 1) {
                slotPrev.innerHTML = getImg(prevIdx);
                slotNext.innerHTML = getImg(nextIdx);
                prevBtn.style.display = 'block';
                nextBtn.style.display = 'block';
            } else {
                slotPrev.innerHTML = ''; slotNext.innerHTML = '';
                prevBtn.style.display = 'none'; nextBtn.style.display = 'none';
            }
        };

        const navigate = (direction) => {
            if (isAnimating || currentGallery.length <= 1) return;
            isAnimating = true;

            const targetTranslate = direction === 1 ? -66.66 : 0;
            track.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            track.style.transform = `translateX(${targetTranslate}%)`;

            setTimeout(() => {
                currentIndex = (currentIndex + direction + currentGallery.length) % currentGallery.length;
                track.style.transition = 'none';
                track.style.transform = 'translateX(-33.33%)';
                prepareSlots();
                isAnimating = false;
            }, 410);
        };

        const closeLB = (e) => {
            if (e) e.stopPropagation(); 
            overlay.style.display = 'none';
            document.body.classList.remove('no-scroll');
        };

        document.addEventListener('keydown', (e) => {
            if (overlay.style.display === 'flex') {
                if (e.key === 'ArrowRight' || e.key === ' ') {
                    e.preventDefault();
                    navigate(1);
                } else if (e.key === 'ArrowLeft') {
                    navigate(-1);
                } else if (e.key === 'Escape') {
                    closeLB();
                }
            }
        });

        overlay.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
        overlay.addEventListener('touchend', e => {
            const diff = touchStartX - e.changedTouches[0].screenX;
            if (Math.abs(diff) > 50) navigate(diff > 0 ? 1 : -1);
        }, { passive: true });

        document.addEventListener('click', (e) => {
            const clicked = e.target.closest('img[data-full]');
            if (!clicked) return;

            const galleryTag = clicked.getAttribute('data-gallery');
            currentGallery = galleryTag 
                ? Array.from(document.querySelectorAll(`img[data-gallery="${galleryTag}"]`))
                : [clicked];
            
            currentIndex = currentGallery.indexOf(clicked);
            track.style.transition = 'none';
            track.style.transform = 'translateX(-33.33%)';
            prepareSlots();

            // --- APPLE IPAD MINI SAFARI BUG FIX ---
            // On iOS Safari, position: fixed elements render offset from the
            // viewport when the page has scrolled. Scroll to top first, apply
            // the scroll lock second, show the overlay third. Order is critical.
            window.scrollTo(0, 0);
            document.body.classList.add('no-scroll');
            overlay.style.display = 'flex';
        });

        nextBtn.addEventListener('click', (e) => { e.stopPropagation(); navigate(1); });
        prevBtn.addEventListener('click', (e) => { e.stopPropagation(); navigate(-1); });
        overlay.querySelector('.lightbox-close').addEventListener('click', closeLB);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) closeLB(e); });
    };

    // --- 4. MODULE: UTILITY & UI ---
    const setupLegacyVideoLogic = () => {
        document.addEventListener('click', (e) => {
            const trigger = e.target.closest('.video-item');
            if (!trigger) return;
            const id = trigger.getAttribute('data-video-id');
            const url = `https://player.vimeo.com/video/${id}?color=f39c12`;
            document.getElementById('slot-curr').innerHTML = `<div class="video-stage"><iframe src="${url}" frameborder="0" allow="fullscreen" allowfullscreen></iframe></div>`;
            document.getElementById('lightbox-overlay').style.display = 'flex';
            document.body.classList.add('no-scroll');
        });
    };

    const setupMobileMenu = () => {
        const checkbox = document.getElementById('menu-toggle');
        if (!checkbox) return;
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', () => { checkbox.checked = false; });
        });
    };

    const setupAudioPlayer = () => {
        const engine = document.getElementById('main-audio-engine');
        const masterBtn = document.getElementById('masterPlayBtn');
        const ledTitle = document.getElementById('now-playing');
        const timeElapsed = document.getElementById('master-time');
        const timeTotal = document.getElementById('master-duration');
        const progressBar = document.getElementById('master-progress');

        if (!engine || !masterBtn) return;

        const formatTime = (secs) => {
            if (isNaN(secs)) return "00:00";
            const mins = Math.floor(secs / 60);
            const s = Math.floor(secs % 60);
            return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        };

        document.querySelectorAll('.track-item').forEach(track => {
            track.addEventListener('click', () => {
                if (ledTitle) ledTitle.innerText = track.getAttribute('data-title');
                engine.src = track.getAttribute('data-src');
                engine.play();
                masterBtn.classList.add('playing');
            });
        });

        masterBtn.addEventListener('click', () => {
            engine.paused ? engine.play() : engine.pause();
            masterBtn.classList.toggle('playing');
        });

        engine.addEventListener('timeupdate', () => {
            if (timeElapsed) timeElapsed.innerText = formatTime(engine.currentTime);
            if (progressBar && engine.duration) {
                const perc = (engine.currentTime / engine.duration) * 100;
                progressBar.style.width = perc + '%';
            }
        });

        engine.addEventListener('loadedmetadata', () => {
            if (timeTotal) timeTotal.innerText = formatTime(engine.duration);
        });
    };

    const setupUI = () => {
        const topBtn = document.getElementById('backToTop');
        if (!topBtn) return;
        window.addEventListener('scroll', () => {
            window.scrollY > 400 ? topBtn.classList.add('show') : topBtn.classList.remove('show');
        }, { passive: true });
        topBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    };

    // --- 5. MODULE: AMIGOS AUTHENTICATION ---
    const AMIGOS_PASSWORD = 'amigogogo';
    const AMIGOS_SESSION_KEY = 'amigos_auth';

    const setupAmigosGate = () => {
        const input = document.getElementById('password-input');
        const error = document.getElementById('gate-error');
        const btn = document.getElementById('gate-btn');

        if (!input) return;

        const checkPassword = () => {
            const val = input.value.trim();
            if (val === AMIGOS_PASSWORD) {
                sessionStorage.setItem(AMIGOS_SESSION_KEY, 'true');
                window.location.href = 'amigos.html';
            } else {
                input.classList.add('error');
                if (error) error.textContent = 'Not quite — try again.';
                input.value = '';
                input.focus();
                setTimeout(() => {
                    input.classList.remove('error');
                    if (error) error.textContent = '';
                }, 3000);
            }
        };

        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') checkPassword(); });
        if (btn) btn.addEventListener('click', checkPassword);
    };

    const setupAmigosGuard = () => {
        // Protects amigos.html — redirects to gate if not authenticated
        if (document.body.classList.contains('amigos-protected')) {
            if (sessionStorage.getItem(AMIGOS_SESSION_KEY) !== 'true') {
                window.location.href = 'hello-amigos.html';
            }
        }
    };

    setupAmigosGuard();
    setupAmigosGate();
    loadPartials();

});