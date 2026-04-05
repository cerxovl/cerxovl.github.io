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

      // Intro (once per session, and skip for reduced motion)
      try {
        const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const played = sessionStorage.getItem("introPlayed") === "1";
        if (!reduce && !played) {
          sessionStorage.setItem("introPlayed", "1");
          document.body.classList.add("is-intro");
          window.setTimeout(() => document.body.classList.remove("is-intro"), 1500);
        }
      } catch {
        // ignore
      }
    }, 350);
  });

  // Theme toggle
  const themeToggle = $("#themeToggle");
  const themeText = $("#themeText");
  const themes = ["dark", "ultra", "minimal"];
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let themeInitDone = false;

  function spawnThemeParticles(theme) {
    if (reduceMotion || !themeToggle) return;
    const r = themeToggle.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const palettes = {
      dark:    ["#00e5ff","#7c3cff","#00e5ff","#ffffff","#7c3cff"],
      ultra:   ["#ff2d55","#ff6a00","#ffe259","#ff2d55","#ff6a00"],
      minimal: ["#aaaaaa","#dddddd","#888888","#ffffff","#bbbbbb"],
    };
    const palette = palettes[theme] || palettes.dark;
    for (let i = 0; i < 18; i++) {
      const p = document.createElement("div");
      p.className = "theme-particle";
      const angle = (i / 18) * Math.PI * 2;
      const dist = 55 + Math.random() * 90;
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist;
      p.style.cssText =
        `left:${cx}px;top:${cy}px;` +
        `background:${palette[i % palette.length]};` +
        `--tx:${tx}px;--ty:${ty}px;` +
        `animation-delay:${Math.random() * 80}ms;`;
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 900);
    }
  }

  function applyTheme(theme) {
    const t = themes.includes(theme) ? theme : "dark";
    document.documentElement.dataset.theme = t;
    try {
      localStorage.setItem("theme", t);
    } catch {
      // ignore
    }
    if (themeToggle) {
      themeToggle.dataset.theme = t;
      themeToggle.setAttribute("aria-label", `Сменить тему (сейчас: ${t})`);
    }
    if (themeText) {
      themeText.textContent = t === "dark" ? "Dark" : (t === "ultra" ? "Ultra" : "Minimal");
    }
    if (themeInitDone) spawnThemeParticles(t);
  }

  (() => {
    let saved = "";
    try {
      saved = localStorage.getItem("theme") || "";
    } catch {
      // ignore
    }

    // Moscow Time (UTC + 3)
    const getMoscowHour = () => {
      const now = new Date();
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const moscow = new Date(utc + (3600000 * 3));
      return moscow.getHours();
    };

    const h = getMoscowHour();
    let timeTheme = "dark";
    if (h >= 8 && h < 18) timeTheme = "minimal";
    else if (h >= 18 && h < 23) timeTheme = "dark";
    else timeTheme = "ultra";

    if (!saved) {
      applyTheme(timeTheme);
    } else {
      // Если тема сохранена, но пользователь не менял её вручную в ЭТОЙ сессии, 
      // можно обновить по времени. Но лучше просто следовать сохраненной.
      // Однако запрос был "нужно определяться по московскому времени".
      // Сделаем так: если тема в localStorage — используем её. 
      // Если нет — ставим по времени.
      applyTheme(saved);
    }
    themeInitDone = true;
  })();

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const current = document.documentElement.dataset.theme || "dark";
      const idx = themes.indexOf(current);
      const next = themes[(idx + 1 + themes.length) % themes.length];
      applyTheme(next);
    });
  }

  // Service Worker (PWA-lite)
  if (location.protocol !== "file:" && "serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("service-worker.js").catch(() => {
        // ignore
      });
    });
  }

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

  const isCoarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;

  // Magnetic buttons (desktop only)
  if (!isCoarse && !reduceMotion) {
    const magneticTargets = rippleTargets.filter((el) => el.classList?.contains("neon-btn"));
    magneticTargets.forEach((el) => {
      let mx = 0;
      let my = 0;
      let tmx = 0;
      let tmy = 0;
      let rafMag = 0;

      const tick = () => {
        mx += (tmx - mx) * 0.18;
        my += (tmy - my) * 0.18;
        el.style.setProperty("--mx", `${mx.toFixed(2)}px`);
        el.style.setProperty("--my", `${my.toFixed(2)}px`);
        const done = Math.abs(tmx - mx) < 0.05 && Math.abs(tmy - my) < 0.05;
        if (!done) rafMag = requestAnimationFrame(tick);
        else rafMag = 0;
      };

      el.addEventListener(
        "pointermove",
        (ev) => {
          const r = el.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          const dx = (ev.clientX - cx) / (r.width / 2);
          const dy = (ev.clientY - cy) / (r.height / 2);
          const clamp = (v) => Math.max(-1, Math.min(1, v));
          const kx = clamp(dx);
          const ky = clamp(dy);
          tmx = kx * 6;
          tmy = ky * 5;
          if (!rafMag) rafMag = requestAnimationFrame(tick);
        },
        { passive: true }
      );

      el.addEventListener(
        "pointerleave",
        () => {
          tmx = 0;
          tmy = 0;
          if (!rafMag) rafMag = requestAnimationFrame(tick);
        },
        { passive: true }
      );
    });
  }

  // Custom cursor (desktop only)
  const cursor = $("#cursor");
  let cursorVisible = false;
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
  let mouseX = -999, mouseY = -999;

  window.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  }, { passive: true });

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
      ox: 0, oy: 0, // offset for mouse
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
        const dx = (p.x + p.ox) - (q.x + q.ox);
        const dy = (p.y + p.oy) - (q.y + q.oy);
        const d2 = dx * dx + dy * dy;
        if (d2 < 140 * 140) {
          const t = 1 - Math.sqrt(d2) / 140;
          ctx.strokeStyle = `rgba(0,229,255,${0.08 * t})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x + p.ox, p.y + p.oy);
          ctx.lineTo(q.x + q.ox, q.y + q.oy);
          ctx.stroke();
        }
      }
    }

    particles.forEach((p) => {
      // Background movement
      p.x += p.vx;
      p.y += p.vy;

      // Mouse repulsion
      if (mouseX > 0) {
        const dx = p.x - mouseX;
        const dy = p.y - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200) {
          const force = (200 - dist) / 200;
          p.ox += (dx / dist) * force * 1.5;
          p.oy += (dy / dist) * force * 1.5;
        }
      }
      p.ox *= 0.94; // friction
      p.oy *= 0.94;

      if (p.x < -20) p.x = w + 20;
      if (p.x > w + 20) p.x = -20;
      if (p.y < -20) p.y = h + 20;
      if (p.y > h + 20) p.y = -20;

      ctx.fillStyle = `hsla(${p.hue}, 95%, 65%, ${p.a})`;
      ctx.beginPath();
      ctx.arc(p.x + p.ox, p.y + p.oy, p.r, 0, Math.PI * 2);
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
    // crossOrigin only when served over HTTP(S) — on file:// it breaks playback
    if (webAudioAllowed) music.crossOrigin = "anonymous";

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

  // Light parallax (desktop only)
  if (!isCoarsePointer && !reduceMotion) {
    let px = 0;
    let py = 0;
    let tpx = 0;
    let tpy = 0;
    let parRaf = 0;

    const apply = () => {
      px += (tpx - px) * 0.12;
      py += (tpy - py) * 0.12;
      document.documentElement.style.setProperty("--px", `${px.toFixed(2)}px`);
      document.documentElement.style.setProperty("--py", `${py.toFixed(2)}px`);
      parRaf = requestAnimationFrame(apply);
    };

    window.addEventListener(
      "pointermove",
      (e) => {
        const nx = e.clientX / window.innerWidth - 0.5;
        const ny = e.clientY / window.innerHeight - 0.5;
        tpx = nx * 18;
        tpy = ny * 14;
        if (!parRaf) parRaf = requestAnimationFrame(apply);
      },
      { passive: true }
    );

    window.addEventListener(
      "pointerleave",
      () => {
        tpx = 0;
        tpy = 0;
      },
      { passive: true }
    );
  }

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
      music.volume = 0.9;

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

      // WebAudio graph (only over HTTP/S, not file://)
      if (webAudioAllowed) {
        ensureAudioGraph(true);
        audioCtx?.resume?.().catch(() => {});
      }
    } catch (err) {
      console.warn("[music] play() rejected:", err);
    }

    updateMusicUI();
  }

  async function stopMusic() {
    if (!music) return;

    try {
      music.pause();
      music.volume = 0.9; // reset volume so next play() is audible
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

  function showToast(text, duration = 1600) {
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add("is-visible");
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => toast.classList.remove("is-visible"), duration);
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

  // Easter egg: 5 taps on avatar
  const avatarWrap = document.querySelector(".hero__avatar");
  let eggClicks = 0;
  let eggTimer  = 0;
  // exitClicks counts avatar clicks while stickman-mode is active (to deactivate)
  let exitClicks = 0;
  let exitTimer  = 0;

  if (avatarWrap) {
    avatarWrap.addEventListener("click", () => {
      // ── deactivation path (stickman-mode already on, content visible) ──
      if (document.body.classList.contains("stickman-mode") &&
          !document.body.classList.contains("content-hidden")) {
        exitClicks++;
        clearTimeout(exitTimer);
        exitTimer = setTimeout(() => { exitClicks = 0; }, 1800);
        if (exitClicks < 5) {
          showToast(`Ещё ${5 - exitClicks} кликов — выход из режима`, 900);
        } else {
        exitClicks = 0;
        document.body.classList.remove("stickman-mode");
        const hint = document.querySelector(".avatar__hint");
        if (hint) hint.textContent = "× 5 = секретный режим";
        showToast("Секретный режим отключён");
        }
        return;
      }

      // ── activation path ──
      if (document.body.classList.contains("stickman-mode")) return;

      eggClicks++;
      clearTimeout(eggTimer);
      eggTimer = setTimeout(() => { eggClicks = 0; }, 1800);

      if (eggClicks >= 5) {
        eggClicks = 0;
        exitClicks = 0;
        showToast("Секретный режим: жми на кнопки!");
        document.body.classList.add("stickman-mode");
        const hint = document.querySelector(".avatar__hint");
        if (hint) hint.textContent = "× 5 = выход из режима";
        if (statusText && statusWrap) {
          clearTimeout(statusTimer);
          setStatus("Верхов на связи: секретный режим");
          scheduleStatus();
        }
      }
    });
  }

  // Stickman interactive mode — инициализируется сразу при загрузке
  initStickmanMode();
  function initStickmanMode() {
    const smoker = document.querySelector(".stickman--smoker");
    const chill = document.querySelector(".stickman--chill");
    if (!smoker || !chill) return;

    let busy = false;
    let ladder = null;
    let trampoline = null;
    let chair = null;
    let contentHidden = false;   // true only when hideContent was called
    let resetClicks = 0;
    let resetTimer = 0;

    // ── helpers ──────────────────────────────────────────────
    function hideContent(cb) {
      const wrap = document.querySelector(".wrap");
      if (!wrap) { cb && cb(); return; }
      contentHidden = true;
      wrap.classList.add("hiding");
      document.body.classList.add("content-hidden");
      setTimeout(() => cb && cb(), 1000);
    }

    function showContent() {
      if (!contentHidden) return;
      contentHidden = false;
      const wrap = document.querySelector(".wrap");
      if (!wrap) return;
      wrap.classList.remove("hiding");
      document.body.classList.remove("content-hidden");
    }

    function buildLadder(x, bottomY, topY) {
      if (ladder) ladder.remove();
      const height = Math.max(50, bottomY - topY);
      ladder = document.createElement("div");
      ladder.className = "stickman-ladder";
      // anchor to bottom so it grows upward
      ladder.style.cssText =
        "position:fixed;" +
        "left:" + x + "px;" +
        "bottom:" + (window.innerHeight - bottomY) + "px;" +
        "top:auto;" +
        "height:0;" +
        "transform:translateX(-50%);" +
        "transform-origin:bottom center;" +
        "z-index:10;" +
        "pointer-events:none;";
      document.body.appendChild(ladder);
      const buildTime = Math.max(700, height * 5);
      // double rAF ensures layout is flushed before transition
      requestAnimationFrame(() => requestAnimationFrame(() => {
        ladder.style.transition = "height " + buildTime + "ms linear";
        ladder.style.height = height + "px";
      }));
      return buildTime;
    }

    function spawnChair(x, sitY) {
      // sitY = stickman div center Y (= stickman hip level in screen coords)
      // We want the chair SEAT top to align with sitY (hip level)
      // Chair SVG viewBox="0 0 60 54": seat rect starts at y=24 out of 54
      // Container height = 56px → seat starts at 56 * 24/54 ≈ 24.9px from container top
      // → container top = sitY - 25
      if (chair) chair.remove();
      chair = document.createElement("div");
      chair.className = "stickman-chair";
      chair.innerHTML = '<svg viewBox="0 0 60 54" xmlns="http://www.w3.org/2000/svg">'
        + '<rect class="chair-back" x="8" y="0" width="44" height="24" rx="6"/>'
        + '<rect class="chair-seat" x="4" y="24" width="52" height="12" rx="5"/>'
        + '<line class="chair-leg" x1="12" y1="36" x2="8"  y2="54"/>'
        + '<line class="chair-leg" x1="48" y1="36" x2="52" y2="54"/>'
        + '</svg>';
      chair.style.cssText =
        "position:fixed;" +
        "left:" + x + "px;" +
        "top:" + (sitY - 25) + "px;" +
        "width:66px;height:56px;" +
        "transform:translateX(-50%);" +
        "z-index:12;" +
        "opacity:0;" +
        "transition:opacity 500ms var(--ease);";
      document.body.appendChild(chair);
      requestAnimationFrame(() => requestAnimationFrame(() => { chair.style.opacity = "1"; }));
    }

    function applySittingPose(stickman) {
      const svg = stickman.querySelector("svg");
      if (!svg || svg.querySelector(".sit-butt")) return;

      // Left leg: was (50,70)→(42,100), make horizontal-left: →(18,76)
      const legL = svg.querySelector('[class*="leg--left"]');
      if (legL) {
        legL.dataset.ox2 = legL.getAttribute("x2");
        legL.dataset.oy2 = legL.getAttribute("y2");
        legL.setAttribute("x2", "18");
        legL.setAttribute("y2", "76");
      }
      // Right leg: was (50,70)→(58,100), make horizontal-right: →(82,76)
      const legR = svg.querySelector('[class*="leg--right"]');
      if (legR) {
        legR.dataset.ox2 = legR.getAttribute("x2");
        legR.dataset.oy2 = legR.getAttribute("y2");
        legR.setAttribute("x2", "82");
        legR.setAttribute("y2", "76");
      }
      // Left arm: lean down-left like bracing on edge: →(28,68)
      const armL = svg.querySelector('[class*="arm--left"]');
      if (armL) {
        armL.dataset.ox2 = armL.getAttribute("x2");
        armL.dataset.oy2 = armL.getAttribute("y2");
        armL.setAttribute("x2", "28");
        armL.setAttribute("y2", "68");
      }
      // Right arm: lean down-right: →(72,62)
      const armR = svg.querySelector('[class*="arm--right"]');
      if (armR) {
        armR.dataset.ox2 = armR.getAttribute("x2");
        armR.dataset.oy2 = armR.getAttribute("y2");
        armR.setAttribute("x2", "72");
        armR.setAttribute("y2", "62");
      }

      // Add butt ellipse at hip
      const butt = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
      butt.setAttribute("class", "sit-butt");
      butt.setAttribute("cx", "50"); butt.setAttribute("cy", "72");
      butt.setAttribute("rx", "13"); butt.setAttribute("ry", "5");
      svg.appendChild(butt);
    }

    function removeSittingPose(stickman) {
      const svg = stickman.querySelector("svg");
      if (!svg) return;
      ["leg--left","leg--right","arm--left","arm--right"].forEach(cls => {
        const el = svg.querySelector('[class*="' + cls + '"]');
        if (el && el.dataset.ox2 !== undefined) {
          el.setAttribute("x2", el.dataset.ox2);
          el.setAttribute("y2", el.dataset.oy2);
        }
      });
      const butt = svg.querySelector(".sit-butt");
      if (butt) butt.remove();
    }

    function addHeadphones(stickman) {
      const svg = stickman.querySelector("svg");
      if (!svg || svg.querySelector(".headphones")) return;
      const hp = document.createElementNS("http://www.w3.org/2000/svg", "g");
      hp.setAttribute("class", "headphones");
      // Head: cx=50, cy=15, r=12 → left edge x=38, right edge x=62
      // Arc over head from left ear to right ear
      hp.innerHTML = '<path d="M 40 14 A 10 10 0 0 1 60 14" fill="none" stroke="rgba(0,255,154,0.95)" stroke-width="2.5" stroke-linecap="round"/>'
        + '<rect x="37" y="11" width="6" height="9" rx="2" fill="rgba(0,255,154,0.90)"/>'
        + '<rect x="57" y="11" width="6" height="9" rx="2" fill="rgba(0,255,154,0.90)"/>';
      svg.appendChild(hp);
    }

    // ── main action ───────────────────────────────────────────
    function runWithLadder(stickman, targetBtn) {
      if (busy) return;
      busy = true;

      // Capture ALL positions BEFORE any animation starts
      const btnRect = targetBtn.getBoundingClientRect();
      const targetX = btnRect.left + btnRect.width / 2;

      // Music button is in the fixed topbar at top of screen.
      // Stickman sits BELOW the topbar: center = button bottom + 55px (legs dangle further down)
      const sitY       = btnRect.bottom + 55;
      // Ladder grows from ground up to just below the button
      const ladderTopY = btnRect.bottom;

      const sRect   = stickman.getBoundingClientRect();
      const startX  = sRect.left + sRect.width / 2;
      const bottomY = window.innerHeight - 55;   // ground (stickman center Y)

      // ── STOP idle animation so it can't override transform ──
      stickman.style.animation = "none";

      // Snap stickman to fixed ground, clear conflicting CSS props
      stickman.style.transition = "none";
      stickman.style.position   = "fixed";
      stickman.style.left       = startX + "px";
      stickman.style.top        = bottomY + "px";
      stickman.style.bottom     = "auto";
      stickman.style.right      = "auto";
      stickman.style.transform  = "translate(-50%, -50%)";

      // STEP 1: hide content first
      hideContent(() => {

        // STEP 2: run horizontally under button
        stickman.classList.add("is-moving");
        const runDuration = Math.max(700, Math.min(2000, Math.abs(targetX - startX) * 2));

        requestAnimationFrame(() => {
          stickman.style.transition = "left " + runDuration + "ms ease-in-out";
          stickman.style.left = targetX + "px";
        });

        setTimeout(() => {
          stickman.classList.remove("is-moving");

          // STEP 3: build ladder from ground to button bottom
          const buildTime = buildLadder(targetX, bottomY, ladderTopY);

          setTimeout(() => {
            // STEP 4: climb up
            stickman.classList.add("climbing");
            const climbDist     = bottomY - sitY;
            const climbDuration = Math.max(1500, climbDist * 7);

            stickman.style.transition = "top " + climbDuration + "ms linear";
            stickman.style.top = sitY + "px";

            setTimeout(() => {
              // STEP 5: arrived — sit directly ON the button
              stickman.classList.remove("climbing");
              // Snap exactly to button center X, sitY already correct
              stickman.style.transition = "left 300ms var(--ease)";
              stickman.style.left = targetX + "px";
              spawnChair(targetX, sitY);
              addHeadphones(stickman);
              setTimeout(() => {
                applySittingPose(stickman);
                stickman.classList.add("sitting");
                startLegSwing(stickman);
                spawnLandImpact(targetX, sitY, false);
                busy = false;
              }, 320);
            }, climbDuration);

          }, buildTime + 200);
        }, runDuration);
      });
    }

    // ── landing impact pulse ──────────────────────────────────
    function spawnLandImpact(x, y, isAbsolute) {
      const el = document.createElement("div");
      el.className = "land-impact";
      el.style.cssText = "position:" + (isAbsolute ? "absolute" : "fixed") + ";left:" + x + "px;top:" + y + "px;pointer-events:none;z-index:16;";
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 600);
    }

    // ── leg-swinging idle while sitting ──────────────────────
    let swingInterval = null;
    function startLegSwing(stickman) {
      stopLegSwing();
      let t = 0;
      swingInterval = setInterval(() => {
        const svg = stickman.querySelector("svg");
        if (!svg) return;
        t += 0.08;
        const swing = Math.sin(t) * 6;
        const legL = svg.querySelector('[class*="leg--left"]');
        const legR = svg.querySelector('[class*="leg--right"]');
        if (legL) legL.setAttribute("y2", String(76 + swing));
        if (legR) legR.setAttribute("y2", String(76 - swing));
      }, 50);
    }
    function stopLegSwing() {
      if (swingInterval) { clearInterval(swingInterval); swingInterval = null; }
    }

    // ── trampoline action (social buttons, normal mode) ──────
    function spawnTrampoline(x, y) {
      if (trampoline) trampoline.remove();
      trampoline = document.createElement("div");
      trampoline.className = "stickman-trampoline";
      trampoline.style.cssText =
        "position:absolute;left:" + x + "px;top:" + y + "px;" +
        "transform:translateX(-50%);";
      document.body.appendChild(trampoline);
    }

    function runWithTrampoline(stickman, targetBtn, onComplete) {
      if (busy) return;
      busy = true;

      const sx = window.scrollX;
      const sy = window.scrollY;

      // Capture button position NOW (content still visible)
      const btnRect = targetBtn.getBoundingClientRect();
      const landX   = btnRect.left + sx + btnRect.width / 2;
      // div center = hip level (65px from div top, div is 130px)
      // hip должен быть на верхнем крае кнопки → top = btnRect.top
      const landY   = btnRect.top + sy;

      const sRect   = stickman.getBoundingClientRect();
      const startX  = sRect.left + sx + sRect.width / 2;
      const centerX = sx + window.innerWidth / 2;
      const bottomY = sy + window.innerHeight - 55;

      // Stop idle animation, snap to absolute ground — content stays visible
      stickman.style.animation  = "none";
      stickman.style.transition = "none";
      stickman.style.position   = "absolute";
      stickman.style.left       = startX + "px";
      stickman.style.top        = bottomY + "px";
      stickman.style.bottom     = "auto";
      stickman.style.right      = "auto";
      stickman.style.transform  = "translate(-50%, -50%)";
      stickman.style.zIndex     = "14";

      // STEP 1: run to screen center (NO content hiding)
      stickman.classList.add("is-moving");
      const runDuration = Math.max(500, Math.min(1600, Math.abs(centerX - startX) * 2));
      requestAnimationFrame(() => {
        stickman.style.transition = "left " + runDuration + "ms ease-in-out";
        stickman.style.left = centerX + "px";
      });

      setTimeout(() => {
        stickman.classList.remove("is-moving");

        // STEP 2: trampoline at center bottom
        spawnTrampoline(centerX, bottomY + 12);

        // STEP 3: 3 bounces getting higher, then fly onto the button
        let n = 0;
        const upH = [80, 160, 260];
        const upD = [300, 370, 430];

        function doBounce() {
          const h = upH[n], d = upD[n]; n++;
          stickman.style.transition = "top " + d + "ms cubic-bezier(0.33,1,0.68,1)";
          stickman.style.top = (bottomY - h) + "px";

          setTimeout(() => {
            if (n < upH.length) {
              // Back down to trampoline
              stickman.style.transition = "top " + Math.round(d * 0.6) + "ms ease-in";
              stickman.style.top = bottomY + "px";
              setTimeout(doBounce, Math.round(d * 0.6));
            } else {
              // Final jump: fly directly onto the button (X + Y both animate)
              const flyDur = Math.max(450, Math.abs(landY - (bottomY - h)) * 2.5);
              stickman.style.transition =
                "left " + flyDur + "ms ease-in-out, top " + flyDur + "ms cubic-bezier(0.22,1,0.36,1)";
              stickman.style.left = landX + "px";
              stickman.style.top  = landY + "px";

              setTimeout(() => {
                if (trampoline) { trampoline.remove(); trampoline = null; }
                applySittingPose(stickman);
                stickman.classList.add("sitting");
                startLegSwing(stickman);
                spawnLandImpact(landX, landY, true);
                busy = false;
                if (onComplete) onComplete();
              }, flyDur);
            }
          }, d);
        }

        setTimeout(doBounce, 280);
      }, runDuration);
    }

    // ── click on stickman: pulse + 5-click reset ─────────────
    [smoker, chill].forEach(s => {
      s.addEventListener("click", () => {
        // Visual pulse on every click
        s.style.filter = "drop-shadow(0 0 20px rgba(0,255,154,0.9)) drop-shadow(0 0 35px rgba(0,229,255,0.7))";
        setTimeout(() => { s.style.filter = ""; }, 350);

        if (!document.body.classList.contains("content-hidden")) {
          const inSecret = document.body.classList.contains("stickman-mode");
          showToast(inSecret ? "Нажми на MUSIC 🎵" : "Нажми на TG / TikTok / Discord!", 1800);
          return;
        }

        // 5 clicks to reset (only when content is hidden = stickman is on a button)
        resetClicks++;
        clearTimeout(resetTimer);
        resetTimer = setTimeout(() => { resetClicks = 0; }, 1800);
        if (resetClicks >= 5) {
          resetClicks = 0;
          showToast("Стикмены возвращаются!");
          resetAll();
        } else {
          showToast(`Ещё ${5 - resetClicks} клик(а) для сброса`, 900);
        }
      });
    });

    function resetAll() {
      stopLegSwing();
      busy = false;
      const bottomY = window.innerHeight - 80;
      [smoker, chill].forEach(s => {
        s.classList.remove("sitting", "climbing", "is-moving");
        removeSittingPose(s);
        if (s.style.position === "fixed" || s.style.position === "absolute") {
          s.classList.add("climbing-down");
          s.style.transition = "top 1400ms linear";
          s.style.top = (s.style.position === "absolute" ? (bottomY + window.scrollY) : bottomY) + "px";
        }
        setTimeout(() => {
          s.style.cssText = "";           // clear ALL inline styles at once
          s.classList.remove("climbing-down");
          const hp = s.querySelector(".headphones");
          if (hp) hp.remove();
        }, 1500);
      });

      if (ladder) {
        ladder.style.transition = "height 600ms linear, opacity 600ms";
        ladder.style.height = "0";
        ladder.style.opacity = "0";
        setTimeout(() => { if (ladder) { ladder.remove(); ladder = null; } }, 700);
      }
      if (trampoline) { trampoline.remove(); trampoline = null; }
      if (chair) {
        chair.style.opacity = "0";
        setTimeout(() => { if (chair) { chair.remove(); chair = null; } }, 500);
      }

      showContent();
      setTimeout(() => {
        busy = false;
        showToast("Режим сброшен — жми аватар × 5 для выхода", 2200);
      }, 1600);
    }

    // ── button listeners ─────────────────────────────────────

    // MUSIC — только в секретном режиме, музыка при этом всё равно играет
    const musicBtn = document.querySelector("#musicToggle");
    if (musicBtn) {
      musicBtn.addEventListener("click", () => {
        if (!document.body.classList.contains("stickman-mode")) return;

        // Сброс если уже сидит
        if (busy) {
          [smoker, chill].forEach(s => {
            if (s.classList.contains("sitting") || s.classList.contains("climbing")) {
              s.classList.remove("sitting", "climbing", "is-moving");
              removeSittingPose(s);
              const hp = s.querySelector(".headphones");
              if (hp) hp.remove();
              s.style.transition = "";
            }
          });
          if (ladder)     { ladder.remove();     ladder     = null; }
          if (trampoline) { trampoline.remove();  trampoline = null; }
          if (chair)      { chair.remove();       chair      = null; }
          showContent();
          busy = false;
        }

        runWithLadder(smoker, musicBtn);

        // Гарантия: если после старта музыка беззвучна — поднимаем громкость
        setTimeout(() => {
          if (music && music.volume < 0.05) music.volume = 0.9;
        }, 400);
      });
    }

    // TG / TikTok / Discord — батут в ОБЫЧНОМ режиме (или если стикмены еще не на кнопках)
    document.addEventListener("click", async (e) => {
      const btn = e.target.closest(".character-button");
      if (!btn) return;
      if (btn.classList.contains("media__play")) return; // Игнорируем плеер здесь
      
      const card = btn.closest(".character-card");
      if (!card) return;

      // Если мы в секретном режиме — кнопки работают по-старому (лестница к музыке)
      if (document.body.classList.contains("stickman-mode")) return;

      e.preventDefault();
      e.stopImmediatePropagation();

      const stickman = card.classList.contains("character-card--tiktok") ? smoker : chill;

      // Если стикмен уже занят — сбрасываем всех и идем к новой цели
      if (busy) {
        resetAll();
        // Даем небольшую паузу для сброса стилей
        await new Promise(r => setTimeout(r, 100));
      }

      runWithTrampoline(stickman, btn, () => {
        // После приземления — сразу открываем ссылку
        const delay = 100; // Минимальная задержка
        setTimeout(() => {
          if (btn.tagName.toLowerCase() === 'a' && btn.href) {
            window.open(btn.href, "_blank", "noopener,noreferrer");
          } else if (btn.id === 'discordBtn') {
            const nick = "velepmix"; // Исправленный ник
            showToast(`Discord: ${nick} скопирован!`);
            navigator.clipboard.writeText(nick).catch(() => {
              const input = document.createElement("input");
              input.value = nick;
              document.body.appendChild(input);
              input.select();
              document.execCommand("copy");
              input.remove();
            });
          }
        }, delay);
      });
    }, true);

    // ── Visitor Info ─────────────────────────────────────
    async function getVisitorInfo() {
      try {
        const res = await fetch("https://api.ipify.org?format=json");
        const data = await res.json();
        const ua = navigator.userAgent;
        let device = "PC";
        if (/android/i.test(ua)) device = "Android";
        else if (/iphone|ipad/i.test(ua)) device = "iOS";
        return { ip: data.ip, device };
      } catch {
        return { ip: "unknown", device: "unknown" };
      }
    }

    // ── Reaction + Status Logs (IP & Device) ──────────────────
    async function logToFirebase(emoji, type) {
      try {
        const info = await getVisitorInfo();
        const data = {
          emoji: emoji,
          type: type, // 'reaction' or 'status'
          ip: info.ip,
          device: info.device,
          time: new Date().toISOString()
        };
        // Отправляем в Firebase (логирование)
        if (window.db) {
          const logsRef = window.push(window.ref(window.db, 'logs/analytics'));
          window.set(logsRef, data);
        }
      } catch (err) {
        console.warn("Analytics failed:", err);
      }
    }

    // ── Visit Counter ──────────────────────────────────────────
    if (window.db) {
      const vRef = window.ref(window.db, 'stats/visits');
      window.runTransaction(vRef, (curr) => (curr || 0) + 1);
      window.onValue(vRef, (snap) => {
        const el = document.getElementById("visitNum");
        if (el) el.textContent = snap.val() || 0;
      });
    }

    // ── Reaction Counters Sync ────────────────────────────────
    document.querySelectorAll(".reaction-btn, .friend-btn").forEach(btn => {
      const emoji = btn.dataset.emoji;
      if (!emoji || !window.db) return;
      
      const countRef = window.ref(window.db, `stats/reactions/${emoji}`);
      window.onValue(countRef, (snap) => {
        const countSpan = btn.querySelector(".reaction-count");
        if (countSpan) countSpan.textContent = snap.val() || 0;
      });
      
      btn.addEventListener("click", () => {
        window.runTransaction(countRef, (curr) => (curr || 0) + 1);
        logToFirebase(emoji, btn.classList.contains("reaction-btn") ? "reaction" : "status");
      });
    });
  }



  // ══════════════════════════════════════════════════════════
  //  3D CARD TILT
  // ══════════════════════════════════════════════════════════
  document.querySelectorAll(".character-card").forEach(card => {
    card.addEventListener("mousemove", e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width  - 0.5;
      const y = (e.clientY - r.top)  / r.height - 0.5;
      card.style.transform = `perspective(700px) rotateY(${x * 14}deg) rotateX(${-y * 10}deg) scale(1.04)`;
      card.style.boxShadow = `${-x * 20}px ${-y * 20}px 40px rgba(0,229,255,0.18)`;
    });
    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
      card.style.boxShadow = "";
    });
  });

  // ══════════════════════════════════════════════════════════
  //  PUPIL EYE TRACKING
  // ══════════════════════════════════════════════════════════
  (function initEyes() {
    function addPupils(stickman) {
      const svg = stickman.querySelector("svg");
      if (!svg || svg.querySelector(".pupil")) return;
      // Left glasses rect: x=42,y=13,w=7,h=5 → center (45.5, 15.5)
      // Right glasses rect: x=51,y=13,w=7,h=5 → center (54.5, 15.5)
      [[45.5, 15.5], [54.5, 15.5]].forEach(([cx, cy]) => {
        const p = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        p.setAttribute("class", "pupil");
        p.setAttribute("cx", cx); p.setAttribute("cy", cy);
        p.setAttribute("r", "1.5");
        svg.appendChild(p);
      });
    }

    document.querySelectorAll(".stickman").forEach(addPupils);

    document.addEventListener("mousemove", e => {
      document.querySelectorAll(".stickman").forEach(stickman => {
        const svg = stickman.querySelector("svg");
        if (!svg) return;
        const pupils = svg.querySelectorAll(".pupil");
        if (!pupils.length) return;

        const rect = stickman.getBoundingClientRect();
        // Head center in screen coords (head at cy=15 in 140-unit viewbox, stickman 130px tall)
        const headX = rect.left + rect.width  * (50 / 100);
        const headY = rect.top  + rect.height * (15 / 140);

        const dx = e.clientX - headX;
        const dy = e.clientY - headY;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const move = 1.4; // max px movement in SVG units
        const ox = (dx / dist) * Math.min(move, dist * 0.04);
        const oy = (dy / dist) * Math.min(move, dist * 0.04);

        const centers = [[45.5, 15.5], [54.5, 15.5]];
        pupils.forEach((p, i) => {
          p.setAttribute("cx", centers[i][0] + ox);
          p.setAttribute("cy", centers[i][1] + oy);
        });
      });
    });
  })();

  // ══════════════════════════════════════════════════════════
  //  IDLE BEHAVIORS
  // ══════════════════════════════════════════════════════════
  (function initIdle() {
    let idleTimer = null;
    const IDLE_MS = 12000;

    function doRandomIdle() {
      document.querySelectorAll(".stickman").forEach(s => {
        if (s.classList.contains("sitting") || s.classList.contains("climbing")) return;
        
        const r = Math.random();
        if (r < 0.6) {
          s.classList.add("sleepy");
          spawnZzz(s);
        } else if (r < 0.85) {
          s.classList.add("dabbing");
          setTimeout(() => s.classList.remove("dabbing"), 2000);
        } else {
          s.classList.add("scratching");
          setTimeout(() => s.classList.remove("scratching"), 2500);
        }
      });
      // Schedule next random idle action while still idle
      idleTimer = setTimeout(doRandomIdle, 6000 + Math.random() * 5000);
    }

    function wakeUp() {
      document.querySelectorAll(".stickman").forEach(s => {
        s.classList.remove("sleepy", "dabbing", "scratching");
        s.querySelectorAll(".zzz-particle").forEach(z => z.remove());
      });
      resetIdleTimer();
    }

    function resetIdleTimer() {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(doRandomIdle, IDLE_MS);
    }

    function spawnZzz(stickman) {
      if (!stickman.classList.contains("sleepy")) return;
      const el = document.createElement("span");
      el.className = "zzz-particle";
      el.textContent = ["z","Z","z"][Math.floor(Math.random() * 3)];
      const r = stickman.getBoundingClientRect();
      el.style.cssText =
        "position:fixed;" +
        "left:" + (r.left + r.width * 0.65) + "px;" +
        "top:"  + (r.top  + r.height * 0.15) + "px;" +
        "font-size:" + (10 + Math.random() * 8) + "px;" +
        "z-index:20;pointer-events:none;" +
        "color:rgba(0,229,255,0.80);" +
        "font-family:monospace;font-weight:bold;" +
        "animation:zzzFloat 2s ease-out forwards;";
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 2100);
      if (stickman.classList.contains("sleepy")) {
        setTimeout(() => spawnZzz(stickman), 900 + Math.random() * 600);
      }
    }

    ["mousemove","keydown","click","touchstart","scroll"].forEach(ev =>
      document.addEventListener(ev, wakeUp, { passive: true })
    );
    resetIdleTimer();
  })();

  // ══════════════════════════════════════════════════════════
  //  RUN TRAIL
  // ══════════════════════════════════════════════════════════
  (function initTrail() {
    let trailInterval = null;

    function startTrail(stickman) {
      stopTrail();
      trailInterval = setInterval(() => {
        if (!stickman.classList.contains("is-moving")) { stopTrail(); return; }
        const r = stickman.getBoundingClientRect();
        const dot = document.createElement("div");
        dot.className = "run-trail";
        dot.style.cssText =
          "position:fixed;" +
          "left:" + (r.left + r.width / 2) + "px;" +
          "top:"  + (r.bottom - 8) + "px;" +
          "z-index:7;pointer-events:none;";
        document.body.appendChild(dot);
        setTimeout(() => dot.remove(), 600);
      }, 80);
    }

    function stopTrail() {
      if (trailInterval) { clearInterval(trailInterval); trailInterval = null; }
    }

    // Observe class changes on stickmen
    document.querySelectorAll(".stickman").forEach(s => {
      new MutationObserver(() => {
        if (s.classList.contains("is-moving")) startTrail(s);
        else stopTrail();
      }).observe(s, { attributes: true, attributeFilter: ["class"] });
    });
  })();

  // ══════════════════════════════════════════════════════════
  //  PHONE PARALLAX
  // ══════════════════════════════════════════════════════════
  (function initPhoneParallax() {
    if (isCoarsePointer || reduceMotion) return;
    const wrapper = document.querySelector(".phone-mockup-wrapper");
    const tilter = document.querySelector(".phone-tilt-container");
    if (!wrapper || !tilter) return;

    wrapper.addEventListener("mousemove", (e) => {
      const rect = wrapper.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      tilter.style.transform = `rotateY(${x * 32}deg) rotateX(${-y * 22}deg)`;
    });

    wrapper.addEventListener("mouseleave", () => {
      tilter.style.transform = "rotateY(0deg) rotateX(0deg)";
    });
  })();

  // nav-btn links are now plain <a href> — no JS needed

  // ══════════════════════════════════════════════════════════
  //  TYPEWRITER STATUS
  // ══════════════════════════════════════════════════════════
  (function initTypewriter() {
    const statusEl = document.getElementById("statusText");
    if (!statusEl) return;
    const phrases = [
      "Верхов в сети",
      "кодит по ночам",
      "слушает музыку",
      "ищет новые идеи",
      "активен ночью",
      "думает о своём",
      "режим киберпанка",
      "загружает себя",
      "ver × x × ov",
      "ищет сигнал",
      "делает вещи",
      "кринжует с кода",
      "AFK во времени",
    ];
    let phraseIdx = 0, charIdx = 0, isDeleting = false;
    function tick() {
      const phrase = phrases[phraseIdx];
      if (!isDeleting) {
        charIdx++;
        statusEl.textContent = phrase.slice(0, charIdx);
        if (charIdx === phrase.length) {
          isDeleting = true;
          setTimeout(tick, 2400);
          return;
        }
      } else {
        charIdx--;
        statusEl.textContent = phrase.slice(0, charIdx);
        if (charIdx === 0) {
          isDeleting = false;
          phraseIdx = (phraseIdx + 1) % phrases.length;
          setTimeout(tick, 380);
          return;
        }
      }
      setTimeout(tick, isDeleting ? 52 : 88);
    }
    setTimeout(tick, 2600);
  })();

  // ══════════════════════════════════════════════════════════
  //  CLICK RIPPLE
  // ══════════════════════════════════════════════════════════
  (function initClickRipple() {
    document.addEventListener("click", (e) => {
      const ripple = document.createElement("div");
      ripple.className = "global-ripple";
      ripple.style.cssText = `left:${e.clientX}px;top:${e.clientY}px;`;
      document.body.appendChild(ripple);
      setTimeout(() => ripple.remove(), 800);
    });
  })();

  // ══════════════════════════════════════════════════════════
  //  FLOATING REACTIONS
  // ══════════════════════════════════════════════════════════
  (function initReactions() {
    const bar = document.getElementById("reactionBar");
    if (!bar) return;

    const FB = "https://portfolio-d9472-default-rtdb.europe-west1.firebasedatabase.app";
    const LS_KEY = "userReaction"; 

    const floatSvgs = {
      fire:  `<svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 3C14 3 18 8.5 16 13C19.5 9.5 19 5 17.5 3C21 6 22.5 11.5 19.5 16.5C21 15 21.5 13 21 11.5C24 15.5 23.5 20.5 19.5 23.5C16.5 25.5 10.5 25.5 8 22C5.5 18.5 7 14 10.5 12.5C9.5 15 10 17.5 11.5 18.5C10.5 14.5 12 9.5 14 3Z" fill="#ff6a00" stroke="#ffaa00" stroke-width="0.7" stroke-linejoin="round"/></svg>`,
      heart: `<svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 23C14 23 5 16.5 5 10.5C5 7.5 7.2 5 10 5C11.6 5 13 5.8 14 7.2C15 5.8 16.4 5 18 5C20.8 5 23 7.5 23 10.5C23 16.5 14 23 14 23Z" fill="rgba(0,180,255,0.85)" stroke="#00c0ff" stroke-width="1.4" stroke-linejoin="round"/></svg>`,
      skull: `<svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="14" cy="13" rx="8.5" ry="9" fill="rgba(200,200,220,0.85)" stroke="rgba(180,180,220,0.9)" stroke-width="1.2"/><circle cx="10.5" cy="13" r="2.5" fill="rgba(30,30,50,0.9)"/><circle cx="17.5" cy="13" r="2.5" fill="rgba(30,30,50,0.9)"/></svg>`,
      bolt:  `<svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16.5 3L8 16.5H14.5L11.5 25L20 11.5H13.5L16.5 3Z" fill="rgba(255,220,0,0.9)" stroke="rgba(255,180,0,0.8)" stroke-width="0.8" stroke-linejoin="round"/></svg>`,
      note:  `<svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11 22V9.5L22 6.5V19" stroke="rgba(160,100,255,0.95)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9" cy="22.5" r="3.2" fill="rgba(160,100,255,0.7)" stroke="rgba(160,100,255,0.9)" stroke-width="1.2"/><circle cx="20" cy="19.5" r="3.2" fill="rgba(160,100,255,0.7)" stroke="rgba(160,100,255,0.9)" stroke-width="1.2"/></svg>`,
    };

    const btns = {};
    bar.querySelectorAll(".reaction-btn").forEach(btn => { btns[btn.dataset.emoji] = btn; });

    const localCounts = {};
    try { 
      const raw = JSON.parse(localStorage.getItem("rcCounts") || "{}");
      Object.keys(raw).forEach(k => { localCounts[k] = Number(raw[k]) || 0; });
    } catch {}

    function setCount(key, val) {
      const btn = btns[key];
      if (!btn) return;
      const num = Number(val) || 0;
      localCounts[key] = num;
      try { localStorage.setItem("rcCounts", JSON.stringify(localCounts)); } catch {}
      const span = btn.querySelector(".reaction-count");
      if (span) span.textContent = num;
    }

    function setActive(key) {
      Object.keys(btns).forEach(k => btns[k].classList.toggle("reaction-btn--active", k === key));
    }

    function spawnFloat(btn, key) {
      const r = btn.getBoundingClientRect();
      const svgStr = floatSvgs[key] || "";
      for (let i = 0; i < 4; i++) {
        setTimeout(() => {
          const el = document.createElement("span");
          el.className = "float-reaction";
          const x = r.left + r.width / 2 + (Math.random() - 0.5) * 50;
          const y = r.top + r.height / 2;
          el.innerHTML = svgStr;
          el.style.cssText = `left:${x}px;top:${y}px;animation-delay:${i*100}ms;width:28px;height:28px;display:block;`;
          document.body.appendChild(el);
          setTimeout(() => el.remove(), 2200);
        }, 0);
      }
    }

    Object.keys(localCounts).forEach(k => setCount(k, localCounts[k]));

    // SSE Real-time Synchronization
    function initSSE() {
      const source = new EventSource(FB + "/reactions.json");
      source.addEventListener("put", (e) => {
        try {
          const res = JSON.parse(e.data);
          if (res.path === "/" && res.data) {
            Object.keys(res.data).forEach(k => setCount(k, res.data[k]));
          } else if (res.path.startsWith("/") && res.data !== undefined) {
             const k = res.path.slice(1);
             if (btns[k]) setCount(k, res.data);
          }
        } catch {}
      });
      source.addEventListener("patch", (e) => {
        try {
          const res = JSON.parse(e.data);
          if (res.data) {
            Object.keys(res.data).forEach(k => setCount(k, res.data[k]));
          }
        } catch {}
      });
      source.onerror = () => {
        source.close();
        setTimeout(initSSE, 5000); // Reconnect on error
      };
    }
    initSSE();

    function syncToFirebase(key, delta) {
      fetch(FB + "/reactions/" + key + ".json")
        .then(r => r.json())
        .then(cur => {
          const next = Math.max(0, (Number(cur) || 0) + Number(delta));
          return fetch(FB + "/reactions/" + key + ".json", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(next)
          }).then(() => next);
        })
        .then(next => setCount(key, next))
        .catch(() => {});
    }

    const prevChoice = localStorage.getItem(LS_KEY);
    if (prevChoice) setActive(prevChoice);

    bar.querySelectorAll(".reaction-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.emoji;
        const prev = localStorage.getItem(LS_KEY);

        if (prev === key) {
          localStorage.removeItem(LS_KEY);
          setActive(null);
          setCount(key, Math.max(0, (Number(localCounts[key]) || 1) - 1));
          syncToFirebase(key, -1);
        } else {
          if (prev) {
            setCount(prev, Math.max(0, (Number(localCounts[prev]) || 1) - 1));
            syncToFirebase(prev, -1);
          }
          localStorage.setItem(LS_KEY, key);
          setActive(key);
          setCount(key, (Number(localCounts[key]) || 0) + 1);
          syncToFirebase(key, +1);
          spawnFloat(btn, key);
        }
      });
    });
  })();

  // ══════════════════════════════════════════════════════════
  //  FRIENDSHIP STATUS
  // ══════════════════════════════════════════════════════════
  (function initFriends() {
    const bar = document.getElementById("friendsBar");
    if (!bar) return;

    const FB = "https://portfolio-d9472-default-rtdb.europe-west1.firebasedatabase.app";
    const LS_KEY = "userFriendship"; 

    const btns = {};
    bar.querySelectorAll(".friend-btn").forEach(btn => { btns[btn.dataset.emoji] = btn; });

    const localCounts = {};
    try { 
      const raw = JSON.parse(localStorage.getItem("frCounts") || "{}");
      Object.keys(raw).forEach(k => { localCounts[k] = Number(raw[k]) || 0; });
    } catch {}

    function setCount(key, val) {
      const btn = btns[key];
      if (!btn) return;
      const num = Number(val) || 0;
      localCounts[key] = num;
      try { localStorage.setItem("frCounts", JSON.stringify(localCounts)); } catch {}
      const span = btn.querySelector(".reaction-count");
      if (span) span.textContent = num;
    }

    function setActive(key) {
      Object.keys(btns).forEach(k => {
        btns[k].classList.toggle("friend-btn--active", k === key);
      });
    }

    Object.keys(localCounts).forEach(k => setCount(k, localCounts[k]));

    // SSE Real-time Synchronization
    function initSSE() {
      const source = new EventSource(FB + "/friends.json");
      source.addEventListener("put", (e) => {
        try {
          const res = JSON.parse(e.data);
          if (res.path === "/" && res.data) {
            Object.keys(res.data).forEach(k => setCount(k, res.data[k]));
          } else if (res.path.startsWith("/") && res.data !== undefined) {
             const k = res.path.slice(1);
             if (btns[k]) setCount(k, res.data);
          }
        } catch {}
      });
      source.addEventListener("patch", (e) => {
        try {
          const res = JSON.parse(e.data);
          if (res.data) {
            Object.keys(res.data).forEach(k => setCount(k, res.data[k]));
          }
        } catch {}
      });
      source.onerror = () => {
        source.close();
        setTimeout(initSSE, 5000);
      };
    }
    initSSE();

    function syncToFirebase(key, delta) {
      fetch(FB + "/friends/" + key + ".json")
        .then(r => r.json())
        .then(cur => {
          const next = Math.max(0, (Number(cur) || 0) + Number(delta));
          return fetch(FB + "/friends/" + key + ".json", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(next)
          }).then(() => next);
        })
        .then(next => setCount(key, next))
        .catch(() => {});
    }

    const prevChoice = localStorage.getItem(LS_KEY);
    if (prevChoice) setActive(prevChoice);

    bar.querySelectorAll(".friend-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const key = btn.dataset.emoji;
        const prev = localStorage.getItem(LS_KEY);

        if (prev === key) {
          localStorage.removeItem(LS_KEY);
          setActive(null);
          setCount(key, Math.max(0, (Number(localCounts[key]) || 1) - 1));
          syncToFirebase(key, -1);
        } else {
          if (prev) {
            setCount(prev, Math.max(0, (Number(localCounts[prev]) || 1) - 1));
            syncToFirebase(prev, -1);
          }
          localStorage.setItem(LS_KEY, key);
          setActive(key);
          setCount(key, (Number(localCounts[key]) || 0) + 1);
          syncToFirebase(key, +1);
        }
      });
    });
  })();

  // ══════════════════════════════════════════════════════════
  //  VISIT COUNTER
  // ══════════════════════════════════════════════════════════
  (function initVisitCounter() {
    const el = document.getElementById("visitNum");
    if (!el) return;

    const FB = "https://portfolio-d9472-default-rtdb.europe-west1.firebasedatabase.app";

    function animateCount(target) {
      let cur = parseInt(el.textContent) || 0;
      if (target <= cur) { el.textContent = target; return; }
      const step = Math.max(1, Math.ceil((target - cur) / 40));
      const iv = setInterval(() => {
        cur = Math.min(cur + step, target);
        el.textContent = cur;
        if (cur >= target) clearInterval(iv);
      }, 28);
    }

    function getBrowser() {
      const ua = navigator.userAgent;
      if (ua.includes("Firefox")) return "Firefox";
      if (ua.includes("Edg"))     return "Edge";
      if (ua.includes("OPR"))     return "Opera";
      if (ua.includes("Chrome"))  return "Chrome";
      if (ua.includes("Safari"))  return "Safari";
      return "Other";
    }

    async function track() {
      try {
        // 1. Показываем текущий счётчик сразу
        const snapRes = await fetch(FB + "/visits.json");
        const snap    = await snapRes.json();
        const visits  = snap ? Object.values(snap) : [];
        animateCount(visits.length);

        // 2. Получаем IP + гео (пробуем несколько сервисов)
        let ip = "unknown", city = "unknown", country = "unknown";
        try {
          const g = await fetch("https://ipwho.is/").then(r => r.json());
          if (g && g.ip) { ip = g.ip; city = g.city || "unknown"; country = g.country || "unknown"; }
        } catch {}
        if (ip === "unknown") {
          try {
            const g = await fetch("https://api.ipify.org?format=json").then(r => r.json());
            if (g && g.ip) ip = g.ip;
          } catch {}
        }
        const device  = /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "desktop";
        const browser = getBrowser();

        // 3. Проверяем — был ли уже такой IP
        const alreadyVisited = visits.some(v => v.ip === ip);
        if (!alreadyVisited) {
          await fetch(FB + "/visits.json", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ip, city, country, device, browser, time: Date.now() })
          });
          animateCount(visits.length + 1);
        }
      } catch {
        // сеть недоступна — тихо игнорируем
      }
    }

    track();
  })();

  // ══════════════════════════════════════════════════════════
  //  MUSIC VISUALIZER
  // ══════════════════════════════════════════════════════════
  (function initVisualizer() {
    // Web Audio API (createMediaElementSource) captures the audio element exclusively.
    // On file:// the AudioContext starts suspended and resume() may be blocked,
    // making the audio completely silent. Skip visualizer on file://.
    if (!webAudioAllowed) return;
    const audio = document.getElementById("bgMusic");
    const island = document.querySelector(".media__island");
    if (!audio || !island) return;
    const canvas = document.createElement("canvas");
    canvas.className = "music-visualizer";
    island.appendChild(canvas);
    let actx = null, analyser = null, src = null, animId = null, inited = false;

    function setup() {
      if (inited) return;
      inited = true;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) { inited = false; return; }
        actx = new AC();
        analyser = actx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.82;
        src = actx.createMediaElementSource(audio);
        src.connect(analyser);
        analyser.connect(actx.destination);
      } catch { inited = false; }
    }

    function draw() {
      if (!analyser) return;
      const W = island.offsetWidth || 300;
      canvas.width = W;
      canvas.height = 38;
      const c = canvas.getContext("2d");
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
      c.clearRect(0, 0, W, 38);
      const bars = Math.min(data.length, 36);
      const bw = W / bars - 1.5;
      const theme = document.documentElement.dataset.theme || "dark";
      const [c1, c2] =
        theme === "ultra"   ? ["#ff2d55","#ff6a00"] :
        theme === "minimal" ? ["#aaaaaa","#555555"] :
                              ["#00e5ff","#7c3cff"];
      for (let i = 0; i < bars; i++) {
        const v = data[i] / 255;
        const bh = Math.max(2, v * 36 * 0.88);
        const x = i * (bw + 1.5);
        const grad = c.createLinearGradient(0, 38, 0, 38 - bh);
        grad.addColorStop(0, c1);
        grad.addColorStop(1, c2);
        c.fillStyle = grad;
        c.fillRect(x, 38 - bh, bw, bh);
      }
      animId = requestAnimationFrame(draw);
    }

    function stopDraw() {
      if (animId) { cancelAnimationFrame(animId); animId = null; }
    }

    audio.addEventListener("play", () => {
      setup();
      if (actx && actx.state === "suspended") actx.resume().catch(() => {});
      stopDraw();
      draw();
    });
    audio.addEventListener("pause", stopDraw);
    audio.addEventListener("ended", stopDraw);
  })();

})();
