/*
 * TGame Engine - Core 1.0.0
 * Pure JavaScript 2D Game Engine
 * No external dependencies
 */

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

/* =========================================
   VEC2
========================================= */

export class Vec2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    set(x, y) {
        if (x instanceof Vec2) {
            this.x = x.x;
            this.y = x.y;
        } else {
            this.x = x;
            this.y = y;
        }
        return this;
    }

    copy() {
        return new Vec2(this.x, this.y);
    }

    add(v) {
        return new Vec2(this.x + v.x, this.y + v.y);
    }

    sub(v) {
        return new Vec2(this.x - v.x, this.y - v.y);
    }

    multiply(v) {
        if (v instanceof Vec2)
            return new Vec2(this.x * v.x, this.y * v.y);

        return new Vec2(this.x * v, this.y * v);
    }

    divide(v) {
        if (v instanceof Vec2)
            return new Vec2(this.x / v.x, this.y / v.y);

        return new Vec2(this.x / v, this.y / v);
    }

    length() {
        return Math.hypot(this.x, this.y);
    }

    normalize() {
        const len = this.length();

        if (!len) return new Vec2();

        return new Vec2(this.x / len, this.y / len);
    }

    distance(v) {
        return Math.hypot(
            v.x - this.x,
            v.y - this.y
        );
    }

    dot(v) {
        return this.x * v.x + this.y * v.y;
    }

    angle() {
        return Math.atan2(this.y, this.x);
    }

    rotate(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        return new Vec2(
            this.x * cos - this.y * sin,
            this.x * sin + this.y * cos
        );
    }

    lerp(v, t) {
        return new Vec2(
            this.x + (v.x - this.x) * t,
            this.y + (v.y - this.y) * t
        );
    }

    equals(v) {
        return this.x === v.x && this.y === v.y;
    }

    static zero() {
        return new Vec2(0, 0);
    }

    static one() {
        return new Vec2(1, 1);
    }

    static fromAngle(angle, length = 1) {
        return new Vec2(
            Math.cos(angle) * length,
            Math.sin(angle) * length
        );
    }

    static distance(a, b) {
        return a.distance(b);
    }
}

/* =========================================
   RECT
========================================= */

export class Rect {
    constructor(x = 0, y = 0, width = 0, height = 0) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    contains(point) {
        return (
            point.x >= this.x &&
            point.y >= this.y &&
            point.x <= this.x + this.width &&
            point.y <= this.y + this.height
        );
    }

    intersects(rect) {
        return (
            this.x < rect.x + rect.width &&
            this.x + this.width > rect.x &&
            this.y < rect.y + rect.height &&
            this.y + this.height > rect.y
        );
    }

    get center() {
        return new Vec2(
            this.x + this.width / 2,
            this.y + this.height / 2
        );
    }
}

/* =========================================
   COLOR
========================================= */

export class Color {
    constructor(r = 255, g = 255, b = 255, a = 1) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }

    toString() {
        return `rgba(${this.r},${this.g},${this.b},${this.a})`;
    }

    static fromHex(hex) {
        const value = hex.replace("#", "");

        const normalized = value.length === 3
            ? value.split("").map(c => c + c).join("")
            : value;

        const number = parseInt(normalized, 16);

        return new Color(
            (number >> 16) & 255,
            (number >> 8) & 255,
            number & 255
        );
    }
}

/* =========================================
   SIGNAL
========================================= */

export class Signal {
    constructor() {
        this.listeners = [];
    }

    connect(callback) {
        this.listeners.push(callback);

        return () => this.disconnect(callback);
    }

    disconnect(callback) {
        this.listeners = this.listeners.filter(
            fn => fn !== callback
        );
    }

    emit(...args) {
        for (const callback of [...this.listeners]) {
            callback(...args);
        }
    }

    clear() {
        this.listeners = [];
    }
}

/* =========================================
   INPUT
========================================= */

class InputManager {
    constructor() {
        this.keysDown = new Set();
        this.keysPressed = new Set();
        this.keysReleased = new Set();

        this.mouseDown = new Set();
        this.mousePressed = new Set();
        this.mouseReleased = new Set();

        this.mousePosition = new Vec2();
        this.mouseDelta = new Vec2();
        this.wheel = new Vec2();

        this.initialized = false;
    }

    attach(canvas) {
        if (this.initialized || typeof window === "undefined")
            return;

        window.addEventListener("keydown", event => {
            const key = event.key.toLowerCase();

            if (!this.keysDown.has(key))
                this.keysPressed.add(key);

            this.keysDown.add(key);
        });

        window.addEventListener("keyup", event => {
            const key = event.key.toLowerCase();

            this.keysDown.delete(key);
            this.keysReleased.add(key);
        });

        window.addEventListener("blur", () => {
            this.keysDown.clear();
            this.mouseDown.clear();
        });

        canvas.addEventListener("pointerdown", event => {
            this.mouseDown.add(event.button);
            this.mousePressed.add(event.button);
        });

        canvas.addEventListener("pointerup", event => {
            this.mouseDown.delete(event.button);
            this.mouseReleased.add(event.button);
        });

        canvas.addEventListener("pointermove", event => {
            const rect = canvas.getBoundingClientRect();

            const position = new Vec2(
                (event.clientX - rect.left) *
                    canvas.width / rect.width,
                (event.clientY - rect.top) *
                    canvas.height / rect.height
            );

            this.mouseDelta = position.sub(this.mousePosition);
            this.mousePosition = position;
        });

        canvas.addEventListener("wheel", event => {
            this.wheel = new Vec2(
                event.deltaX,
                event.deltaY
            );
        });

        this.initialized = true;
    }

    endFrame() {
        this.keysPressed.clear();
        this.keysReleased.clear();

        this.mousePressed.clear();
        this.mouseReleased.clear();

        this.mouseDelta.set(0, 0);
        this.wheel.set(0, 0);
    }

    keyboard(key) {
        return new KeyInput(key.toLowerCase(), this);
    }

    mouse(button = 0) {
        return new MouseInput(button, this);
    }
}

class KeyInput {
    constructor(key, manager) {
        this.key = key;
        this.manager = manager;
    }

    isDown() {
        return this.manager.keysDown.has(this.key);
    }

    isPressed() {
        return this.manager.keysPressed.has(this.key);
    }

    isReleased() {
        return this.manager.keysReleased.has(this.key);
    }
}

class MouseInput {
    constructor(button, manager) {
        this.button = button;
        this.manager = manager;
    }

    isDown() {
        return this.manager.mouseDown.has(this.button);
    }

    isPressed() {
        return this.manager.mousePressed.has(this.button);
    }

    isReleased() {
        return this.manager.mouseReleased.has(this.button);
    }
}

const inputManager = new InputManager();

export const Input = {
    Keyboard(key) {
        return inputManager.keyboard(key);
    },

    Mouse(button = 0) {
        return inputManager.mouse(button);
    },

    get mousePosition() {
        return inputManager.mousePosition.copy();
    },

    get mouseDelta() {
        return inputManager.mouseDelta.copy();
    },

    get wheel() {
        return inputManager.wheel.copy();
    }
};

/* =========================================
   MATERIALS
========================================= */

export class Material {
    constructor() {
        this.opacity = 1;
        this.visible = true;
    }

    draw() {}
}

export class ColorMaterial extends Material {
    constructor(color = "#ffffff") {
        super();
        this.color = color;
    }

    draw(renderer, object) {
        const ctx = renderer.ctx;

        ctx.globalAlpha *= this.opacity;
        ctx.fillStyle = this.color;

        ctx.fillRect(
            -object.scale.x / 2,
            -object.scale.y / 2,
            object.scale.x,
            object.scale.y
        );
    }
}

export class SpriteMaterial extends Material {
    constructor(source) {
        super();

        this.image = new Image();
        this.loaded = false;

        this.image.onload = () => {
            this.loaded = true;
        };

        this.image.src = source;
    }

    draw(renderer, object) {
        if (!this.loaded) return;

        renderer.ctx.drawImage(
            this.image,
            -object.scale.x / 2,
            -object.scale.y / 2,
            object.scale.x,
            object.scale.y
        );
    }
}

/* =========================================
   CAMERA
========================================= */

export class Camera2D {
    constructor() {
        this.pos = new Vec2();
        this.zoom = 1;
        this.rotation = 0;

        this.target = null;
        this.followSpeed = 0;
    }

    lookAt(target) {
        this.pos.set(target);
    }

    follow(target, speed = 0) {
        this.target = target;
        this.followSpeed = speed;
    }

    update(dt) {
        if (!this.target) return;

        const target = this.target.pos || this.target;

        if (this.followSpeed <= 0) {
            this.pos.set(target);
        } else {
            this.pos.set(
                this.pos.lerp(
                    target,
                    1 - Math.exp(-this.followSpeed * dt)
                )
            );
        }
    }
}

/* =========================================
   GAME OBJECT
========================================= */

export class GameObject {
    constructor() {
        this.name = this.constructor.name;

        this.pos = new Vec2();
        this.scale = new Vec2(1, 1);

        this.rotation = 0;

        this.material = null;

        this.visible = true;
        this.active = true;

        this.opacity = 1;
        this.zIndex = 0;

        this.parent = null;
        this.children = [];

        this.scene = null;

        this.destroyed = false;
        this._booted = false;

        this.attributes = new Map();
    }

    boot() {}

    update(dt) {}

    draw(renderer) {
        this.material?.draw(renderer, this);
    }

    setProperty(name, value) {
        this.attributes.set(name, value);
        return this;
    }

    getAttribute(name, fallback = undefined) {
        return this.attributes.has(name)
            ? this.attributes.get(name)
            : fallback;
    }

    addChild(object) {
        if (!(object instanceof GameObject))
            throw new TypeError("Child must be a GameObject");

        object.parent?.removeChild(object);

        object.parent = this;
        object.scene = this.scene;

        this.children.push(object);

        if (this.scene)
            this.scene._bootObject(object);

        return object;
    }

    removeChild(object) {
        const index = this.children.indexOf(object);

        if (index !== -1) {
            this.children.splice(index, 1);

            object.parent = null;
            object.scene = null;
        }

        return object;
    }

    getGlobalPosition() {
        let position = this.pos.copy();
        let parent = this.parent;

        while (parent) {
            position = position.add(parent.pos);
            parent = parent.parent;
        }

        return position;
    }

    getBounds() {
        const position = this.getGlobalPosition();

        return new Rect(
            position.x - Math.abs(this.scale.x) / 2,
            position.y - Math.abs(this.scale.y) / 2,
            Math.abs(this.scale.x),
            Math.abs(this.scale.y)
        );
    }

    intersects(object) {
        return this.getBounds().intersects(
            object.getBounds()
        );
    }

    destroy() {
        if (this.destroyed) return;

        for (const child of [...this.children])
            child.destroy();

        this.parent?.removeChild(this);
        this.scene?.remove(this);

        this.destroyed = true;
    }
}

/* =========================================
   SCENE
========================================= */

export class Scene {
    constructor() {
        this.name = "Scene";

        this.objects = [];

        this.layout = {
            canvas: {
                resolution: new Vec2(320, 200),
                rendering: "smooth",
                background: "#000000",
                scale: "fit"
            }
        };

        this.camera = new Camera2D();

        this.paused = false;

        this._bootCallbacks = [];
        this._updateCallbacks = [];
        this._drawCallbacks = [];

        this._started = false;
        this._game = null;
    }

    onboot(callback) {
        this._bootCallbacks.push(callback);
        return this;
    }

    onupdate(callback) {
        this._updateCallbacks.push(callback);
        return this;
    }

    ondraw(callback) {
        this._drawCallbacks.push(callback);
        return this;
    }

    add(object) {
        if (!(object instanceof GameObject))
            throw new TypeError("Expected GameObject");

        if (object.scene === this)
            return object;

        object.parent?.removeChild(object);
        object.scene?.remove(object);

        object.scene = this;

        this.objects.push(object);

        if (this._started)
            this._bootObject(object);

        return object;
    }

    remove(object) {
        const index = this.objects.indexOf(object);

        if (index !== -1) {
            this.objects.splice(index, 1);
            object.scene = null;
        }

        return object;
    }

    find(name) {
        const visit = objects => {
            for (const object of objects) {
                if (object.name === name)
                    return object;

                const found = visit(object.children);

                if (found) return found;
            }

            return null;
        };

        return visit(this.objects);
    }

    _bootObject(object) {
        if (object._booted) return;

        object._booted = true;
        object.scene = this;

        try {
            object.boot();
        } catch (error) {
            console.error("[TGame] Object boot error:", error);
        }

        for (const child of object.children)
            this._bootObject(child);
    }

    _start() {
        if (this._started) return;

        this._started = true;

        for (const callback of this._bootCallbacks)
            callback();

        for (const object of this.objects)
            this._bootObject(object);
    }

    _update(dt) {
        if (this.paused) return;

        this.camera.update(dt);

        for (const callback of this._updateCallbacks)
            callback(dt);

        const updateObject = object => {
            if (!object.active || object.destroyed)
                return;

            object.update(dt);

            for (const child of [...object.children])
                updateObject(child);
        };

        for (const object of [...this.objects])
            updateObject(object);
    }

    _draw(renderer) {
        renderer.beginScene(this);

        const drawObject = object => {
            if (!object.visible || object.destroyed)
                return;

            renderer.drawObject(object);

            for (const child of object.children)
                drawObject(child);
        };

        const sorted = [...this.objects].sort(
            (a, b) => a.zIndex - b.zIndex
        );

        for (const object of sorted)
            drawObject(object);

        for (const callback of this._drawCallbacks)
            callback(renderer);

        renderer.endScene();
    }
}

/* =========================================
   RENDERER
========================================= */

export class Renderer2D {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        if (!this.ctx)
            throw new Error("Canvas 2D is unavailable");
    }

    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
    }

    beginScene(scene) {
        const ctx = this.ctx;
        const camera = scene.camera;

        ctx.save();

        ctx.setTransform(1, 0, 0, 1, 0, 0);

        ctx.globalAlpha = 1;
        ctx.fillStyle = scene.layout.canvas.background;

        ctx.fillRect(
            0,
            0,
            this.canvas.width,
            this.canvas.height
        );

        ctx.translate(
            this.canvas.width / 2,
            this.canvas.height / 2
        );

        ctx.scale(camera.zoom, camera.zoom);
        ctx.rotate(-camera.rotation);

        ctx.translate(
            -camera.pos.x,
            -camera.pos.y
        );
    }

    drawObject(object) {
        const ctx = this.ctx;

        ctx.save();

        ctx.translate(object.pos.x, object.pos.y);
        ctx.rotate(object.rotation);

        ctx.globalAlpha *= object.opacity;

        object.draw(this);

        ctx.restore();
    }

    endScene() {
        this.ctx.restore();
    }
}

/* =========================================
   TIMER
========================================= */

export class Timer {
    constructor(duration = 1, callback = null, options = {}) {
        this.duration = duration;
        this.callback = callback;

        this.repeat = !!options.repeat;

        this.elapsed = 0;
        this.running = options.autostart !== false;
        this.finished = false;
    }

    start() {
        this.elapsed = 0;
        this.finished = false;
        this.running = true;

        return this;
    }

    stop() {
        this.running = false;
        return this;
    }

    update(dt) {
        if (!this.running || this.finished)
            return;

        this.elapsed += dt;

        if (this.elapsed >= this.duration) {
            if (this.repeat && this.duration > 0) {
                this.elapsed %= this.duration;
            } else {
                this.elapsed = this.duration;
                this.running = false;
                this.finished = true;
            }

            this.callback?.(this);
        }
    }

    get progress() {
        return this.duration
            ? clamp(this.elapsed / this.duration, 0, 1)
            : 1;
    }
}

/* =========================================
   AUDIO
========================================= */

export class AudioClip {
    constructor(source, options = {}) {
        this.audio = new Audio(source);

        this.audio.loop = !!options.loop;
        this.audio.volume = options.volume ?? 1;
    }

    play() {
        this.audio.currentTime = 0;

        return this.audio.play();
    }

    pause() {
        this.audio.pause();
    }

    stop() {
        this.audio.pause();
        this.audio.currentTime = 0;
    }

    setVolume(volume) {
        this.audio.volume = clamp(volume, 0, 1);
    }
}

/* =========================================
   GAME
========================================= */

export class Game {
    constructor(options = {}) {
        this.options = options;

        this.canvas = options.canvas || null;
        this.renderer = null;

        this.currentScene = null;
        this.scenes = new Map();

        this.running = false;

        this.time = 0;
        this.deltaTime = 0;

        this.frame = 0;
        this.fps = 0;

        this.maxDelta = options.maxDelta ?? 0.05;

        this._lastTime = 0;
        this._raf = 0;

        this._boundLoop = time => this._loop(time);
    }

    _createCanvas() {
        if (this.canvas) return this.canvas;

        this.canvas = document.createElement("canvas");

        this.canvas.id = "tgame-canvas";

        this.canvas.style.display = "block";
        this.canvas.style.outline = "none";
        this.canvas.style.touchAction = "none";

        (this.options.parent || document.body)
            .appendChild(this.canvas);

        return this.canvas;
    }

    _configureCanvas(scene) {
        const config = scene.layout.canvas;

        const width = config.resolution.x;
        const height = config.resolution.y;

        this.renderer.resize(width, height);

        this.canvas.style.imageRendering =
            config.rendering === "pixelated"
                ? "pixelated"
                : "auto";

        this.canvas.tabIndex = 0;
    }

    addScene(name, scene) {
        this.scenes.set(name, scene);

        scene.name = name;
        scene._game = this;

        return scene;
    }

    async start(scene) {
        if (typeof scene === "string")
            scene = this.scenes.get(scene);

        if (!(scene instanceof Scene))
            throw new TypeError("Invalid scene");

        this.stop();

        this._createCanvas();

        this.renderer = new Renderer2D(this.canvas);

        inputManager.attach(this.canvas);

        this.currentScene = scene;
        scene._game = this;

        this._configureCanvas(scene);

        scene._start();

        this.running = true;
        this._lastTime = 0;

        this._raf = requestAnimationFrame(
            this._boundLoop
        );

        return this;
    }

    changeScene(scene) {
        if (typeof scene === "string")
            scene = this.scenes.get(scene);

        if (!(scene instanceof Scene))
            throw new TypeError("Invalid scene");

        this.currentScene = scene;

        scene._started = false;

        this._configureCanvas(scene);
        scene._start();

        return scene;
    }

    _loop(timestamp) {
        if (!this.running) return;

        if (!this._lastTime)
            this._lastTime = timestamp;

        const dt = clamp(
            (timestamp - this._lastTime) / 1000,
            0,
            this.maxDelta
        );

        this._lastTime = timestamp;

        this.deltaTime = dt;
        this.time += dt;

        this.frame++;

        if (this.currentScene) {
            this.currentScene._update(dt);
            this.currentScene._draw(this.renderer);
        }

        inputManager.endFrame();

        this._raf = requestAnimationFrame(
            this._boundLoop
        );
    }

    stop() {
        this.running = false;

        if (this._raf)
            cancelAnimationFrame(this._raf);

        this._raf = 0;

        return this;
    }

    pause() {
        if (this.currentScene)
            this.currentScene.paused = true;
    }

    resume() {
        if (this.currentScene)
            this.currentScene.paused = false;
    }

    fullscreen() {
        return this.canvas?.requestFullscreen();
    }

    destroy() {
        this.stop();

        this.canvas?.remove();

        this.canvas = null;
        this.renderer = null;

        this.currentScene = null;
        this.scenes.clear();
    }
}

/* =========================================
   TIME
========================================= */

let defaultGame = null;

export const Time = {
    get delta() {
        return defaultGame?.deltaTime || 0;
    },

    get elapsed() {
        return defaultGame?.time || 0;
    },

    get fps() {
        return defaultGame?.fps || 0;
    }
};

/* =========================================
   MATH UTILITIES
========================================= */

export const Math2D = {
    clamp,

    lerp(a, b, t) {
        return a + (b - a) * t;
    },

    degToRad(degrees) {
        return degrees * Math.PI / 180;
    },

    radToDeg(radians) {
        return radians * 180 / Math.PI;
    },

    random(min = 0, max = 1) {
        return Math.random() * (max - min) + min;
    },

    randomInt(min, max) {
        return Math.floor(
            Math.random() * (max - min + 1)
        ) + min;
    },

    distance(a, b) {
        return Math.hypot(
            b.x - a.x,
            b.y - a.y
        );
    },

    angle(a, b) {
        return Math.atan2(
            b.y - a.y,
            b.x - a.x
        );
    }
};

/* =========================================
   ENGINE RUNNER
========================================= */

export function run(scene, options = {}) {
    defaultGame = new Game(options);

    return defaultGame.start(scene);
}

export function getGame() {
    return defaultGame;
}

/* =========================================
   DEFAULT EXPORT
========================================= */

export default {
    Vec2,
    Rect,
    Color,
    Signal,

    Input,

    Material,
    ColorMaterial,
    SpriteMaterial,

    Camera2D,

    GameObject,
    Scene,

    Renderer2D,

    Timer,
    AudioClip,

    Game,
    Time,

    Math2D,

    run,
    getGame
};
