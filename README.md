# tgame
A lightweight 2D game engine for the web, built with JavaScript and HTML5 Canvas. Features scenes, game objects, local modules, input handling, and a simple CLI build system.

# TGame Engine

**TGame** is a lightweight 2D game engine for the web, built with JavaScript and HTML5 Canvas.

It provides a simple project structure, a command-line interface, local module imports, scene management, game objects, input handling, and a build system.

## Features

- 2D rendering with HTML5 Canvas
- Scene management
- GameObject system
- Vector mathematics (`Vec2`)
- Keyboard input handling
- Color materials
- Camera 2D
- Local JavaScript module imports
- Library management
- Project generation through CLI
- Build system that generates a playable HTML project
- Pixelated rendering support

## Requirements

- Node.js
- Bash
- Git (for installing remote libraries)

## Installation

Clone the repository:

```bash
git clone https://github.com/ps22c/tgame.git
cd tgame
```

Make the CLI executable:

```bash
chmod +x tgame.sh
```

You can now use the TGame CLI.

## Creating a project

```bash
./tgame.sh new . Hello
```

This generates:

```text
Hello/
├── assets/
│   ├── img/
│   └── sound/
├── build/
├── lib/
├── src/
└── index.json
```

## Project configuration

The `index.json` file contains the project configuration:

```json
{
  "name": "Hello",
  "version": "1.0.0",
  "engine": "1.0.0",
  "scenes": [
    {
      "name": "Main",
      "src": "main.js"
    }
  ],
  "main_scene": "Main",
  "repositories": [],
  "dependencies": []
}
```

## Basic example

### main.js

```javascript
import { Scene, Vec2 } from "lib@engine";
import Player from "player";
import Enemy from "enemy";

const Main = new Scene();

let player;
let enemy;

Main.layout.canvas.resolution = new Vec2(320, 200);
Main.layout.canvas.rendering = "pixelated";

Main.onboot(() => {
    player = new Player();
    enemy = new Enemy();

    Main.add(player);
    Main.add(enemy);

    player.pos = new Vec2(0, 0);
    enemy.pos = new Vec2(100, 100);

    enemy.setProperty("lookat", player);
});

Main.onupdate(() => {
    // Scene updates
});

export default Main;
```

### player.js

```javascript
import {
    GameObject,
    ColorMaterial,
    Vec2,
    Input
} from "lib@engine";

export default class Player extends GameObject {
    constructor() {
        super();

        this.material = new ColorMaterial("#36a2eb");
        this.scale = new Vec2(16, 16);
        this.speed = 100;
    }

    update(delta) {
        const movement = new Vec2(0, 0);

        if (Input.isKeyDown("w") || Input.isKeyDown("ArrowUp"))
            movement.y -= 1;

        if (Input.isKeyDown("s") || Input.isKeyDown("ArrowDown"))
            movement.y += 1;

        if (Input.isKeyDown("a") || Input.isKeyDown("ArrowLeft"))
            movement.x -= 1;

        if (Input.isKeyDown("d") || Input.isKeyDown("ArrowRight"))
            movement.x += 1;

        if (movement.length() > 0) {
            movement.normalize();

            this.pos.x += movement.x * this.speed * delta;
            this.pos.y += movement.y * this.speed * delta;
        }
    }
}
```

### enemy.js

```javascript
import {
    GameObject,
    ColorMaterial,
    Vec2,
    Math2D
} from "lib@engine";

export default class Enemy extends GameObject {
    constructor() {
        super();

        this.material = new ColorMaterial("#e74c3c");
        this.scale = new Vec2(16, 16);
        this.speed = 35;
        this.target = null;
    }

    boot() {
    }

    update(delta) {
        this.target = this.getAttribute("lookat");
        const angle = Math.atan2(this.target.pos.x - this.pos.x, this.target.pos.y - this.pos.y);
        this.pos.x += Math.sin(angle) * this.speed * delta;
        this.pos.y += Math.cos(angle) * this.speed * delta;
    }
}
```

## CLI Commands

| Command | Description |
|---|---|
| `tgame.sh new dir name` | Create a new project |
| `tgame.sh newlib [dir] name` | Create a local library |
| `tgame.sh add scene name [dir]` | Add a scene |
| `tgame.sh del scene name [dir]` | Delete a scene |
| `tgame.sh add repo name url [dir]` | Add a library repository |
| `tgame.sh del repo name [dir]` | Remove a repository |
| `tgame.sh install lib [dir]` | Install a library |
| `tgame.sh remove lib [dir]` | Remove a library |
| `tgame.sh build [dir]` | Build the project |

## Module Imports

TGame supports local module imports.

Import a module from `src/`:

```javascript
import Player from "player";
import Enemy from "enemy";
```

Import using relative paths:

```javascript
import Player from "./player.js";
```

Import the engine:

```javascript
import { Scene, GameObject, Vec2 } from "lib@engine";
```

Import a local library:

```javascript
import Physics from "lib@physics";
```

The build system resolves supported imports and rewrites their paths for the generated project.

## Building

To build your game:

```bash
./tgame.sh build .
```

The generated project is placed inside `build/`:

```text
build/
├── assets/
├── lib/
├── src/
├── engine.js
└── index.html
```

Open `build/index.html` through a local HTTP server to run your game.

For example:

```bash
cd build
python3 -m http.server 8000
```

Then visit:

```text
http://localhost:8000
```
---

**TGame — Create games. Keep it simple.**
