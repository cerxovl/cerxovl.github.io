/*
  Cyberpunk neon one-page portfolio
  Files: index.html / style.css / script.js
*/

(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // Preloader
  const preloader = $("#preloader");
  window.addEventListener("load", () => {
    // Give the GPU a tiny moment for the video/canvas to settle
    setTimeout(() => {
      preloader?.classList.add("is-hidden");
      revealAll();
    }, 350);
  });

  // Reveal on scroll
  const revealEls = $$('[data-reveal]');
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.18 }
  );

  function revealAll() {
    revealEls.forEach((el) => io.observe(el));
  }

  // Ripple effect
  const rippleTargets = $$('[data-ripple]');
  rippleTargets.forEach((el) => {
    el.addEventListener("click", (ev) => {
      const rect = el.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;

      const span = document.createElement("span");
      span.className = "ripple";
      span.style.left = `${x}px`;
      span.style.top = `${y}px`;
      el.appendChild(span);

      window.setTimeout(() => span.remove(), 750);
    });
  });

  // Custom cursor (desktop only)
  const cursor = $("#cursor");
  let cursorVisible = false;

  const isCoarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  if (!isCoarse && cursor) {
    const move = (ev) => {
      cursor.style.left = `${ev.clientX}px`;
      cursor.style.top = `${ev.clientY}px`;
      if (!cursorVisible) {
        cursorVisible = true;
        cursor.style.opacity = "1";
      }
    };

    window.addEventListener("mousemove", move, { passive: true });

    const activatables = [
      ...$$('a, button, [role="button"], input, textarea, select'),
    ];

    activatables.forEach((el) => {
      el.addEventListener("mouseenter", () => cursor.classList.add("is-active"));
      el.addEventListener("mouseleave", () => cursor.classList.remove("is-active"));
    });

    window.addEventListener("mouseout", (ev) => {
      if (ev.relatedTarget === null) {
        cursor.style.opacity = "0";
        cursorVisible = false;
      }
    });
  }

  function ensureAudioGraph(allowCreate = false) {
    if (!music) return;
    if (audioCtx && analyser && dataArray) return;
    if (!allowCreate) return;
    if (!webAudioAllowed) return;

    // Safety: if audio is cross-origin without CORS, WebAudio can output zeroes (and may break expected behavior).
    // Only enable analyser when audio resolves to the same origin as the page.
    try {
      const src = music.currentSrc || music.src || "";
      if (src) {
        const u = new URL(src, location.href);
        if (u.origin !== location.origin) return;
      }
    } catch {
      return;
    }

    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;

    audioCtx = new Ctx();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

    const source = audioCtx.createMediaElementSource(music);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
  }

  function stopReactiveGlow() {
    cancelAnimationFrame(reactiveRaf);
    reactiveRaf = 0;
  }

  function reactiveGlow() {
    if (!analyser || !dataArray) return;
    analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    const n = Math.min(20, dataArray.length);
    for (let i = 0; i < n; i++) sum += dataArray[i];
    const bass = n > 0 ? sum / n : 0;
    const intensity = bass / 255;

    const vinyl = document.querySelector(".media__vinylGlow");
    if (vinyl) {
      vinyl.style.opacity = String(0.4 + intensity * 0.8);
      vinyl.style.transform = `scale(${1 + intensity * 0.08})`;
    }

    reactiveRaf = requestAnimationFrame(reactiveGlow);
  }

  // Background particles (canvas)
  const canvas = $("#particles");
  const ctx = canvas?.getContext("2d");
  let particles = [];
  let raf = 0;

  function resizeCanvas() {
    if (!canvas || !ctx) return;
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function makeParticles() {
    if (!canvas) return;
    const { innerWidth: w, innerHeight: h } = window;
    const count = Math.floor(Math.max(36, Math.min(90, w / 18)));
    particles = Array.from({ length: count }, () => ({
      x: rand(0, w),
      y: rand(0, h),
      r: rand(0.8, 2.2),
      vx: rand(-0.18, 0.18),
      vy: rand(-0.25, 0.25),
      a: rand(0.18, 0.55),
      hue: rand(175, 285),
    }));
  }

  function drawParticles() {
    if (!canvas || !ctx) return;

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    ctx.clearRect(0, 0, w, h);

    // Subtle connections
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const q = particles[j];
        const dx = p.x - q.x;
        const dy = p.y - q.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 140 * 140) {
          const t = 1 - Math.sqrt(d2) / 140;
          ctx.strokeStyle = `rgba(0,229,255,${0.08 * t})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }
      }
    }

    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < -20) p.x = w + 20;
      if (p.x > w + 20) p.x = -20;
      if (p.y < -20) p.y = h + 20;
      if (p.y > h + 20) p.y = -20;

      ctx.fillStyle = `hsla(${p.hue}, 95%, 65%, ${p.a})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });

    raf = requestAnimationFrame(drawParticles);
  }

  function startParticles() {
    if (!canvas || !ctx) return;
    resizeCanvas();
    makeParticles();
    cancelAnimationFrame(raf);
    drawParticles();
  }

  window.addEventListener("resize", () => {
    resizeCanvas();
    makeParticles();
  });

  startParticles();

  // Dynamic status
  const statusWrap = $(".status");
  const statusText = $("#statusText");
  const STATUSES = [
    "Верхов спит",
    "Верхов моется",
    "Верхов в сети",
    "Верхов слушает трек",
    "Верхов не отвечает",
    "Верхов в режиме киберпанк",
    "Верхов работает",
  ];

  let statusIndex = 0;
  let statusTimer = 0;

  function pickNextStatus() {
    if (STATUSES.length <= 1) return STATUSES[0] || "";
    const next = (statusIndex + 1 + Math.floor(Math.random() * (STATUSES.length - 1))) % STATUSES.length;
    statusIndex = next;
    return STATUSES[next];
  }

  function setStatus(text) {
    if (!statusText || !statusWrap) return;

    statusWrap.classList.add("is-changing");
    statusWrap.classList.add("is-glitch");

    window.setTimeout(() => {
      statusText.textContent = text;
      statusWrap.classList.remove("is-changing");
    }, 220);

    window.setTimeout(() => {
      statusWrap.classList.remove("is-glitch");
    }, 340);
  }

  function scheduleStatus() {
    window.clearTimeout(statusTimer);
    const ms = 3000 + Math.floor(Math.random() * 1000);
    statusTimer = window.setTimeout(() => {
      setStatus(pickNextStatus());
      scheduleStatus();
    }, ms);
  }

  if (statusText && statusWrap) {
    const initial = STATUSES[Math.floor(Math.random() * STATUSES.length)] || statusText.textContent;
    statusText.textContent = initial;
    scheduleStatus();
  }

  // Music: first click starts (browser policy), fade-in volume
  const music = $("#bgMusic");
  const musicToggle = $("#musicToggle");
  let audioUnlocked = false;
  let isPlaying = false;
  let hasFirstPlayAnim = false;

  // Dynamic neon color from cover
  (() => {
    const img = new Image();
    img.src = "cover.jpg";

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx2d = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx2d) return;

      // Downscale for speed
      const w = Math.max(12, Math.min(64, img.naturalWidth || img.width || 64));
      const h = Math.max(12, Math.min(64, img.naturalHeight || img.height || 64));
      canvas.width = w;
      canvas.height = h;

      ctx2d.drawImage(img, 0, 0, w, h);
      const data = ctx2d.getImageData(0, 0, w, h).data;

      let r = 0;
      let g = 0;
      let b = 0;
      const pixels = data.length / 4;

      for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
      }

      r = Math.floor(r / pixels);
      g = Math.floor(g / pixels);
      b = Math.floor(b / pixels);

      document.documentElement.style.setProperty("--neon-a", `rgb(${r},${g},${b})`);
    };

    img.onerror = () => {
      // ignore
    };
  })();

  // WebAudio (for audio-reactive glow)
  let audioCtx = null;
  let analyser = null;
  let dataArray = null;
  let reactiveRaf = 0;
  const webAudioAllowed = typeof location !== "undefined" && location.protocol !== "file:";

  if (music) {
    // Avoid edge cases where the element remains muted/blocked.
    music.muted = false;
    music.crossOrigin = "anonymous";

    music.addEventListener("error", () => {
      const err = music.error;
      console.warn("[bgMusic] error", {
        code: err?.code,
        message: err?.message,
        networkState: music.networkState,
        readyState: music.readyState,
        src: music.currentSrc,
      });
    });

    music.addEventListener("canplay", () => {
      // Helpful for debugging: confirms the browser can decode the file.
      // (No UI changes)
      // eslint-disable-next-line no-console
      console.log("[bgMusic] canplay", { readyState: music.readyState, src: music.currentSrc });
    });
  }

  // iOS-style mini media player
  const media = $("#mediaPlayer");
  const mediaPlay = $("#mediaPlay");
  const mediaTime = $("#mediaTime");
  const mediaProgress = $("#mediaProgress");
  const mediaProgressFill = $("#mediaProgressFill");
  const mediaProgressDot = $("#mediaProgressDot");
  let mediaVisible = false;
  let durationSec = 0;
  let rafId = 0;
  let isSeeking = false;
  let collapseTimer = 0;

  const isCoarsePointer = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;

  function fmtTimeMMSS(s) {
    if (!Number.isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60);
    const ss = Math.floor(s % 60);
    return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }

  function showMedia() {
    if (!media) return;
    if (mediaVisible) return;
    mediaVisible = true;
    media.classList.add("is-visible");
    media.setAttribute("aria-hidden", "false");
    setCollapsed(true);
  }

  function setCollapsed(collapsed) {
    if (!media) return;
    media.classList.toggle("media--collapsed", !!collapsed);
    media.classList.toggle("media--expanded", !collapsed);
  }

  function setExpanded(expanded) {
    setCollapsed(!expanded);
  }

  function scheduleCollapse() {
    window.clearTimeout(collapseTimer);
    collapseTimer = window.setTimeout(() => setCollapsed(true), 1000);
  }

  function setPlayButtonState(playing) {
    if (!mediaPlay) return;
    mediaPlay.dataset.state = playing ? "pause" : "play";
  }

  function setProgressByRatio(r) {
    if (!mediaProgressFill || !mediaProgressDot || !mediaProgress) return;
    const p = Math.max(0, Math.min(1, r || 0));
    const pct = p * 100;
    mediaProgressFill.style.width = `${pct}%`;
    mediaProgressDot.style.left = `${pct}%`;
    mediaProgress.setAttribute("aria-valuenow", String(Math.round(pct)));
  }

  function updateProgressUI() {
    if (!music || !mediaProgress) return;
    const t = Number.isFinite(music.currentTime) ? music.currentTime : 0;
    const d = durationSec || (Number.isFinite(music.duration) ? music.duration : 0);
    const r = d > 0 ? t / d : 0;
    setProgressByRatio(r);
    if (mediaTime) mediaTime.textContent = fmtTimeMMSS(t);
  }

  function startRafWhilePlaying() {
    cancelAnimationFrame(rafId);
    const tick = () => {
      if (isPlaying && !isSeeking) updateProgressUI();
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  }

  function stopRaf() {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }

  function seekByClientX(clientX) {
    if (!music || !mediaProgress) return;
    const rect = mediaProgress.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const d = durationSec || (Number.isFinite(music.duration) ? music.duration : 0);
    if (d > 0) music.currentTime = p * d;
  }

  async function fadeTo(target, ms = 650) {
    if (!music) return;
    const start = music.volume;
    const delta = target - start;
    const t0 = performance.now();

    return new Promise((resolve) => {
      const step = (t) => {
        const k = Math.min(1, (t - t0) / ms);
        music.volume = Math.max(0, Math.min(1, start + delta * k));
        if (k < 1) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
  }

  async function unlockAndPlay() {
    if (!music) return;

    try {
      music.muted = false;

      // Resume WebAudio in a user gesture to avoid silent playback in some browsers.
      if (webAudioAllowed) {
        ensureAudioGraph(true);
        try {
          await audioCtx?.resume?.();
        } catch {
          // ignore
        }
      }

      if (!audioUnlocked) {
        music.volume = 0;
        await music.play();
        audioUnlocked = true;
        isPlaying = true;
        showMedia();
        setPlayButtonState(true);
        startRafWhilePlaying();
        if (!hasFirstPlayAnim && media) {
          hasFirstPlayAnim = true;
          const island = media.querySelector(".media__island");
          island?.animate(
            [
              { transform: "scale(0.85)", opacity: 0 },
              { transform: "scale(1.05)", opacity: 1 },
              { transform: "scale(1)", opacity: 1 },
            ],
            { duration: 600, easing: "cubic-bezier(.34,1.56,.64,1)" }
          );
        }
        // Ensure we become audible even if fade gets interrupted.
        await fadeTo(0.9, 900);
        if (music.volume < 0.15) music.volume = 0.9;
      } else {
        // After stopMusic() we fade volume to 0. Restore it on resume.
        // Some browsers may still play silently if volume stays at 0.
        if (!Number.isFinite(music.volume) || music.volume <= 0.001) music.volume = 0;
        await music.play();
        isPlaying = true;
        showMedia();
        setPlayButtonState(true);
        startRafWhilePlaying();
        if (music.volume < 0.85) {
          await fadeTo(0.9, 650);
        }
        if (music.volume < 0.15) music.volume = 0.9;
      }
    } catch {
      // If user blocks autoplay, we just keep button available.
    }

    updateMusicUI();
  }

  async function stopMusic() {
    if (!music) return;

    try {
      await fadeTo(0.0, 450);
      music.pause();
      isPlaying = false;
    } catch {
      isPlaying = false;
    }

    setPlayButtonState(false);
    if (media) media.classList.remove("is-playing");
    stopReactiveGlow();
    stopRaf();

    updateMusicUI();
  }

  function updateMusicUI() {
    if (!musicToggle) return;
    const stopped = !isPlaying && !!audioUnlocked && !!music && Number.isFinite(music.currentTime) && music.currentTime > 0;
    musicToggle.dataset.state = isPlaying ? "playing" : (stopped ? "stopped" : "off");
    musicToggle.setAttribute("aria-label", isPlaying ? "Выключить музыку" : "Включить музыку");
  }

  if (musicToggle) {
    musicToggle.addEventListener("click", async () => {
      if (!music) return;
      if (!isPlaying) await unlockAndPlay();
      else await stopMusic();
    });
  }

  if (mediaPlay) {
    mediaPlay.addEventListener("click", async () => {
      if (!music) return;
      if (!isPlaying) await unlockAndPlay();
      else await stopMusic();
    });
  }

  if (media) {
    const island = media.querySelector(".media__island");
    if (island) {
      // Subtle 3D tilt (desktop only)
      if (!isCoarsePointer) {
        island.addEventListener("pointermove", (e) => {
          const rect = island.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width - 0.5;
          const y = (e.clientY - rect.top) / rect.height - 0.5;
          island.style.transform = `rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg)`;
        });

        island.addEventListener("pointerleave", () => {
          island.style.transform = "rotateX(0deg) rotateY(0deg)";
        });
      }

      island.addEventListener("mouseenter", () => {
        if (isCoarsePointer) return;
        window.clearTimeout(collapseTimer);
        setExpanded(true);
      });

      island.addEventListener("mouseleave", () => {
        if (isCoarsePointer) return;
        scheduleCollapse();
      });

      island.addEventListener("click", (ev) => {
        if (!isCoarsePointer) return;
        const t = ev.target;
        if (t instanceof HTMLElement) {
          if (t.closest("#mediaPlay")) return;
          if (t.closest("#mediaProgress")) return;
        }
        const isExpanded = media.classList.contains("media--expanded");
        setExpanded(!isExpanded);
      });
    }
  }

  if (music) {
    music.addEventListener("play", () => {
      // Don't create AudioContext here (non-user gesture). Only start reactive loop if graph already exists.
      if (webAudioAllowed && audioCtx && analyser && dataArray && !reactiveRaf) reactiveGlow();

      isPlaying = true;
      updateMusicUI();
      showMedia();
      if (media) media.classList.add("is-playing");
      setPlayButtonState(true);
      updateProgressUI();
      startRafWhilePlaying();

      if (statusText && statusWrap) {
        window.clearTimeout(statusTimer);
        setStatus("Верхов слушает музыку");
      }
    });

    music.addEventListener("pause", () => {
      stopReactiveGlow();

      isPlaying = false;
      updateMusicUI();
      if (media) media.classList.remove("is-playing");
      setPlayButtonState(false);
      updateProgressUI();
      stopRaf();

      if (statusText && statusWrap) {
        window.clearTimeout(statusTimer);
        setStatus("Верхов задумался");
        scheduleStatus();
      }
    });

    music.addEventListener("ended", () => {
      stopReactiveGlow();

      isPlaying = false;
      updateMusicUI();
      if (media) media.classList.remove("is-playing");
      setPlayButtonState(false);
      music.currentTime = 0;
      setProgressByRatio(0);
      updateProgressUI();
      stopRaf();

      if (statusText && statusWrap) {
        window.clearTimeout(statusTimer);
        setStatus("Верхов выбирает следующий трек");
        scheduleStatus();
      }
    });

    music.addEventListener("loadedmetadata", () => {
      durationSec = Number.isFinite(music.duration) ? music.duration : 0;
      updateProgressUI();
    });

    music.addEventListener("timeupdate", () => {
      updateProgressUI();
    });
  }

  if (mediaProgress) {
    const onSeekMove = (ev) => {
      const x = ev.clientX ?? (ev.touches && ev.touches[0] && ev.touches[0].clientX);
      if (!Number.isFinite(x)) return;
      seekByClientX(x);
      updateProgressUI();
    };

    mediaProgress.addEventListener("pointerdown", (ev) => {
      if (!music) return;
      isSeeking = true;
      mediaProgress.setPointerCapture(ev.pointerId);
      onSeekMove(ev);
    });

    mediaProgress.addEventListener("pointermove", (ev) => {
      if (!isSeeking) return;
      onSeekMove(ev);
    });

    mediaProgress.addEventListener("pointerup", () => {
      isSeeking = false;
    });

    mediaProgress.addEventListener("click", (ev) => {
      onSeekMove(ev);
    });

    mediaProgress.addEventListener("keydown", (ev) => {
      if (!music || !(durationSec > 0 || (Number.isFinite(music.duration) && music.duration > 0))) return;
      const step = 5;
      if (ev.key === "ArrowLeft") {
        music.currentTime = Math.max(0, music.currentTime - step);
        ev.preventDefault();
      }
      if (ev.key === "ArrowRight") {
        const d = durationSec || music.duration;
        music.currentTime = Math.min(d, music.currentTime + step);
        ev.preventDefault();
      }
    });
  }

  // Help tooltip (mobile click-to-toggle)
  const help = $("#help");
  const helpBtn = $("#helpBtn");
  const helpPopover = $("#helpPopover");

  function positionHelp() {
    if (!helpBtn || !helpPopover) return;

    const rect = helpBtn.getBoundingClientRect();

    // Сначала делаем видимым, но невидимым визуально
    helpPopover.style.visibility = "hidden";
    helpPopover.style.display = "block";

    const popRect = helpPopover.getBoundingClientRect();

    const centerX = rect.left + rect.width / 2;
    let x = centerX - popRect.width / 2;
    let y = rect.top - popRect.height - 16;

    // Ограничение по краям
    x = Math.max(12, Math.min(x, window.innerWidth - popRect.width - 12));

    // Если сверху нет места — ставим вниз
    if (y < 12) {
      y = rect.bottom + 16;
      helpPopover.classList.add("help--bottom");
    } else {
      helpPopover.classList.remove("help--bottom");
    }

    helpPopover.style.left = x + "px";
    helpPopover.style.top = y + "px";

    helpPopover.style.visibility = "visible";
  }

  function setHelpOpen(open) {
    if (!help || !helpBtn || !helpPopover) return;
    help.classList.toggle("is-open", !!open);
    helpBtn.setAttribute("aria-expanded", open ? "true" : "false");
    helpPopover.setAttribute("aria-hidden", open ? "false" : "true");

    if (open) {
      helpPopover.classList.add("is-open");
      positionHelp();
    } else {
      helpPopover.classList.remove("is-open");
      helpPopover.style.display = "none";
      helpPopover.style.visibility = "hidden";
    }
  }

  if (help && helpBtn && helpPopover) {
    helpBtn.addEventListener("click", (ev) => {
      ev.preventDefault();
      const open = help.classList.contains("is-open");
      setHelpOpen(!open);
    });

    helpBtn.addEventListener("mouseenter", () => {
      if (!help.classList.contains("is-open")) return;
      positionHelp();
    });

    helpBtn.addEventListener("focus", () => {
      if (!help.classList.contains("is-open")) return;
      positionHelp();
    });

    window.addEventListener("resize", () => {
      if (!help.classList.contains("is-open")) return;
      positionHelp();
    });

    window.addEventListener("scroll", () => {
      if (!help.classList.contains("is-open")) return;
      positionHelp();
    }, { passive: true });

    document.addEventListener("click", (ev) => {
      if (!help.classList.contains("is-open")) return;
      const t = ev.target;
      if (!(t instanceof Node)) return;
      if (help.contains(t)) return;
      setHelpOpen(false);
    });

    document.addEventListener("keydown", (ev) => {
      if (ev.key !== "Escape") return;
      if (!help.classList.contains("is-open")) return;
      setHelpOpen(false);
    });
  }

  // Smooth click transition: little press feedback on the whole card
  const hero = $(".hero");
  if (hero) {
    hero.addEventListener("click", (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      const isInteractive = !!t.closest("a, button");
      if (!isInteractive) return;
      hero.animate(
        [{ transform: "translateY(0)" }, { transform: "translateY(1px)" }, { transform: "translateY(0)" }],
        { duration: 220, easing: "cubic-bezier(.2,.8,.2,1)" }
      );
    });
  }

  // Discord button: copy username and open Discord
  const toast = $("#toast");
  const discordBtn = $("#discordBtn");
  const discordUser = "velepmix";

  function showToast(text) {
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add("is-visible");
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => toast.classList.remove("is-visible"), 1600);
  }
  showToast._t = 0;

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        const ok = document.execCommand("copy");
        ta.remove();
        return ok;
      } catch {
        ta.remove();
        return false;
      }
    }
  }

  if (discordBtn) {
    discordBtn.addEventListener("click", async () => {
      const ok = await copyText(discordUser);
      if (ok) showToast(`Discord ник скопирован: ${discordUser}`);
      else showToast(`Скопируй вручную: ${discordUser}`);

      // Best-effort: open Discord (web). Direct "add friend" deep-link is not guaranteed without internal ID.
      window.open("https://discord.com/app", "_blank", "noopener,noreferrer");
    });
  }
})();
