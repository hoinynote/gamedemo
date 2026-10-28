(() => {
  "use strict";

  const canvas = document.querySelector("#game-canvas");
  const ctx = canvas.getContext("2d");
  const VIEW = { width: canvas.width, height: canvas.height };
  const PHYSICS = {
    gravity: 1550,
    moveAcceleration: 2200,
    maxSpeed: 310,
    friction: 0.78,
    jumpSpeed: 650,
    ropeTensionAcceleration: 7,
    ropeLaunchHorizontalImpulse: 700,
    ropeLaunchVerticalImpulse: 1100,
    ropeLaunchDuration: 0.35,
    playerWidth: 24,
    playerHeight: 38,
  };

  const DEFAULT_CONTROLS = Object.freeze({
    p1: Object.freeze({ left: "KeyF", right: "KeyH", jump: "KeyT", down: "KeyG", rope: "KeyQ", boost: "KeyW" }),
    p2: Object.freeze({ left: "ArrowLeft", right: "ArrowRight", jump: "ArrowUp", down: "ArrowDown", rope: "BracketLeft", boost: "BracketRight" }),
  });
  const CONTROL_ACTIONS = ["left", "right", "jump", "down", "rope", "boost"];
  const CONTROL_ACTION_LABELS = {
    left: "왼쪽 이동", right: "오른쪽 이동", jump: "점프", down: "아래 조준", rope: "로프 발사·해제", boost: "파트너 발사",
  };
  const RESERVED_CONTROL_CODES = new Set(["Enter", "Escape", "Tab", "KeyR", "KeyN"]);

  function cloneDefaultControls() {
    return {
      p1: { ...DEFAULT_CONTROLS.p1 },
      p2: { ...DEFAULT_CONTROLS.p2 },
    };
  }

  function controlsAreValid(bindings) {
    if (!bindings || !bindings.p1 || !bindings.p2) return false;
    const assigned = [];
    for (const player of ["p1", "p2"]) {
      for (const action of CONTROL_ACTIONS) {
        const code = bindings[player][action];
        if (typeof code !== "string" || code.length === 0 || code === "Unidentified") return false;
        assigned.push(code);
      }
    }
    return new Set(assigned).size === assigned.length;
  }

  function controlCodeLabel(code) {
    if (/^Key[A-Z]$/.test(code)) return code.slice(3);
    if (/^Digit[0-9]$/.test(code)) return code.slice(5);
    const labels = {
      ArrowLeft: "←", ArrowRight: "→", ArrowUp: "↑", ArrowDown: "↓",
      BracketLeft: "[", BracketRight: "]",
    };
    if (labels[code]) return labels[code];
    if (code.startsWith("Numpad")) return `Num ${code.slice(6)}`;
    return code;
  }

  class ControlsStore {
    static get key() { return "ropebound-controls:v1"; }

    static load(ownerId = null) {
      try {
        const raw = window.localStorage.getItem(this.key);
        if (!raw) return cloneDefaultControls();
        const saved = JSON.parse(raw);
        if (saved.version !== 1 || !controlsAreValid(saved.bindings)) return cloneDefaultControls();
        return { p1: { ...saved.bindings.p1 }, p2: { ...saved.bindings.p2 } };
      } catch (error) {
        return cloneDefaultControls();
      }
    }

    static save(bindings) {
      try {
        window.localStorage.setItem(this.key, JSON.stringify({ version: 1, bindings }));
        return true;
      } catch (error) {
        return false;
      }
    }

    static reset() {
      try { window.localStorage.removeItem(this.key); } catch (error) { /* no-op */ }
      return cloneDefaultControls();
    }
  }

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const lerp = (a, b, t) => a + (b - a) * t;
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const centerOf = (entity) => ({ x: entity.x + entity.w / 2, y: entity.y + entity.h / 2 });
  const intersects = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const pointInRect = (point, rect, padding = 0) => point.x >= rect.x - padding && point.x <= rect.x + rect.w + padding && point.y >= rect.y - padding && point.y <= rect.y + rect.h + padding;
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  const platform = (x, y, w, h = 22, kind = "platform") => ({ x, y, w, h, kind });
  const hazard = (x, y, w, h = 30) => ({ x, y, w, h });
  const movingPlatform = (id, x, y, w, h, range, speed, phase = 0) => ({ id, x, y, w, h, baseX: x, baseY: y, range, speed, phase, kind: "moving" });
  const crate = (id, x, y, size = 38) => ({ id, x, y, w: size, h: size, vx: 0, vy: 0, weight: 1 });
  const door = (id, x, y, w, h, switchId) => ({ id, x, y, w, h, switchId, kind: "door" });
  const switchPad = (id, x, y, options = {}) => ({
    id,
    x,
    y,
    w: 34,
    h: 13,
    active: false,
    requiresLaunch: options.requiresLaunch === true,
    hidden: options.hidden === true,
    latchOnLaunch: options.latchOnLaunch === true,
    unlockBonusStage: options.unlockBonusStage === true,
  });

  const STAGES = [
    {
      id: 0,
      theme: { skyTop: "#f7d99a", skyMid: "#a9e6d1", skyBottom: "#79c3aa", far: "#72b79e", near: "#4d947d", accent: "#fff0aa", ground: "#356d5d", platform: "#4c896f", platformTop: "#b4d98f", moving: "#68b9a3" },
      name: "첫 연결",
      card: {
        name: "첫 연결",
        objective: "파트너를 발사해 첫 문을 열고 함께 출구에 도착하세요",
        gimmick: "던져서 작동하는 첫 스위치",
        difficulty: 1,
        estimatedMinutes: 3,
      },
      width: 1800,
      height: VIEW.height,
      spawns: [{ x: 92, y: 440 }, { x: 154, y: 440 }],
      platforms: [
        platform(0, 500, 1800, 40, "ground"),
        platform(270, 408, 185),
        platform(580, 340, 170),
        platform(840, 430, 235),
        platform(1220, 350, 180),
        platform(1480, 425, 215),
      ],
      hazards: [hazard(470, 470, 90), hazard(1090, 470, 115), hazard(1405, 470, 65)],
      switches: [switchPad("door-one", 700, 327, { requiresLaunch: true })],
      movingPlatforms: [movingPlatform("lift-one", 1040, 305, 120, 18, 90, 1.1)],
      crates: [crate("crate-one", 630, 300)],
      doors: [door("door-one", 1332, 420, 34, 80, "door-one")],
      exit: { x: 1650, y: 345, w: 72, h: 80 },
    },
    {
      id: 1,
      theme: { skyTop: "#83d9ee", skyMid: "#b7eee1", skyBottom: "#f6d99d", far: "#77c8c2", near: "#398c91", accent: "#fff0a6", ground: "#28666d", platform: "#39878a", platformTop: "#afe0b1", moving: "#56afb0" },
      name: "엇갈린 발판",
      card: {
        name: "엇갈린 발판",
        objective: "발판과 줄을 이용해 두 문을 지나 출구에 도착하세요",
        gimmick: "높은 숨은 스위치를 찾아 보너스 구역 해제",
        difficulty: 2,
        estimatedMinutes: 5,
      },
      width: 2150,
      height: VIEW.height,
      spawns: [{ x: 90, y: 440 }, { x: 155, y: 440 }],
      platforms: [
        platform(0, 500, 450, 40, "ground"),
        platform(560, 500, 360, 40, "ground"),
        platform(1030, 500, 390, 40, "ground"),
        platform(1580, 500, 570, 40, "ground"),
        platform(240, 390, 150),
        platform(650, 350, 150),
        platform(1130, 375, 160),
        platform(1730, 350, 170),
        platform(1980, 420, 120),
      ],
      hazards: [hazard(450, 470, 110), hazard(920, 470, 110), hazard(1420, 470, 160), hazard(1900, 470, 80)],
      switches: [
        switchPad("door-two-a", 720, 337, { requiresLaunch: true }),
        switchPad("door-two-b", 1170, 362),
        switchPad("bonus-high-switch", 1515, 225, {
          requiresLaunch: true,
          hidden: true,
          latchOnLaunch: true,
          unlockBonusStage: true,
        }),
      ],
      movingPlatforms: [
        movingPlatform("lift-two-a", 430, 270, 110, 18, 110, 1.25, 1),
        movingPlatform("lift-two-b", 1390, 300, 120, 18, 130, 1.5, 2),
      ],
      crates: [crate("crate-two-a", 680, 305), crate("crate-two-b", 1190, 330)],
      doors: [door("door-two-a", 900, 420, 34, 80, "door-two-a"), door("door-two-b", 1450, 420, 34, 80, "door-two-b")],
      exit: { x: 2040, y: 340, w: 72, h: 80 },
    },
    {
      id: 2,
      theme: { skyTop: "#41558f", skyMid: "#8b83be", skyBottom: "#f3aa83", far: "#7477a9", near: "#4d5682", accent: "#83f2d1", ground: "#343f69", platform: "#475785", platformTop: "#b6a7e0", moving: "#668bc0" },
      name: "마지막 당김",
      card: {
        name: "마지막 당김",
        objective: "연속 장애물을 넘고 두 플레이어가 출구에 도착하세요",
        gimmick: "먼 발판을 여는 발사 스위치",
        difficulty: 3,
        estimatedMinutes: 6,
      },
      width: 2450,
      height: VIEW.height,
      spawns: [{ x: 90, y: 440 }, { x: 155, y: 440 }],
      platforms: [
        platform(0, 500, 330, 40, "ground"),
        platform(470, 500, 350, 40, "ground"),
        platform(980, 500, 360, 40, "ground"),
        platform(1520, 500, 360, 40, "ground"),
        platform(2050, 500, 400, 40, "ground"),
        platform(180, 385, 150),
        platform(560, 315, 140),
        platform(770, 415, 150),
        platform(1110, 340, 170),
        platform(1450, 400, 150),
        platform(1710, 310, 150),
        platform(2190, 360, 170),
      ],
      hazards: [hazard(335, 470, 135), hazard(825, 470, 155), hazard(1345, 470, 175), hazard(1880, 470, 170)],
      switches: [
        switchPad("door-three-a", 610, 302),
        switchPad("door-three-b", 1140, 327),
        switchPad("door-three-c", 1740, 297, { requiresLaunch: true }),
      ],
      movingPlatforms: [
        movingPlatform("lift-three-a", 350, 250, 105, 18, 115, 1.5, 1),
        movingPlatform("lift-three-b", 1270, 250, 110, 18, 150, 1.2, 2),
        movingPlatform("lift-three-c", 1880, 250, 115, 18, 120, 1.6, 0),
      ],
      crates: [crate("crate-three-a", 600, 270), crate("crate-three-b", 1150, 295), crate("crate-three-c", 1745, 265)],
      doors: [
        door("door-three-a", 820, 420, 34, 80, "door-three-a"),
        door("door-three-b", 1345, 420, 34, 80, "door-three-b"),
        door("door-three-c", 1885, 420, 34, 80, "door-three-c"),
      ],
      exit: { x: 2320, y: 280, w: 78, h: 140 },
    },
    {
      id: 3,
      theme: { skyTop: "#c8b8f0", skyMid: "#f0c4df", skyBottom: "#ffe0a1", far: "#ad91c8", near: "#766492", accent: "#fff0b5", ground: "#574b78", platform: "#756395", platformTop: "#e3b6cf", moving: "#a88bc4" },
      name: "하늘 릴레이",
      card: {
        name: "하늘 릴레이",
        objective: "한 명이 스위치를 잡고, 다른 한 명을 던져 연속 장치를 여세요",
        gimmick: "협동 발사 릴레이",
        difficulty: 4,
        estimatedMinutes: 5,
      },
      width: 1700,
      height: VIEW.height,
      spawns: [{ x: 90, y: 440 }, { x: 150, y: 440 }],
      platforms: [
        platform(0, 500, 300, 40, "ground"),
        platform(420, 500, 260, 40, "ground"),
        platform(820, 500, 280, 40, "ground"),
        platform(1280, 500, 420, 40, "ground"),
        platform(220, 390, 150),
        platform(520, 345, 140),
        platform(720, 420, 120),
        platform(980, 350, 150),
        platform(1200, 410, 130),
        platform(1430, 330, 170),
      ],
      hazards: [hazard(300, 470, 120), hazard(680, 470, 140), hazard(1100, 470, 180)],
      switches: [
        switchPad("relay-hold", 250, 487),
        switchPad("relay-launch-a", 585, 332, { requiresLaunch: true, latchOnLaunch: true }),
        switchPad("relay-launch-b", 1030, 337, { requiresLaunch: true, latchOnLaunch: true }),
      ],
      movingPlatforms: [movingPlatform("relay-lift", 1120, 280, 110, 18, 55, 1.1, 0)],
      crates: [],
      doors: [
        door("relay-door-a", 390, 420, 34, 80, "relay-hold"),
        door("relay-door-b", 760, 420, 34, 80, "relay-launch-a"),
        door("relay-door-c", 1160, 420, 34, 80, "relay-launch-b"),
      ],
      exit: { x: 1580, y: 290, w: 72, h: 110 },
    },
  ];

  class InputManager {
    constructor() {
      this.down = new Set();
      this.pressed = new Set();
      window.addEventListener("keydown", (event) => {
        const code = event.code;
        if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "BracketLeft", "BracketRight", "Space"].includes(code)) event.preventDefault();
        if (!event.repeat) this.pressed.add(code);
        this.down.add(code);
      });
      window.addEventListener("keyup", (event) => this.down.delete(event.code));
      window.addEventListener("blur", () => this.clear());
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) this.clear();
      });
    }

    isDown(code) { return this.down.has(code); }
    wasPressed(code) { return this.pressed.has(code); }
    clear() { this.down.clear(); this.pressed.clear(); }
    endFrame() { this.pressed.clear(); }
  }

  class AudioManager {
    constructor() { this.context = null; }

    unlock() {
      if (!this.context) this.context = new (window.AudioContext || window.webkitAudioContext)();
      if (this.context.state === "suspended") this.context.resume();
    }

    beep(frequency, duration = 0.08, type = "sine", volume = 0.035) {
      if (!this.context) return;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(volume, this.context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + duration);
      oscillator.connect(gain).connect(this.context.destination);
      oscillator.start();
      oscillator.stop(this.context.currentTime + duration);
    }

    rope() { this.beep(440, 0.08, "triangle"); }
    attach() { this.beep(740, 0.12, "sine"); }
    boost() { this.beep(280, 0.04, "square", 0.018); }
    clear() { this.beep(880, 0.1); setTimeout(() => this.beep(1175, 0.16), 80); }
    fail() { this.beep(150, 0.16, "sawtooth", 0.025); }
  }

  class CheckpointStore {
    static get key() { return "cooperative-rope-game:checkpoint:v1"; }

    static save(snapshot) {
      try {
        window.localStorage.setItem(this.key, JSON.stringify(snapshot));
      } catch (error) {
        // Private browsing and storage quota failures must not interrupt play.
        console.warn("Checkpoint could not be saved.", error);
      }
    }

    static load() {
      try {
        const raw = window.localStorage.getItem(this.key);
        if (!raw) return null;
        const snapshot = JSON.parse(raw);
        const validPlayers = Array.isArray(snapshot.players) && snapshot.players.length === 2
          && snapshot.players.every((player) => Number.isFinite(player.x) && Number.isFinite(player.y));
        const validStage = Number.isInteger(snapshot.stageIndex) && snapshot.stageIndex >= 0 && snapshot.stageIndex < STAGES.length;
        const validRun = typeof snapshot.ownerId === "string" && snapshot.ownerId.length > 0
          && typeof snapshot.partnerName === "string" && snapshot.partnerName.length > 0
          && typeof snapshot.teamLabel === "string" && snapshot.teamLabel.length > 0
          && typeof snapshot.attemptId === "string" && Number.isFinite(snapshot.elapsedMs) && snapshot.elapsedMs >= 0;
        if (snapshot.version !== 2 || !validPlayers || !validStage || !validRun) return null;
        if (ownerId && snapshot.ownerId !== ownerId) return null;
        return snapshot;
      } catch (error) {
        console.warn("Checkpoint could not be loaded.", error);
        return null;
      }
    }

    static clear() {
      try { window.localStorage.removeItem(this.key); } catch (error) { /* no-op */ }
    }
  }

  class CampaignProgressStore {
    static key(ownerId = "local-preview") { return `ropebound-campaign-progress:v1:${encodeURIComponent(ownerId)}`; }

    static defaults() {
      return { version: 1, clearedStageIds: [], bonusStageUnlocked: false };
    }

    static sanitize(progress) {
      if (!progress || progress.version !== 1 || !Array.isArray(progress.clearedStageIds)
        || typeof progress.bonusStageUnlocked !== "boolean") return this.defaults();
      return {
        version: 1,
        clearedStageIds: [...new Set(progress.clearedStageIds.filter((id) => Number.isInteger(id) && id >= 0 && id <= 2))],
        bonusStageUnlocked: progress.bonusStageUnlocked,
      };
    }

    static load(ownerId) {
      try {
        const raw = window.localStorage.getItem(this.key(ownerId));
        return raw ? this.sanitize(JSON.parse(raw)) : this.defaults();
      } catch (error) {
        console.warn("Campaign progress could not be loaded.", error);
        return this.defaults();
      }
    }

    static save(progress, ownerId) {
      const sanitized = this.sanitize(progress);
      try {
        window.localStorage.setItem(this.key(ownerId), JSON.stringify(sanitized));
        return sanitized;
      } catch (error) {
        console.warn("Campaign progress could not be saved.", error);
        return this.load(ownerId);
      }
    }

    static clear(ownerId) {
      try { window.localStorage.removeItem(this.key(ownerId)); } catch (error) { /* no-op */ }
      return this.defaults();
    }

    static clearStage(stageId, ownerId) {
      const progress = this.load(ownerId);
      if (Number.isInteger(stageId) && stageId >= 0 && stageId <= 2) {
        progress.clearedStageIds.push(stageId);
      }
      return this.save(progress, ownerId);
    }

    static unlockBonusStage(ownerId) {
      const progress = this.load(ownerId);
      progress.bonusStageUnlocked = true;
      return this.save(progress, ownerId);
    }
  }

  class RunSessionStore {
    static key = "tugmate:run-session:v1";
    static load(ownerId) {
      try {
        const value = JSON.parse(window.localStorage.getItem(this.key) || "null");
        return value?.version === 1 && value.ownerId === ownerId ? value : null;
      } catch { return null; }
    }
    static save(session) {
      try { window.localStorage.setItem(this.key, JSON.stringify(session)); } catch (error) { console.warn("Run session could not be saved.", error); }
    }
    static clear() { try { window.localStorage.removeItem(this.key); } catch { /* no-op */ } }
  }

  class HistoryPauseController {
    constructor(game) {
      this.game = game;
      this.armed = false;
      this.guardState = { ropebound: "navigation-guard" };
    }

    install() {
      try {
        window.history.replaceState({ ...(window.history.state || {}), ropebound: "base" }, "", window.location.href);
      } catch (error) {
        console.warn("History pause guard could not be installed.", error);
      }
      window.addEventListener("popstate", () => {
        if (!this.armed) return;
        try { window.history.pushState(this.guardState, "", window.location.href); } catch (error) { /* no-op */ }
        this.game.pause("browser-back");
      });
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") this.game.pause("visibility");
      });
      window.addEventListener("blur", () => this.game.pause("blur"));
      window.addEventListener("pagehide", () => this.game.pause("pagehide"));
    }

    arm() {
      if (this.armed) return;
      this.armed = true;
      try { window.history.pushState(this.guardState, "", window.location.href); } catch (error) { /* no-op */ }
    }
  }

  class Player {
    constructor(id, spawn) {
      this.id = id;
      this.width = PHYSICS.playerWidth;
      this.height = PHYSICS.playerHeight;
      this.color = id === 1 ? "#ff9e83" : "#69ded2";
      this.spawnX = spawn.x;
      this.spawnY = spawn.y;
      this.x = spawn.x;
      this.y = spawn.y;
      this.vx = 0;
      this.vy = 0;
      this.facing = id === 1 ? 1 : -1;
      this.onGround = false;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
      this.launchTimer = 0;
    }

    get bounds() { return { x: this.x, y: this.y, w: this.width, h: this.height }; }
    get center() { return { x: this.x + this.width / 2, y: this.y + this.height / 2 }; }
  }

  class Game {
    constructor() {
      this.controls = ControlsStore.load();
      this.capturingBinding = null;
      this.controlsOpen = false;
      this.controlsReturnTo = "#menu-screen";
      this.input = new InputManager();
      this.audio = new AudioManager();
      this.mode = "menu";
      this.auth = window.ropeboundAuth;
      this.authState = this.auth?.snapshot?.() || { status: "unavailable", error: "인증 기능을 사용할 수 없습니다." };
      this.authReady = false;
      this.stageAccessReady = false;
      this.stageIndex = 0;
      this.runSource = "campaign";
      this.ownerId = "";
      this.activeAttempt = null;
      this.pendingRun = null;
      this.partnerDialogResolve = null;
      this.campaignProgress = CampaignProgressStore.defaults();
      this.savedCheckpoint = null;
      this.menuRenderKey = null;
      this.stage = null;
      this.stageState = null;
      this.players = [];
      this.ropes = [];
      this.movingPlatforms = [];
      this.crates = [];
      this.cameraX = 0;
      this.elapsed = 0;
      this.lastFrameAt = performance.now();
      this.pauseReason = "";
      this.historyController = new HistoryPauseController(this);
      document.addEventListener("keydown", (event) => this.captureControlBinding(event), true);
      this.bindUI();
      window.addEventListener("keydown", (event) => this.handleGlobalInput(event));
      window.addEventListener("online", () => {
        if (this.ownerId && this.authState.status === "authenticated") {
          this.auth.syncPendingEvents(this.ownerId).then(() => {
            if (this.auth.profile) this.mergeCloudProfile(this.auth.profile);
            this.authState.apiAvailable = true;
            this.authState.error = "";
            this.renderUI();
          }).catch(() => {});
        }
      });
      this.historyController.install();
      this.loadStage(this.savedCheckpoint ? this.savedCheckpoint.stageIndex : 0);
      this.renderControls();
      document.querySelector("#partner-form")?.addEventListener("submit", (event) => this.confirmNewRun(event));
      document.querySelector("#partner-cancel-button")?.addEventListener("click", () => this.cancelNewRun());
      document.querySelector("#partner-dialog")?.addEventListener("cancel", (event) => {
        event.preventDefault();
        this.cancelNewRun();
      });
      this.initializeAuth();
      requestAnimationFrame((timestamp) => this.frame(timestamp));
    }

    bindUI() {
      document.querySelector("#start-button")?.addEventListener("click", () => this.handleTitleStart());
      document.querySelector("#local-preview-button")?.addEventListener("click", () => this.enterLocalPreview());
      document.querySelector("#auth-controls-button")?.addEventListener("click", () => this.openControls("#auth-screen"));
      document.querySelector("#sign-out-button")?.addEventListener("click", () => this.signOut());
      document.querySelector("#new-game-button")?.addEventListener("click", () => this.startNewGame());
      document.querySelector("#continue-run-button")?.addEventListener("click", () => this.continueSavedRun());
      document.querySelector("#continue-button").addEventListener("click", () => this.advanceStage());
      document.querySelector("#controls-button").addEventListener("click", () => this.openControls());
      document.querySelector("#controls-back-button").addEventListener("click", () => this.closeControls());
      document.querySelector("#controls-reset-button").addEventListener("click", () => this.restoreDefaultControls());
      document.querySelector("#pause-controls-button").addEventListener("click", () => this.openControls("#pause-screen"));
      document.querySelector("#pause-resume-button").addEventListener("click", () => this.resume());
      document.querySelector("#pause-menu-button").addEventListener("click", () => this.returnToMenu());
    }

    async initializeAuth() {
      if (!this.auth) {
        this.authReady = true;
        this.authState = { status: "unavailable", error: "회사 로그인 기능을 불러오지 못했습니다." };
        this.renderUI();
        return;
      }
      this.authState = await this.auth.initialize();
      this.authReady = true;
      if (this.authState.status === "authenticated") {
        await this.openStageMap();
      } else {
        this.renderUI();
      }
    }

    async handleTitleStart() {
      if (!this.authReady) return;
      if (this.authState.status === "authenticated") {
        await this.openStageMap();
        return;
      }
      if (this.authState.status !== "signed-out") {
        this.authState.error = this.authState.status === "unconfigured"
          ? "회사 로그인 설정이 아직 완료되지 않았습니다."
          : this.authState.error || "회사 로그인에 연결할 수 없습니다.";
        this.renderUI();
        return;
      }
      try {
        await this.auth.signIn();
      } catch {
        this.authState.error = "로그인 창을 열지 못했습니다. 다시 시도해 주세요.";
        this.renderUI();
      }
    }

    async enterLocalPreview() {
      try {
        this.authState = await this.auth.enterLocalPreview();
        await this.openStageMap();
      } catch {
        this.authState.error = "로컬 미리보기는 localhost에서만 사용할 수 있습니다.";
        this.renderUI();
      }
    }

    async openStageMap() {
      if (this.authState.status !== "authenticated" && this.authState.status !== "local-preview") return false;
      this.ownerId = this.auth.getOwnerId();
      this.campaignProgress = CampaignProgressStore.load(this.ownerId);
      const cachedCheckpoint = CheckpointStore.load();
      this.savedCheckpoint = cachedCheckpoint?.ownerId === this.ownerId ? cachedCheckpoint : null;
      if (cachedCheckpoint && !this.savedCheckpoint) CheckpointStore.clear();
      this.activeAttempt = RunSessionStore.load(this.ownerId);
      if (this.authState.status === "authenticated") {
        try {
          const response = await this.auth.requestApi("/api/me");
          this.auth.profile = response.profile;
          this.mergeCloudProfile(response.profile);
          this.authState.apiAvailable = true;
          this.auth.syncPendingEvents(this.ownerId).then(() => {
            if (this.auth.profile) this.mergeCloudProfile(this.auth.profile);
            this.renderUI();
          }).catch(() => {});
        } catch (error) {
          if (error.status === 401 || error.status === 403) {
            this.authState.error = error.message;
            this.authState.status = "unavailable";
            this.renderUI();
            return false;
          }
          this.authState.apiAvailable = false;
          this.authState.error = "랭킹 서버에 연결할 수 없습니다. 플레이 기록은 복구 후 동기화됩니다.";
          if (this.authState.status === "authenticated") {
            this.auth.enqueuePendingEvent(this.ownerId, "progress", {
              clearedStageIds: this.campaignProgress.clearedStageIds,
              bonusStageUnlocked: this.campaignProgress.bonusStageUnlocked,
            });
            this.auth.syncPendingEvents(this.ownerId).catch(() => {});
          }
        }
      }
      this.stageAccessReady = true;
      if (this.savedCheckpoint) {
        this.restore(this.savedCheckpoint);
        this.mode = "menu";
        this.pauseReason = "";
      }
      this.mode = "menu";
      this.renderUI();
      return true;
    }

    mergeCloudProfile(profile) {
      if (!profile || !Array.isArray(profile.clearedStageIds)) return;
      const clearedStageIds = [...new Set([...this.campaignProgress.clearedStageIds, ...profile.clearedStageIds])];
      const bonusStageUnlocked = this.campaignProgress.bonusStageUnlocked || profile.bonusStageUnlocked === true;
      this.campaignProgress = CampaignProgressStore.save({ version: 1, clearedStageIds, bonusStageUnlocked }, this.ownerId);
      this.cloudStageRecords = profile.stageRecords || {};
      if (this.authState.status === "authenticated"
        && (this.campaignProgress.clearedStageIds.some((id) => !profile.clearedStageIds.includes(id))
          || (this.campaignProgress.bonusStageUnlocked && !profile.bonusStageUnlocked))) this.queueProgressSync();
    }

    queueProgressSync() {
      if (this.authState.status !== "authenticated" || !this.ownerId) return;
      const payload = {
        clearedStageIds: this.campaignProgress.clearedStageIds,
        bonusStageUnlocked: this.campaignProgress.bonusStageUnlocked,
      };
      this.auth.enqueuePendingEvent(this.ownerId, "progress", payload);
      this.auth.syncPendingEvents(this.ownerId).then(() => {
        if (this.auth.profile) this.mergeCloudProfile(this.auth.profile);
        this.authState.apiAvailable = true;
        this.authState.error = "";
        this.renderUI();
      }).catch(() => {});
    }

    submitStageClear() {
      if (this.authState.status !== "authenticated" || !this.activeAttempt) return;
      const payload = {
        stageId: this.stageIndex,
        elapsedMs: Math.max(0, Math.round(this.elapsed * 1000)),
        partnerName: this.activeAttempt.partnerName,
      };
      this.auth.enqueuePendingEvent(this.ownerId, "clear", payload);
      this.auth.syncPendingEvents(this.ownerId).then(() => {
        if (this.auth.profile) this.mergeCloudProfile(this.auth.profile);
        this.authState.apiAvailable = true;
        this.authState.error = "";
        this.renderUI();
      }).catch(() => {});
    }

    async signOut() {
      if (this.authState.status === "local-preview") {
        this.auth.localPreview = false;
        this.auth.status = "unconfigured";
      } else {
        try { await this.auth.signOut(); } catch { /* redirect can be interrupted by browser policy */ }
      }
      this.stageAccessReady = false;
      this.authState = this.auth.snapshot();
      this.mode = "menu";
      this.renderUI();
    }

    renderAuthScreen() {
      const startButton = document.querySelector("#start-button");
      const localButton = document.querySelector("#local-preview-button");
      const status = document.querySelector("#auth-status");
      if (!startButton || !status) return;
      const state = this.authState;
      startButton.disabled = !this.authReady || state.status === "loading" || state.status === "unconfigured" || state.status === "unavailable";
      startButton.textContent = state.status === "signed-out" ? "회사 계정으로 로그인" : "게임 시작";
      if (localButton) localButton.hidden = !(state.localPreviewAvailable && !state.localPreview);
      if (!this.authReady) status.textContent = "회사 로그인 설정을 확인하고 있습니다.";
      else if (state.status === "unconfigured") status.textContent = state.localPreviewAvailable
        ? "로컬 개발 환경입니다. 회사 기록은 저장되지 않습니다."
        : "회사 로그인 설정이 아직 완료되지 않았습니다.";
      else if (state.status === "signed-out") status.textContent = "DEX Consulting 회사 계정으로 로그인해 주세요.";
      else if (state.status === "unavailable") status.textContent = state.error || "회사 로그인에 연결할 수 없습니다.";
      else if (state.status === "local-preview") status.textContent = "로컬 미리보기 · 기록 미동기화";
      else status.textContent = state.error || "로그인되었습니다. 게임을 시작할 수 있습니다.";
      const accountStatus = document.querySelector("#account-status");
      if (accountStatus) {
        accountStatus.textContent = state.status === "authenticated"
          ? `${state.displayName || this.auth.getDisplayName()}${state.apiAvailable === false ? " · 동기화 대기" : ""}`
          : state.status === "local-preview" ? "로컬 미리보기 · 기록 미동기화" : "";
      }
    }

    handleGlobalInput(event) {
      if (this.capturingBinding || this.controlsOpen) return;
      if (event.code === "Enter" && !this.stageAccessReady) return;
      if (event.code === "Escape" && (this.mode === "playing" || this.mode === "paused")) {
        event.preventDefault();
        if (this.mode === "playing") this.pause("manual");
        else this.resume();
        return;
      }
      if (event.code === "Enter") {
        if (event.target instanceof HTMLElement && event.target.closest("button, summary")) return;
        this.audio.unlock();
        if (this.mode === "menu") {
          if (this.savedCheckpoint) this.continueSavedRun();
          else this.startNewGame();
        }
        else if (this.mode === "paused") this.resume();
        else if (this.mode === "won") this.advanceStage();
      }
      if (event.code === "KeyR" && (this.mode === "playing" || this.mode === "paused")) this.resetStage();
      if (event.code === "KeyN" && this.mode === "won" && this.stageIndex >= STAGES.length - 1) {
        CheckpointStore.clear();
        this.startNewGame();
      }
    }

    openControls(returnTo = "#menu-screen") {
      this.capturingBinding = null;
      this.controlsOpen = true;
      this.controlsReturnTo = returnTo;
      this.input.clear();
      this.renderControls();
      this.showOverlay("#auth-screen", false);
      this.showOverlay("#menu-screen", false);
      this.showOverlay("#pause-screen", false);
      this.showOverlay("#controls-screen", true);
    }

    closeControls() {
      this.capturingBinding = null;
      this.controlsOpen = false;
      this.input.clear();
      this.showOverlay("#controls-screen", false);
      this.showOverlay(this.controlsReturnTo, true);
      this.renderUI();
    }

    beginControlCapture(player, action) {
      if (!this.controls[player] || !CONTROL_ACTIONS.includes(action)) return;
      this.capturingBinding = { player, action };
      this.input.clear();
      this.renderControls();
      this.setControlStatus("키를 누르세요. Esc은 예약 키입니다.", "pending");
    }

    captureControlBinding(event) {
      if (!this.capturingBinding) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.repeat) return;
      const { player, action } = this.capturingBinding;
      const code = event.code;
      if (/^(Shift|Control|Alt|Meta)/.test(code) || !code || code === "Unidentified") return;
      if (RESERVED_CONTROL_CODES.has(code)) {
        this.setControlStatus(`${controlCodeLabel(code)} 키는 게임 조작에 예약되어 있습니다.`, "error");
        return;
      }
      const duplicate = ["p1", "p2"].some((playerId) => CONTROL_ACTIONS.some((actionId) => (
        this.controls[playerId][actionId] === code && !(playerId === player && actionId === action)
      )));
      if (duplicate) {
        this.setControlStatus(`${controlCodeLabel(code)} 키는 이미 다른 동작에 배정되어 있습니다.`, "error");
        return;
      }

      const nextControls = { p1: { ...this.controls.p1 }, p2: { ...this.controls.p2 } };
      nextControls[player][action] = code;
      this.controls = nextControls;
      const saved = ControlsStore.save(this.controls);
      const capturedBinding = this.capturingBinding;
      this.capturingBinding = null;
      this.input.clear();
      this.renderControls();
      this.setControlStatus(saved ? "조작 키를 저장했습니다." : "키는 변경했지만 브라우저 저장에 실패했습니다.", saved ? "success" : "error", capturedBinding);
    }

    restoreDefaultControls() {
      this.capturingBinding = null;
      this.input.clear();
      this.controls = ControlsStore.reset();
      this.renderControls();
      this.setControlStatus("기본 조작 키로 복원했습니다.", "success");
    }

    setControlStatus(message, state = "", target = this.capturingBinding) {
      const status = document.querySelector("#controls-status");
      status.textContent = message;
      status.dataset.state = state;
      document.querySelectorAll(".control-setting-status").forEach((item) => {
        item.textContent = "";
        item.dataset.state = "";
      });
      if (target) {
        const rowStatus = document.querySelector(`[data-control-status-player="${target.player}"][data-control-status-action="${target.action}"]`);
        if (rowStatus) {
          rowStatus.textContent = message;
          rowStatus.dataset.state = state;
        }
      }
    }

    renderControls() {
      for (const player of ["p1", "p2"]) {
        const summary = document.querySelector(`#controls-summary-${player}`);
        if (summary) {
          const controls = this.controls[player];
          summary.textContent = `${controlCodeLabel(controls.left)}/${controlCodeLabel(controls.right)} 이동 · ${controlCodeLabel(controls.jump)} 점프 · ${controlCodeLabel(controls.down)} 아래 조준 · ${controlCodeLabel(controls.rope)} 로프 · ${controlCodeLabel(controls.boost)} 파트너 발사`;
        }
        const list = document.querySelector(`[data-control-list="${player}"]`);
        if (!list) continue;
        list.replaceChildren();
        for (const action of CONTROL_ACTIONS) {
          const row = document.createElement("div");
          row.className = "control-setting-row";
          const label = document.createElement("span");
          label.className = "control-setting-label";
          label.textContent = CONTROL_ACTION_LABELS[action];
          const button = document.createElement("button");
          button.type = "button";
          button.className = "binding-button";
          button.dataset.player = player;
          button.dataset.action = action;
          button.textContent = this.capturingBinding?.player === player && this.capturingBinding.action === action
            ? "키 입력 대기…"
            : controlCodeLabel(this.controls[player][action]);
          button.setAttribute("aria-label", `${player === "p1" ? "플레이어 1" : "플레이어 2"} ${CONTROL_ACTION_LABELS[action]} 키 변경`);
          button.classList.toggle("capturing", this.capturingBinding?.player === player && this.capturingBinding.action === action);
          button.addEventListener("click", () => this.beginControlCapture(player, action));
          const status = document.createElement("span");
          status.className = "control-setting-status";
          status.dataset.controlStatusPlayer = player;
          status.dataset.controlStatusAction = action;
          row.append(label, button);
          row.append(status);
          list.append(row);
        }
      }
      const ropeHelp = document.querySelector("#rope-control-help");
      if (ropeHelp) {
        ropeHelp.textContent = `방향 키와 로프 키를 함께 누르면 8방향으로 발사합니다. 방향 입력이 없으면 바라보는 쪽으로 발사합니다. 줄이 연결된 상태에서 파트너 발사 키(${controlCodeLabel(this.controls.p1.boost)} / ${controlCodeLabel(this.controls.p2.boost)})를 누르면 파트너만 발사자 쪽, 줄을 당기는 방향으로 날아가고 줄은 자동 해제됩니다.`;
      }
    }

    startNewGame() {
      if (!this.stageAccessReady) return;
      this.requestNewRun(0, "campaign");
    }

    continueSavedRun() {
      if (!this.stageAccessReady) return;
      const checkpoint = CheckpointStore.load(this.ownerId);
      if (!checkpoint) {
        this.savedCheckpoint = null;
        this.renderUI();
        return;
      }
      if (checkpoint.ownerId !== this.ownerId) {
        CheckpointStore.clear();
        this.savedCheckpoint = null;
        this.renderUI();
        return;
      }
      this.audio.unlock();
      this.runSource = "campaign";
      this.activeAttempt = {
        ownerId: this.ownerId,
        partnerName: checkpoint.partnerName,
        teamLabel: checkpoint.teamLabel,
        stageId: checkpoint.stageIndex,
        elapsedMs: checkpoint.elapsedMs,
        attemptId: checkpoint.attemptId,
      };
      this.savedCheckpoint = checkpoint;
      this.restore(checkpoint);
      this.mode = checkpoint.mode === "won" ? "won" : "playing";
      this.pauseReason = "";
      this.lastFrameAt = performance.now();
      this.historyController.arm();
    }

    startStageFromCard(stageId) {
      if (!this.stageAccessReady || !Number.isInteger(stageId) || !this.isStageUnlocked(stageId)) return;
      this.requestNewRun(stageId, "replay");
    }

    requestNewRun(stageId, runSource, partnerName = "") {
      if (!this.stageAccessReady || !Number.isInteger(stageId) || !this.isStageUnlocked(stageId)) return;
      this.pendingRun = { stageId, runSource, previousMode: this.mode };
      const employeeName = this.authState.displayName || this.auth.getDisplayName();
      document.querySelector("#employee-name").value = employeeName;
      const partnerInput = document.querySelector("#partner-name");
      partnerInput.value = partnerName || this.activeAttempt?.partnerName || "";
      document.querySelector("#partner-form-status").textContent = "팀 이름은 랭킹에 표시됩니다.";
      this.mode = "paused";
      this.pauseReason = "team-setup";
      document.querySelector("#partner-dialog")?.showModal();
      partnerInput.focus();
    }

    confirmNewRun(event) {
      event.preventDefault();
      if (!this.pendingRun) return;
      const partnerName = document.querySelector("#partner-name").value.trim().replace(/\s+/gu, " ");
      if (!partnerName || partnerName.length > 40) {
        document.querySelector("#partner-form-status").textContent = "파트너 이름을 1~40자로 입력해 주세요.";
        return;
      }
      const { stageId, runSource } = this.pendingRun;
      const displayName = this.authState.displayName || this.auth.getDisplayName();
      this.activeAttempt = {
        ownerId: this.ownerId,
        partnerName,
        teamLabel: `${displayName} with ${partnerName}`,
        stageId,
        elapsedMs: 0,
        attemptId: window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      };
      RunSessionStore.save({ version: 1, ...this.activeAttempt });
      this.pendingRun = null;
      document.querySelector("#partner-dialog").close();
      this.audio.unlock();
      this.runSource = runSource;
      this.stageIndex = stageId;
      this.loadStage(stageId);
      this.mode = "playing";
      this.savedCheckpoint = null;
      if (runSource === "campaign") CheckpointStore.clear();
      this.historyController.arm();
    }

    cancelNewRun() {
      if (!this.pendingRun) return;
      this.mode = this.pendingRun.previousMode;
      this.pendingRun = null;
      document.querySelector("#partner-dialog").close();
      this.renderUI();
    }

    isStageUnlocked(stageId) {
      if (!Number.isInteger(stageId) || stageId < 0 || stageId >= STAGES.length) return false;
      if (stageId === 0) return true;
      if (stageId === 3) return this.campaignProgress.bonusStageUnlocked;
      return Array.from({ length: stageId }, (_, id) => id)
        .every((id) => this.campaignProgress.clearedStageIds.includes(id));
    }

    getStageProgressStatus(stageId) {
      if (this.campaignProgress.clearedStageIds.includes(stageId)) return "completed";
      if (!this.isStageUnlocked(stageId)) return "locked";
      if (stageId === 3) return "bonus-available";
      const currentStage = [0, 1, 2].find((id) => (
        this.isStageUnlocked(id) && !this.campaignProgress.clearedStageIds.includes(id)
      ));
      return stageId === currentStage ? "current" : "locked";
    }

    advanceStage() {
      if (this.mode !== "won") return;
      if (this.stageIndex >= 2) {
        if (this.runSource === "campaign") {
          CheckpointStore.clear();
          this.savedCheckpoint = null;
        }
        this.mode = "menu";
        this.activeAttempt = null;
        RunSessionStore.clear();
        this.loadStage(0);
        return;
      }
      this.stageIndex += 1;
      if (this.activeAttempt) {
        this.activeAttempt.stageId = this.stageIndex;
        this.activeAttempt.elapsedMs = 0;
        this.activeAttempt.attemptId = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        RunSessionStore.save({ version: 1, ...this.activeAttempt });
      }
      this.loadStage(this.stageIndex);
      this.mode = "playing";
      this.saveCheckpoint();
    }

    loadStage(index) {
      this.stageIndex = index;
      this.stage = clone(STAGES[index]);
      this.stageState = {
        switches: Object.fromEntries(this.stage.switches.map((item) => [item.id, false])),
        doors: Object.fromEntries(this.stage.doors.map((item) => [item.id, false])),
      };
      this.movingPlatforms = this.stage.movingPlatforms.map((item) => ({ ...item }));
      this.crates = this.stage.crates.map((item) => ({ ...item }));
      this.players = this.stage.spawns.map((spawn, index) => new Player(index + 1, spawn));
      this.ropes = [this.makeRope(1), this.makeRope(2)];
      this.cameraX = 0;
      this.elapsed = 0;
      this.lastFrameAt = performance.now();
    }

    resetStage(promptPartner = true) {
      if (promptPartner) {
        this.requestNewRun(this.stageIndex, this.runSource, this.activeAttempt?.partnerName || "");
        return;
      }
      this.audio.unlock();
      this.audio.fail();
      if (this.activeAttempt) {
        this.activeAttempt.attemptId = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        this.activeAttempt.elapsedMs = 0;
        this.activeAttempt.stageId = this.stageIndex;
        RunSessionStore.save({ version: 1, ...this.activeAttempt });
      }
      this.loadStage(this.stageIndex);
      this.mode = "playing";
      this.historyController.arm();
      this.saveCheckpoint();
    }

    pause(reason = "manual") {
      if (this.mode !== "playing") return;
      this.mode = "paused";
      this.pauseReason = reason;
      this.saveCheckpoint();
    }

    resume() {
      if (this.mode !== "paused") return;
      this.audio.unlock();
      this.mode = "playing";
      this.pauseReason = "";
      this.lastFrameAt = performance.now();
      this.historyController.arm();
    }

    returnToMenu() {
      if (this.mode !== "paused") return;
      this.saveCheckpoint();
      this.mode = "menu";
      this.pauseReason = "";
      this.input.clear();
    }

    saveCheckpoint() {
      if (this.runSource === "replay" || !this.stage || !this.players.length) return;
      CheckpointStore.save(this.serialize());
      if (this.activeAttempt) RunSessionStore.save({ version: 1, ...this.activeAttempt });
      this.savedCheckpoint = CheckpointStore.load(this.ownerId);
    }

    serialize() {
      return {
        version: 2,
        ownerId: this.ownerId,
        partnerName: this.activeAttempt?.partnerName || "",
        teamLabel: this.activeAttempt?.teamLabel || "",
        attemptId: this.activeAttempt?.attemptId || "",
        elapsedMs: Math.round(this.elapsed * 1000),
        savedAt: Date.now(),
        mode: this.mode,
        stageIndex: this.stageIndex,
        players: this.players.map((player) => ({
          id: player.id,
          x: player.x,
          y: player.y,
          vx: player.vx,
          vy: player.vy,
          facing: player.facing,
          onGround: player.onGround,
          launchTimer: player.launchTimer,
        })),
        ropes: this.ropes.map((rope) => ({
          state: rope.state,
          ownerId: rope.ownerId,
          originX: rope.originX,
          originY: rope.originY,
          headX: rope.headX,
          headY: rope.headY,
          direction: { ...rope.direction },
          currentLength: rope.currentLength,
          tension: rope.tension,
          boostLevel: rope.boostLevel,
          targetPlayerId: rope.targetPlayerId,
        })),
        stageState: clone(this.stageState),
        movingPlatforms: this.movingPlatforms.map((item) => ({ id: item.id, x: item.x, y: item.y })),
        crates: Object.fromEntries(this.crates.map((item) => [item.id, { x: item.x, y: item.y, vx: item.vx, vy: item.vy }])),
        cameraX: this.cameraX,
      };
    }

    restore(snapshot) {
      this.ownerId = snapshot.ownerId;
      this.activeAttempt = {
        ownerId: snapshot.ownerId,
        partnerName: snapshot.partnerName,
        teamLabel: snapshot.teamLabel,
        stageId: snapshot.stageIndex,
        elapsedMs: snapshot.elapsedMs,
        attemptId: snapshot.attemptId,
      };
      this.loadStage(snapshot.stageIndex);
      this.elapsed = snapshot.elapsedMs / 1000;
      for (const saved of snapshot.players) {
        const player = this.players.find((item) => item.id === saved.id);
        if (!player) continue;
        Object.assign(player, {
          x: saved.x, y: saved.y, vx: saved.vx || 0, vy: saved.vy || 0,
          facing: saved.facing === -1 ? -1 : 1, onGround: Boolean(saved.onGround),
          launchTimer: Number.isFinite(saved.launchTimer) ? Math.max(0, saved.launchTimer) : 0,
        });
      }
      if (snapshot.stageState) {
        this.stageState.switches = { ...this.stageState.switches, ...snapshot.stageState.switches };
        this.stageState.doors = { ...this.stageState.doors, ...snapshot.stageState.doors };
      }
      if (Array.isArray(snapshot.ropes)) {
        for (const saved of snapshot.ropes) {
          const rope = this.ropes.find((item) => item.ownerId === saved.ownerId);
          if (!rope) continue;
          Object.assign(rope, {
            state: ["idle", "flying", "attached"].includes(saved.state) ? saved.state : "idle",
            originX: saved.originX || 0, originY: saved.originY || 0,
            headX: saved.headX || 0, headY: saved.headY || 0,
            direction: this.normalizeRopeDirection(saved.direction),
            currentLength: saved.currentLength || 0, tension: saved.tension || 0,
            boostLevel: saved.boostLevel || 0, targetPlayerId: saved.targetPlayerId || null,
          });
        }
      }
      if (snapshot.crates) {
        for (const item of this.crates) {
          const saved = snapshot.crates[item.id];
          if (saved) Object.assign(item, { x: saved.x, y: saved.y, vx: saved.vx || 0, vy: saved.vy || 0 });
        }
      }
      if (Array.isArray(snapshot.movingPlatforms)) {
        for (const saved of snapshot.movingPlatforms) {
          const item = this.movingPlatforms.find((platformItem) => platformItem.id === saved.id);
          if (item) Object.assign(item, { x: saved.x, y: saved.y });
        }
      }
      this.cameraX = Number.isFinite(snapshot.cameraX) ? snapshot.cameraX : 0;
      this.mode = "paused";
      this.pauseReason = "restored";
      this.lastFrameAt = performance.now();
      this.historyController.arm();
    }

    makeRope(ownerId) {
      return {
        state: "idle",
        ownerId,
        originX: 0,
        originY: 0,
        headX: 0,
        headY: 0,
        direction: { x: 1, y: 0 },
        speed: 900,
        maxLength: 280,
        currentLength: 0,
        tension: 0,
        boostLevel: 0,
        targetPlayerId: null,
      };
    }

    normalizeRopeDirection(direction) {
      if (direction === -1 || direction === 1) return { x: direction, y: 0 };
      if (!direction || !Number.isFinite(direction.x) || !Number.isFinite(direction.y)) return { x: 1, y: 0 };
      const magnitude = Math.hypot(direction.x, direction.y);
      if (!Number.isFinite(magnitude) || magnitude === 0) return { x: 1, y: 0 };
      return { x: direction.x / magnitude, y: direction.y / magnitude };
    }

    frame(timestamp) {
      const delta = clamp((timestamp - this.lastFrameAt) / 1000, 0, 0.033);
      this.lastFrameAt = timestamp;
      this.update(delta);
      this.render();
      this.input.endFrame();
      requestAnimationFrame((nextTimestamp) => this.frame(nextTimestamp));
    }

    update(delta) {
      if (this.mode === "playing") {
        this.elapsed += delta;
        if (this.activeAttempt) {
          this.activeAttempt.elapsedMs = Math.round(this.elapsed * 1000);
        }
        this.updateMovingPlatforms();
        this.updateObjects(delta);
        if (!this.campaignProgress.bonusStageUnlocked && this.stage.switches.some((item) => (
          item.unlockBonusStage && this.stageState.switches[item.id]
        ))) {
          this.campaignProgress = CampaignProgressStore.unlockBonusStage(this.ownerId);
          this.queueProgressSync();
        }
        this.updatePlayers(delta);
        this.updateRopes(delta);
        this.checkHazards();
        this.checkStageResult();
        this.updateCamera();
      }
      this.renderUI();
    }

    getControls(player) {
      return this.controls[player.id === 1 ? "p1" : "p2"];
    }

    getRopeAim(owner, controls) {
      const x = (this.input.isDown(controls.right) ? 1 : 0) - (this.input.isDown(controls.left) ? 1 : 0);
      const y = (this.input.isDown(controls.down) ? 1 : 0) - (this.input.isDown(controls.jump) ? 1 : 0);
      if (x === 0 && y === 0) return { x: owner.facing, y: 0 };
      const magnitude = Math.hypot(x, y);
      return { x: x / magnitude, y: y / magnitude };
    }

    updatePlayers(delta) {
      for (const player of this.players) {
        const controls = this.getControls(player);
        const direction = (this.input.isDown(controls.right) ? 1 : 0) - (this.input.isDown(controls.left) ? 1 : 0);
        player.launchTimer = Math.max(0, player.launchTimer - delta);
        if (player.launchTimer <= 0) {
          if (direction !== 0) {
            player.vx = clamp(player.vx + direction * PHYSICS.moveAcceleration * delta, -PHYSICS.maxSpeed, PHYSICS.maxSpeed);
            player.facing = direction;
          } else {
            player.vx *= Math.pow(PHYSICS.friction, delta * 60);
            if (Math.abs(player.vx) < 2) player.vx = 0;
          }
        }

        if (this.input.wasPressed(controls.jump)) player.jumpBufferTimer = 0.13;
        player.jumpBufferTimer = Math.max(0, player.jumpBufferTimer - delta);
        player.coyoteTimer = player.onGround ? 0.1 : Math.max(0, player.coyoteTimer - delta);
        if (player.jumpBufferTimer > 0 && (player.onGround || player.coyoteTimer > 0)) {
          player.vy = -PHYSICS.jumpSpeed;
          player.onGround = false;
          player.coyoteTimer = 0;
          player.jumpBufferTimer = 0;
          this.audio.beep(player.id === 1 ? 510 : 580, 0.06, "triangle");
        }
        player.vy += PHYSICS.gravity * delta;

        const previousX = player.x;
        const previousY = player.y;
        player.x += player.vx * delta;
        this.resolveHorizontal(player);
        player.y += player.vy * delta;
        this.resolveVertical(player, previousY);
        if (previousX !== player.x && player.onGround && player.launchTimer <= 0) player.vx *= 0.99;
        player.x = clamp(player.x, 0, this.stage.width - player.width);
        if (player.y > VIEW.height + 160) this.resetStage(false);
      }
    }

    updateMovingPlatforms() {
      for (const item of this.movingPlatforms) {
        item.x = item.baseX + Math.sin(this.elapsed * item.speed + item.phase) * item.range;
        item.y = item.baseY + Math.cos(this.elapsed * item.speed * 0.7 + item.phase) * 8;
      }
    }

    updateObjects(delta) {
      for (const item of this.crates) {
        item.vy += PHYSICS.gravity * delta;
        item.vx *= Math.pow(0.86, delta * 60);
        item.x += item.vx * delta;
        item.y += item.vy * delta;
        for (const solid of this.getSolids(false, item)) {
          if (intersects(item, solid) && item.vy >= 0 && item.y + item.h - item.vy * delta <= solid.y + 8) {
            item.y = solid.y - item.h;
            item.vy = 0;
          }
        }
      }
      for (const item of this.stage.switches) {
        const activationArea = { x: item.x - 4, y: item.y - 18, w: item.w + 8, h: item.h + 20 };
        const occupiedByPlayer = this.players.some((player) => (
          (!item.requiresLaunch || player.launchTimer > 0) && intersects(player.bounds, activationArea)
        ));
        const occupiedByCrate = !item.requiresLaunch && this.crates.some((box) => intersects(box, activationArea));
        const occupied = occupiedByPlayer || occupiedByCrate;
        const wasActive = this.stageState.switches[item.id];
        const nextActive = item.latchOnLaunch ? wasActive || occupied : occupied;
        if (nextActive && !wasActive) this.audio.beep(660, 0.12, "sine");
        this.stageState.switches[item.id] = nextActive;
      }
      for (const item of this.stage.doors) this.stageState.doors[item.id] = this.stageState.switches[item.switchId] === true;
    }

    getSolids(includeDoors = true, ignored = null) {
      const solids = [...this.stage.platforms, ...this.movingPlatforms, ...this.crates.filter((item) => item !== ignored)];
      if (includeDoors) solids.push(...this.stage.doors.filter((item) => !this.stageState.doors[item.id]));
      return solids;
    }

    resolveHorizontal(player) {
      for (const solid of this.getSolids()) {
        if (!intersects(player.bounds, solid)) continue;
        const incomingVelocity = player.vx;
        if (incomingVelocity > 0) player.x = solid.x - player.width;
        else if (incomingVelocity < 0) player.x = solid.x + solid.w;
        else continue;
        player.vx = 0;
        const box = this.crates.find((item) => item === solid);
        if (box) box.vx += incomingVelocity * 0.25;
      }
    }

    resolveVertical(player, previousY) {
      player.onGround = false;
      for (const solid of this.getSolids()) {
        if (!intersects(player.bounds, solid)) continue;
        const wasAbove = previousY + player.height <= solid.y + 8;
        if (player.vy >= 0 && wasAbove) {
          player.y = solid.y - player.height;
          player.vy = 0;
          player.onGround = true;
        } else if (player.vy < 0 && previousY >= solid.y + solid.h - 8) {
          player.y = solid.y + solid.h;
          player.vy = 0;
        }
      }
    }

    updateRopes(delta) {
      for (const rope of this.ropes) {
        const owner = this.players[rope.ownerId - 1];
        const target = this.players.find((player) => player.id !== rope.ownerId);
        const controls = this.getControls(owner);
        if (this.input.wasPressed(controls.rope)) this.fireOrToggleRope(rope, owner, controls);
        if (rope.state === "idle") continue;
        if (rope.state === "flying") {
          const travelDistance = rope.speed * delta;
          const steps = Math.max(1, Math.ceil(travelDistance / 8));
          const stepX = rope.direction.x * travelDistance / steps;
          const stepY = rope.direction.y * travelDistance / steps;
          const solids = this.getSolids();
          for (let step = 0; step < steps; step += 1) {
            rope.headX += stepX;
            rope.headY += stepY;
            rope.currentLength = distance({ x: rope.headX, y: rope.headY }, { x: rope.originX, y: rope.originY });
            if (rope.currentLength > rope.maxLength || solids.some((solid) => pointInRect({ x: rope.headX, y: rope.headY }, solid, 2))) {
              rope.state = "idle";
              break;
            }
            if (pointInRect({ x: rope.headX, y: rope.headY }, target.bounds, 10)) {
              rope.state = "attached";
              rope.targetPlayerId = target.id;
              this.audio.attach();
              break;
            }
          }
          if (rope.state === "idle") continue;
        }
        if (rope.state === "attached") {
          const ownerCenter = owner.center;
          const targetCenter = target.center;
          rope.headX = targetCenter.x;
          rope.headY = targetCenter.y;
          rope.currentLength = distance(ownerCenter, targetCenter);
          rope.tension = Math.max(0, rope.currentLength - rope.maxLength);
          const dx = (targetCenter.x - ownerCenter.x) / Math.max(rope.currentLength, 1);
          const dy = (targetCenter.y - ownerCenter.y) / Math.max(rope.currentLength, 1);
          rope.boostLevel = 0;
          if (this.input.wasPressed(controls.boost)) {
            target.vx -= dx * PHYSICS.ropeLaunchHorizontalImpulse;
            target.vy -= dy * PHYSICS.ropeLaunchVerticalImpulse;
            owner.launchTimer = 0;
            target.launchTimer = PHYSICS.ropeLaunchDuration;
            for (const connectedRope of this.ropes) {
              if (connectedRope.state !== "attached") continue;
              if (connectedRope.ownerId !== owner.id && connectedRope.targetPlayerId !== owner.id) continue;
              connectedRope.state = "idle";
              connectedRope.tension = 0;
              connectedRope.boostLevel = 0;
              connectedRope.targetPlayerId = null;
            }
            this.audio.boost();
            continue;
          }
          if (rope.tension > 0) {
            const force = rope.tension * PHYSICS.ropeTensionAcceleration * delta;
            owner.vx += dx * force;
            owner.vy += dy * force;
            target.vx -= dx * force;
            target.vy -= dy * force;
          }
        }
      }
    }

    fireOrToggleRope(rope, owner, controls) {
      if (rope.state !== "idle") {
        rope.state = "idle";
        rope.tension = 0;
        rope.targetPlayerId = null;
        this.audio.beep(310, 0.06, "triangle");
        return;
      }
      const start = owner.center;
      rope.state = "flying";
      rope.originX = start.x;
      rope.originY = start.y;
      rope.headX = start.x;
      rope.headY = start.y;
      rope.direction = this.getRopeAim(owner, controls);
      rope.currentLength = 0;
      rope.tension = 0;
      rope.targetPlayerId = null;
      this.audio.rope();
    }

    checkHazards() {
      if (this.players.some((player) => this.stage.hazards.some((item) => intersects(player.bounds, item)))) {
        this.resetStage(false);
      }
    }

    checkStageResult() {
      if (this.mode !== "playing") return;
      if (this.players.every((player) => intersects(player.bounds, this.stage.exit))) {
        this.mode = "won";
        this.campaignProgress = CampaignProgressStore.clearStage(this.stageIndex, this.ownerId);
        this.audio.clear();
        this.submitStageClear();
        this.saveCheckpoint();
      }
    }

    updateCamera() {
      const averageX = this.players.reduce((sum, player) => sum + player.x, 0) / this.players.length;
      this.cameraX = lerp(this.cameraX, clamp(averageX - VIEW.width * 0.42, 0, this.stage.width - VIEW.width), 0.12);
    }

    render() {
      const theme = this.stage.theme || STAGES[0].theme;
      const sky = ctx.createLinearGradient(0, 0, 0, VIEW.height);
      sky.addColorStop(0, theme.skyTop);
      sky.addColorStop(0.58, theme.skyMid);
      sky.addColorStop(1, theme.skyBottom);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
      this.drawBackground(theme);
      ctx.save();
      ctx.translate(-this.cameraX, 0);
      this.drawWorld();
      for (const rope of this.ropes) this.drawRope(rope);
      for (const player of this.players) this.drawPlayer(player);
      ctx.restore();
      this.drawHud();
    }

    drawBackground(theme = this.stage.theme || STAGES[0].theme) {
      ctx.save();
      const parallax = this.cameraX * 0.18;
      ctx.globalAlpha = 0.76;
      ctx.fillStyle = theme.accent;
      ctx.beginPath();
      ctx.arc(VIEW.width * 0.79, 94, 30, 0, Math.PI * 2);
      ctx.fill();

      // Repeating screen-space silhouettes drift slower than the level.
      for (const layer of [
        { color: theme.far, base: 365, amplitude: 45, step: 280, shift: parallax },
        { color: theme.near, base: 430, amplitude: 42, step: 340, shift: parallax * 1.65 },
      ]) {
        ctx.fillStyle = layer.color;
        const offset = ((layer.shift % layer.step) + layer.step) % layer.step;
        for (let x = -layer.step - offset; x < VIEW.width + layer.step; x += layer.step) {
          ctx.beginPath();
          ctx.moveTo(x, VIEW.height);
          ctx.lineTo(x, layer.base);
          if (this.stage.id === 2) {
            ctx.lineTo(x + layer.step * 0.28, layer.base - layer.amplitude);
            ctx.lineTo(x + layer.step * 0.58, layer.base + 4);
            ctx.lineTo(x + layer.step * 0.82, layer.base - layer.amplitude * 0.7);
          } else {
            ctx.quadraticCurveTo(x + layer.step * 0.27, layer.base - layer.amplitude, x + layer.step * 0.5, layer.base - 8);
            ctx.quadraticCurveTo(x + layer.step * 0.78, layer.base - layer.amplitude * 0.72, x + layer.step, layer.base);
          }
          ctx.lineTo(x + layer.step, VIEW.height);
          ctx.closePath();
          ctx.fill();
        }
      }

      if (this.stage.id === 3) {
        ctx.globalAlpha = 0.34;
        ctx.fillStyle = theme.far;
        for (const anchor of [145, 690]) {
          const x = anchor - (parallax * 0.35 % 960);
          ctx.beginPath();
          ctx.arc(x, 388, 48, Math.PI, 0);
          ctx.lineTo(x + 48, 426);
          ctx.lineTo(x - 48, 426);
          ctx.closePath();
          ctx.fill();
          ctx.fillRect(x - 56, 420, 112, 8);
          ctx.strokeStyle = theme.accent;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, 389, 20, Math.PI, 0);
          ctx.stroke();
        }
      }

      // Accent marks add texture without obscuring player and platform silhouettes.
      ctx.globalAlpha = 0.42;
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = 2;
      for (let index = 0; index < 6; index += 1) {
        const x = ((index * 193 - parallax * 0.55) % (VIEW.width + 120) + VIEW.width + 120) % (VIEW.width + 120) - 60;
        const y = 145 + (index % 3) * 42;
        ctx.beginPath();
        if (this.stage.id === 1) {
          ctx.moveTo(x - 18, y);
          ctx.quadraticCurveTo(x, y + 5, x + 18, y);
          ctx.moveTo(x - 12, y + 8);
          ctx.quadraticCurveTo(x, y + 12, x + 12, y + 8);
        } else if (this.stage.id === 2) {
          ctx.arc(x, y + 30, 30 + (index % 2) * 12, Math.PI * 1.1, Math.PI * 1.85);
        } else {
          ctx.arc(x, y, 2 + (index % 3), 0, Math.PI * 2);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    drawWorld() {
      for (const item of this.stage.platforms) this.drawPlatform(item);
      for (const item of this.movingPlatforms) this.drawPlatform(item, true);
      for (const item of this.stage.hazards) this.drawHazard(item);
      for (const item of this.stage.switches) this.drawSwitch(item);
      for (const item of this.crates) this.drawCrate(item);
      for (const item of this.stage.doors) if (!this.stageState.doors[item.id]) this.drawDoor(item);
      this.drawExit(this.stage.exit);
    }

    drawPlatform(item, moving = false) {
      const theme = this.stage.theme || STAGES[0].theme;
      ctx.fillStyle = moving ? theme.moving : item.kind === "ground" ? theme.ground : theme.platform;
      ctx.fillRect(item.x, item.y, item.w, item.h);
      ctx.fillStyle = theme.platformTop;
      ctx.fillRect(item.x, item.y, item.w, 4);
      if (moving) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
        ctx.fillRect(item.x + 8, item.y + 8, item.w - 16, 3);
      }
    }

    drawHazard(item) {
      ctx.fillStyle = "#ff647f";
      const count = Math.max(1, Math.floor(item.w / 18));
      for (let index = 0; index < count; index += 1) {
        const x = item.x + index * (item.w / count);
        ctx.beginPath();
        ctx.moveTo(x, item.y + item.h);
        ctx.lineTo(x + item.w / count / 2, item.y);
        ctx.lineTo(x + item.w / count, item.y + item.h);
        ctx.closePath();
        ctx.fill();
      }
    }

    drawSwitch(item) {
      const active = this.stageState.switches[item.id];
      if (item.hidden && !active) return;
      ctx.fillStyle = active ? "#9fffe8" : "#d19cff";
      ctx.fillRect(item.x, item.y, item.w, item.h);
      ctx.fillStyle = active ? "#54d4bd" : "#784fb0";
      ctx.fillRect(item.x + 5, item.y + 4, item.w - 10, item.h - 4);
      ctx.fillStyle = "#e8ebff";
      ctx.font = "700 10px system-ui";
      ctx.fillText(active ? "OPEN" : "SWITCH", item.x - 4, item.y - 8);
    }

    drawCrate(item) {
      ctx.fillStyle = "#d6a66c";
      ctx.fillRect(item.x, item.y, item.w, item.h);
      ctx.strokeStyle = "#8d5f43";
      ctx.lineWidth = 3;
      ctx.strokeRect(item.x + 3, item.y + 3, item.w - 6, item.h - 6);
      ctx.beginPath();
      ctx.moveTo(item.x + 7, item.y + 7);
      ctx.lineTo(item.x + item.w - 7, item.y + item.h - 7);
      ctx.moveTo(item.x + item.w - 7, item.y + 7);
      ctx.lineTo(item.x + 7, item.y + item.h - 7);
      ctx.stroke();
    }

    drawDoor(item) {
      ctx.fillStyle = "#493d78";
      ctx.fillRect(item.x, item.y, item.w, item.h);
      ctx.fillStyle = "#b08cff";
      ctx.fillRect(item.x + 6, item.y + 8, 5, item.h - 16);
      ctx.fillRect(item.x + item.w - 11, item.y + 8, 5, item.h - 16);
      ctx.fillStyle = "#f0d5ff";
      ctx.beginPath();
      ctx.arc(item.x + item.w / 2, item.y + item.h / 2, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    drawExit(item) {
      ctx.save();
      ctx.fillStyle = "rgba(111, 240, 214, 0.12)";
      ctx.fillRect(item.x, item.y, item.w, item.h);
      ctx.strokeStyle = "#83f4dd";
      ctx.lineWidth = 3;
      ctx.strokeRect(item.x, item.y, item.w, item.h);
      ctx.fillStyle = "#9fffe8";
      ctx.font = "800 12px system-ui";
      ctx.fillText("EXIT", item.x + 12, item.y - 12);
      ctx.restore();
    }

    drawRope(rope) {
      if (rope.state === "idle") return;
      const owner = this.players[rope.ownerId - 1];
      const start = owner.center;
      const end = { x: rope.headX, y: rope.headY };
      ctx.save();
      ctx.strokeStyle = rope.tension > 0 ? "#ffe28a" : "#d9d9ff";
      ctx.lineWidth = rope.tension > 0 ? 4 + rope.boostLevel * 2 : 3;
      ctx.shadowColor = rope.tension > 0 ? "#ffd365" : "#a7b3ff";
      ctx.shadowBlur = rope.tension > 0 ? 14 : 6;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      if (rope.state === "flying") {
        ctx.fillStyle = "#fff4ce";
        ctx.beginPath();
        ctx.arc(end.x, end.y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    drawPlayer(player) {
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.scale(0.8, 0.8);
      ctx.fillStyle = player.color;
      ctx.shadowColor = player.color;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.roundRect(0, 8, player.width, player.height - 8, 10);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#11162b";
      ctx.beginPath();
      ctx.arc(9 + (player.facing > 0 ? 5 : 0), 19, 3, 0, Math.PI * 2);
      ctx.arc(21 + (player.facing > 0 ? 5 : 0), 19, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.78)";
      ctx.font = "800 10px system-ui";
      ctx.fillText(`P${player.id}`, 7, 4);
      ctx.restore();
    }

    drawHud() {
      if (!this.stage || this.mode === "menu") return;
      ctx.save();
      ctx.fillStyle = "rgba(7, 12, 30, 0.72)";
      ctx.roundRect(16, 16, 270, 48, 12);
      ctx.fill();
      ctx.fillStyle = "#f2f4ff";
      ctx.font = "800 14px system-ui";
      ctx.fillText(`STAGE ${this.stageIndex + 1} · ${this.stage.name}`, 31, 37);
      ctx.fillStyle = "#8bded6";
      ctx.font = "12px system-ui";
      ctx.fillText("두 명이 출구에 도착하세요", 31, 54);
      ctx.restore();
    }

    showOverlay(id, visible) {
      document.querySelector(id).classList.toggle("visible", visible);
    }

    renderStageMap(checkpoint = this.savedCheckpoint) {
      const map = document.querySelector("#stage-map");
      if (!map) return;
      map.replaceChildren();
      const statusLabels = {
        completed: "클리어",
        current: "현재 도전",
        locked: "잠김",
        "bonus-available": "보너스 해제",
      };

      for (const stage of STAGES) {
        const state = this.getStageProgressStatus(stage.id);
        const node = document.createElement("div");
        node.className = "stage-route-node";
        node.setAttribute("role", "listitem");
        if (stage.id === 3) node.dataset.bonus = "true";

        const card = document.createElement("button");
        card.type = "button";
        card.className = "stage-card";
        card.dataset.stageId = String(stage.id);
        card.dataset.state = state;
        card.disabled = state === "locked";
        card.setAttribute("aria-disabled", String(card.disabled));

        const title = document.createElement("strong");
        title.className = "stage-card-title";
        title.textContent = stage.card.name;
        const objective = document.createElement("span");
        objective.className = "stage-card-objective";
        objective.textContent = stage.card.objective;
        const gimmick = document.createElement("span");
        gimmick.className = "stage-card-gimmick";
        gimmick.textContent = stage.card.gimmick;
        const meta = document.createElement("span");
        meta.className = "stage-card-meta";
        meta.textContent = "난이도 " + stage.card.difficulty + "/5 · 약 " + stage.card.estimatedMinutes + "분";
        const status = document.createElement("span");
        status.className = "stage-card-status";
        status.textContent = statusLabels[state];

        card.setAttribute("aria-label", title.textContent + ". " + objective.textContent + ". " + status.textContent + ".");
        card.append(title, objective, gimmick, meta, status);
        if (state === "locked") {
          const hint = document.createElement("span");
          hint.className = "stage-card-hint";
          hint.textContent = stage.id === 3
            ? "2스테이지에서 파트너를 던져 숨겨진 높은 스위치를 누르세요."
            : "이전 스테이지 출구에 도착하면 열립니다.";
          card.append(hint);
        }
        card.addEventListener("click", () => this.startStageFromCard(stage.id));
        node.append(card);
        map.append(node);
      }

      const continueButton = document.querySelector("#continue-run-button");
      const status = document.querySelector("#continue-run-status");
      if (continueButton) continueButton.hidden = !checkpoint;
      if (status) {
        status.textContent = checkpoint
          ? "저장된 " + STAGES[checkpoint.stageIndex].card.name + " 진행 지점이 있습니다."
          : "저장된 이어하기가 없습니다.";
      }
    }

    renderUI() {
      const showMap = this.stageAccessReady && this.mode === "menu" && !this.controlsOpen;
      const showTitle = !this.stageAccessReady && !this.controlsOpen;
      this.showOverlay("#auth-screen", showTitle);
      this.showOverlay("#menu-screen", showMap);
      this.showOverlay("#pause-screen", this.stageAccessReady && this.mode === "paused" && !this.controlsOpen);
      this.showOverlay("#clear-screen", this.stageAccessReady && this.mode === "won");
      if (showTitle) this.renderAuthScreen();
      if (showMap) {
        this.renderAuthScreen();
        const checkpoint = CheckpointStore.load(this.ownerId);
        this.savedCheckpoint = checkpoint;
        const renderKey = JSON.stringify({ progress: this.campaignProgress, savedAt: checkpoint?.savedAt || null });
        if (renderKey !== this.menuRenderKey) {
          this.renderStageMap(checkpoint);
          this.menuRenderKey = renderKey;
        }
      }
      if (this.mode === "paused") {
        const messages = {
          "browser-back": "뒤로가기를 눌러 게임을 멈췄습니다. 진행 상태를 저장했어요.",
          visibility: "화면을 벗어나 게임을 멈췄습니다. 진행 상태를 저장했어요.",
          blur: "창이 비활성화되어 게임을 멈췄습니다. 진행 상태를 저장했어요.",
          pagehide: "페이지를 벗어나기 전에 진행 상태를 저장했어요.",
          restored: "저장된 지점으로 돌아왔습니다. 진행 상태를 복원했어요.",
        };
        document.querySelector("#pause-message").textContent = messages[this.pauseReason] || "진행 상태를 저장했습니다.";
      }
      if (this.mode === "won") {
        const finalCampaignStage = this.stageIndex === 2;
        const bonusStage = this.stageIndex === 3;
        document.querySelector("#clear-title").textContent = finalCampaignStage
          ? "캠페인 클리어!"
          : `${this.stage.name} 클리어!`;
        document.querySelector("#clear-message").textContent = bonusStage
          ? "숨은 협동 릴레이를 완주했습니다."
          : finalCampaignStage
            ? "세 구역을 모두 통과했습니다."
            : "다음 구역에는 더 긴 당김이 기다립니다.";
        document.querySelector("#continue-button").innerHTML = this.stageIndex >= 2
          ? "메인 화면 <span>Enter</span>"
          : "다음 스테이지 <span>Enter</span>";
      }
    }
  }

  window.ropeboundGame = new Game();
})();
