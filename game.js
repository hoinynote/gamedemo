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
    ropeBoostAcceleration: 360,
    playerWidth: 30,
    playerHeight: 48,
  };

  const DEFAULT_CONTROLS = Object.freeze({
    p1: Object.freeze({ left: "KeyF", right: "KeyH", jump: "KeyT", down: "KeyG", rope: "KeyQ", boost: "KeyW" }),
    p2: Object.freeze({ left: "ArrowLeft", right: "ArrowRight", jump: "ArrowUp", down: "ArrowDown", rope: "BracketLeft", boost: "BracketRight" }),
  });
  const CONTROL_ACTIONS = ["left", "right", "jump", "down", "rope", "boost"];
  const CONTROL_ACTION_LABELS = {
    left: "왼쪽 이동", right: "오른쪽 이동", jump: "점프", down: "플랫폼 통과", rope: "로프 발사·해제", boost: "당기기 강화",
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

    static load() {
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
  const switchPad = (id, x, y) => ({ id, x, y, w: 34, h: 13, active: false });

  const STAGES = [
    {
      id: 0,
      name: "첫 연결",
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
      switches: [switchPad("door-one", 700, 327)],
      movingPlatforms: [movingPlatform("lift-one", 1040, 305, 120, 18, 90, 1.1)],
      crates: [crate("crate-one", 630, 300)],
      doors: [door("door-one", 1332, 420, 34, 80, "door-one")],
      exit: { x: 1650, y: 345, w: 72, h: 80 },
    },
    {
      id: 1,
      name: "엇갈린 발판",
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
      switches: [switchPad("door-two-a", 720, 337), switchPad("door-two-b", 1170, 362)],
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
      name: "마지막 당김",
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
      switches: [switchPad("door-three-a", 610, 302), switchPad("door-three-b", 1140, 327), switchPad("door-three-c", 1740, 297)],
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
        if (snapshot.version !== 1 || !validPlayers || !validStage) return null;
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
      this.dropTimer = 0;
    }

    get bounds() { return { x: this.x, y: this.y, w: this.width, h: this.height }; }
    get center() { return { x: this.x + this.width / 2, y: this.y + this.height / 2 }; }
  }

  class Game {
    constructor() {
      this.controls = ControlsStore.load();
      this.capturingBinding = null;
      this.controlsOpen = false;
      this.input = new InputManager();
      this.audio = new AudioManager();
      this.mode = "menu";
      this.stageIndex = 0;
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
      this.historyController.install();
      this.loadStage(0);
      this.renderControls();
      const checkpoint = CheckpointStore.load();
      if (checkpoint) this.restore(checkpoint);
      requestAnimationFrame((timestamp) => this.frame(timestamp));
    }

    bindUI() {
      document.querySelector("#start-button").addEventListener("click", () => this.startNewGame());
      document.querySelector("#continue-button").addEventListener("click", () => this.advanceStage());
      document.querySelector("#controls-button").addEventListener("click", () => this.openControls());
      document.querySelector("#controls-back-button").addEventListener("click", () => this.closeControls());
      document.querySelector("#controls-reset-button").addEventListener("click", () => this.restoreDefaultControls());
    }

    handleGlobalInput(event) {
      if (this.capturingBinding || this.controlsOpen) return;
      if (event.code === "Enter") {
        this.audio.unlock();
        if (this.mode === "menu") this.startNewGame();
        else if (this.mode === "paused") this.resume();
        else if (this.mode === "won") this.advanceStage();
      }
      if (event.code === "KeyR" && (this.mode === "playing" || this.mode === "paused")) this.resetStage();
      if (event.code === "KeyN" && this.mode === "won" && this.stageIndex >= STAGES.length - 1) {
        CheckpointStore.clear();
        this.startNewGame();
      }
    }

    openControls() {
      this.capturingBinding = null;
      this.controlsOpen = true;
      this.input.clear();
      this.renderControls();
      this.showOverlay("#menu-screen", false);
      this.showOverlay("#controls-screen", true);
    }

    closeControls() {
      this.capturingBinding = null;
      this.controlsOpen = false;
      this.input.clear();
      this.showOverlay("#controls-screen", false);
      this.showOverlay("#menu-screen", this.mode === "menu");
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
          summary.textContent = `${controlCodeLabel(controls.left)}/${controlCodeLabel(controls.right)} 이동 · ${controlCodeLabel(controls.jump)} 점프 · ${controlCodeLabel(controls.down)} 플랫폼 통과 · ${controlCodeLabel(controls.rope)} 로프 · ${controlCodeLabel(controls.boost)} 당기기`;
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
        ropeHelp.textContent = `방향 키와 로프 키를 함께 누르면 8방향으로 발사합니다. 방향 입력이 없으면 바라보는 쪽으로 발사하고, 당기기 키(${controlCodeLabel(this.controls.p1.boost)} / ${controlCodeLabel(this.controls.p2.boost)})를 누르는 동안 힘이 강해집니다.`;
      }
    }

    startNewGame() {
      this.audio.unlock();
      CheckpointStore.clear();
      this.stageIndex = 0;
      this.loadStage(this.stageIndex);
      this.mode = "playing";
      this.historyController.arm();
    }

    advanceStage() {
      if (this.mode !== "won") return;
      if (this.stageIndex >= STAGES.length - 1) {
        CheckpointStore.clear();
        this.mode = "menu";
        this.loadStage(0);
        return;
      }
      this.stageIndex += 1;
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

    resetStage() {
      this.audio.unlock();
      this.audio.fail();
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

    saveCheckpoint() {
      if (!this.stage || !this.players.length) return;
      CheckpointStore.save(this.serialize());
    }

    serialize() {
      return {
        version: 1,
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
      this.loadStage(snapshot.stageIndex);
      for (const saved of snapshot.players) {
        const player = this.players.find((item) => item.id === saved.id);
        if (!player) continue;
        Object.assign(player, {
          x: saved.x, y: saved.y, vx: saved.vx || 0, vy: saved.vy || 0,
          facing: saved.facing === -1 ? -1 : 1, onGround: Boolean(saved.onGround),
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
        this.updateMovingPlatforms();
        this.updateObjects(delta);
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
        if (direction !== 0) {
          player.vx = clamp(player.vx + direction * PHYSICS.moveAcceleration * delta, -PHYSICS.maxSpeed, PHYSICS.maxSpeed);
          player.facing = direction;
        } else {
          player.vx *= Math.pow(PHYSICS.friction, delta * 60);
          if (Math.abs(player.vx) < 2) player.vx = 0;
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
        if (this.input.wasPressed(controls.down)) {
          player.dropTimer = 0.18;
          player.y += 8;
          player.onGround = false;
        }
        player.dropTimer = Math.max(0, player.dropTimer - delta);
        player.vy += PHYSICS.gravity * delta;

        const previousX = player.x;
        const previousY = player.y;
        player.x += player.vx * delta;
        this.resolveHorizontal(player);
        player.y += player.vy * delta;
        this.resolveVertical(player, previousY);
        if (previousX !== player.x && player.onGround) player.vx *= 0.99;
        player.x = clamp(player.x, 0, this.stage.width - player.width);
        if (player.y > VIEW.height + 160) this.resetStage();
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
        const occupied = this.players.some((player) => intersects(player.bounds, { x: item.x - 4, y: item.y - 18, w: item.w + 8, h: item.h + 20 }))
          || this.crates.some((box) => intersects(box, { x: item.x - 4, y: item.y - 18, w: item.w + 8, h: item.h + 20 }));
        if (occupied && !this.stageState.switches[item.id]) this.audio.beep(660, 0.12, "sine");
        this.stageState.switches[item.id] = occupied;
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
        if (player.vy >= 0 && wasAbove && player.dropTimer <= 0) {
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
          rope.boostLevel = this.input.isDown(controls.boost) ? 1 : 0;
          if (rope.boostLevel > 0 && rope.tension > 2) this.audio.beep(250, 0.02, "square", 0.012);
          if (rope.tension > 0) {
            const dx = (targetCenter.x - ownerCenter.x) / Math.max(rope.currentLength, 1);
            const dy = (targetCenter.y - ownerCenter.y) / Math.max(rope.currentLength, 1);
            const force = (rope.tension * PHYSICS.ropeTensionAcceleration + PHYSICS.ropeBoostAcceleration * rope.boostLevel) * delta;
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
        this.resetStage();
      }
    }

    checkStageResult() {
      if (this.mode !== "playing") return;
      if (this.players.every((player) => intersects(player.bounds, this.stage.exit))) {
        this.mode = "won";
        this.audio.clear();
        this.saveCheckpoint();
      }
    }

    updateCamera() {
      const averageX = this.players.reduce((sum, player) => sum + player.x, 0) / this.players.length;
      this.cameraX = lerp(this.cameraX, clamp(averageX - VIEW.width * 0.42, 0, this.stage.width - VIEW.width), 0.12);
    }

    render() {
      const sky = ctx.createLinearGradient(0, 0, 0, VIEW.height);
      sky.addColorStop(0, "#101a3e");
      sky.addColorStop(0.58, "#1a2850");
      sky.addColorStop(1, "#0e172d");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
      this.drawBackground();
      ctx.save();
      ctx.translate(-this.cameraX, 0);
      this.drawWorld();
      for (const rope of this.ropes) this.drawRope(rope);
      for (const player of this.players) this.drawPlayer(player);
      ctx.restore();
      this.drawHud();
    }

    drawBackground() {
      ctx.save();
      ctx.globalAlpha = 0.35;
      for (let index = 0; index < 9; index += 1) {
        const x = (index * 180 - this.cameraX * 0.18) % (VIEW.width + 220) - 110;
        const y = 115 + (index % 3) * 54;
        ctx.fillStyle = index % 2 ? "#8c9cff" : "#6edbd0";
        ctx.beginPath();
        ctx.arc(x, y, 2 + (index % 3), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#111c39";
      ctx.beginPath();
      ctx.moveTo(0, 390);
      for (let x = 0; x <= VIEW.width; x += 80) ctx.lineTo(x, 330 + ((x / 80) % 3) * 25);
      ctx.lineTo(VIEW.width, VIEW.height);
      ctx.lineTo(0, VIEW.height);
      ctx.closePath();
      ctx.fill();
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
      ctx.fillStyle = moving ? "#586fc2" : item.kind === "ground" ? "#263a68" : "#334b82";
      ctx.fillRect(item.x, item.y, item.w, item.h);
      ctx.fillStyle = moving ? "#87a0ff" : "#6d8edb";
      ctx.fillRect(item.x, item.y, item.w, 4);
      if (moving) {
        ctx.fillStyle = "rgba(145, 160, 255, 0.22)";
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

    renderUI() {
      this.showOverlay("#menu-screen", this.mode === "menu");
      this.showOverlay("#pause-screen", this.mode === "paused");
      this.showOverlay("#clear-screen", this.mode === "won");
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
        const finalStage = this.stageIndex >= STAGES.length - 1;
        document.querySelector("#clear-title").textContent = finalStage ? "모든 구역을 통과했어요!" : `${this.stage.name} 클리어!`;
        document.querySelector("#clear-message").textContent = finalStage ? "두 사람의 호흡이 완벽했습니다." : "다음 구역에는 더 긴 당김이 기다립니다.";
        document.querySelector("#continue-button").innerHTML = finalStage ? "처음부터 다시 <span>Enter</span>" : "다음 스테이지 <span>Enter</span>";
      }
    }
  }

  window.ropeboundGame = new Game();
})();
