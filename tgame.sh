
#!/usr/bin/env bash

# ============================================
# TGame CLI
# Version: 1.0.0
# ============================================

set -Eeuo pipefail

TGAME_VERSION="1.0.0"

# Directory containing this script
TGAME_HOME="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ENGINE_FILE="$TGAME_HOME/engine.js"

COMMAND="${1:-help}"

# ============================================
# UTILITIES
# ============================================

error() {
    echo "[TGame] ERROR: $*" >&2
    exit 1
}

info() {
    echo "[TGame] $*"
}

success() {
    echo "[TGame] ✓ $*"
}

require_node() {
    command -v node >/dev/null 2>&1 ||
        error "Node.js is required."
}

require_project() {
    local dir="$1"

    [[ -f "$dir/index.json" ]] ||
        error "No TGame project found in: $dir"
}

# ============================================
# HELP
# ============================================

help() {
    cat <<EOF
TGame CLI $TGAME_VERSION

Usage:

  tgame.sh new dir project-name

  tgame.sh newlib dir libname

  tgame.sh add scene name [dir]
  tgame.sh del scene name [dir]

  tgame.sh add repo name url [dir]
  tgame.sh del repo name [dir]

  tgame.sh install lib [dir]
  tgame.sh remove lib [dir]

  tgame.sh build [dir]

Examples:

  tgame.sh new . Hello

  tgame.sh newlib . physics2d

  tgame.sh add scene Menu
  tgame.sh del scene Menu

  tgame.sh add repo official https://github.com/ps22c/tgame-repo
  tgame.sh del repo official

  tgame.sh install physics2d
  tgame.sh remove physics2d

  tgame.sh build

EOF
}

# ============================================
# NODE PROJECT MANAGER
# ============================================

project_manager() {
    node - "$@" <<'NODE'

const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);

const action = args[0];
const projectDir = path.resolve(args[1] || ".");

const indexFile = path.join(projectDir, "index.json");

function fail(message) {
    console.error("[TGame] ERROR:", message);
    process.exit(1);
}

function readProject() {
    if (!fs.existsSync(indexFile))
        fail("index.json not found.");

    try {
        return JSON.parse(fs.readFileSync(indexFile, "utf8"));
    } catch {
        fail("Invalid index.json.");
    }
}

function writeProject(data) {
    fs.writeFileSync(
        indexFile,
        JSON.stringify(data, null, 2) + "\n"
    );
}

function mkdir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

function safeName(name) {
    if (!name || !/^[a-zA-Z0-9_-]+$/.test(name))
        fail("Invalid name: " + name);

    return name;
}

function createProject(dir, name) {
    safeName(name);

    if (fs.existsSync(path.join(dir, "index.json")))
        fail("A project already exists in this directory.");

    mkdir(dir);

    mkdir(path.join(dir, "assets/img"));
    mkdir(path.join(dir, "assets/sound"));
    mkdir(path.join(dir, "build"));
    mkdir(path.join(dir, "lib"));
    mkdir(path.join(dir, "src"));

    const project = {
        name,
        version: "1.0.0",
        engine: "1.0.0",
        scenes: [
            {
                name: "Main",
                src: "main.js"
            }
        ],
        main_scene: "Main",
        repositories: [],
        dependencies: []
    };

    writeProject(project);

    fs.writeFileSync(
        path.join(dir, "src/main.js"),
        `import { Scene, Vec2 } from "lib@engine";

const Main = new Scene();

Main.layout.canvas.resolution = new Vec2(320, 200);
Main.layout.canvas.rendering = "pixelated";

Main.onboot(() => {
    // Initialize your game here.
});

Main.onupdate((dt) => {
    // Update your game here.
});
`
    );

    console.log("[TGame] Project created:", name);
}

function newLib(dir, name) {
    safeName(name);

    const project = readProject();

    const libDir = path.join(dir, "lib", name);

    if (fs.existsSync(libDir))
        fail("Library already exists: " + name);

    mkdir(path.join(libDir, "src"));

    const manifest = {
        name,
        version: "1.0.0",
        main: "src/index.js",
        dependencies: []
    };

    fs.writeFileSync(
        path.join(libDir, "plugin.json"),
        JSON.stringify(manifest, null, 2) + "\n"
    );

    fs.writeFileSync(
        path.join(libDir, "src/index.js"),
        `// ${name} plugin

export function initialize() {
    // Plugin initialization
}
`
    );

    if (!project.dependencies.includes(name)) {
        project.dependencies.push(name);
        writeProject(project);
    }

    console.log("[TGame] Library created:", name);
}

function addScene(dir, name) {
    safeName(name);

    const project = readProject();

    if (project.scenes.some(scene => scene.name === name))
        fail("Scene already exists: " + name);

    const filename = name.toLowerCase() + ".js";

    project.scenes.push({
        name,
        src: filename
    });

    writeProject(project);

    fs.writeFileSync(
        path.join(dir, "src", filename),
        `import { Scene, Vec2 } from "lib@engine";

const ${name} = new Scene();

${name}.onboot(() => {
    // Scene initialization
});

${name}.onupdate((dt) => {
    // Scene update
});

export default ${name};
`
    );

    console.log("[TGame] Scene added:", name);
}

function deleteScene(dir, name) {
    const project = readProject();

    if (project.main_scene === name)
        fail("Cannot delete the main scene.");

    const index = project.scenes.findIndex(
        scene => scene.name === name
    );

    if (index === -1)
        fail("Scene not found: " + name);

    const scene = project.scenes[index];

    project.scenes.splice(index, 1);

    writeProject(project);

    const filename = path.resolve(dir, "src", scene.src);

    if (filename.startsWith(path.resolve(dir, "src") + path.sep))
        fs.rmSync(filename, { force: true });

    console.log("[TGame] Scene deleted:", name);
}

function addRepo(dir, name, url) {
    const project = readProject();

    if (!name || !url)
        fail("Repository name and URL are required.");

    if (project.repositories.some(repo =>
        typeof repo === "string"
            ? repo === url
            : repo.name === name
    )) {
        fail("Repository already exists.");
    }

    project.repositories.push({
        name,
        url
    });

    writeProject(project);

    console.log("[TGame] Repository added:", name);
}

function deleteRepo(dir, name) {
    const project = readProject();

    const index = project.repositories.findIndex(repo =>
        typeof repo === "string"
            ? repo === name
            : repo.name === name
    );

    if (index === -1)
        fail("Repository not found: " + name);

    project.repositories.splice(index, 1);

    writeProject(project);

    console.log("[TGame] Repository removed:", name);
}

switch (action) {
    case "new":
        createProject(
            path.resolve(args[1]),
            args[2]
        );
        break;

    case "newlib":
        newLib(projectDir, args[2]);
        break;

    case "add-scene":
        addScene(projectDir, args[2]);
        break;

    case "del-scene":
        deleteScene(projectDir, args[2]);
        break;

    case "add-repo":
        addRepo(projectDir, args[2], args[3]);
        break;

    case "del-repo":
        deleteRepo(projectDir, args[2]);
        break;

    default:
        fail("Unknown project operation: " + action);
}

NODE
}

# ============================================
# INSTALL LIBRARY
# ============================================

install_lib() {
    local lib="$1"
    local dir="$2"

    require_project "$dir"

    [[ -n "$lib" ]] || error "Library name required."

    local project_file="$dir/index.json"

    local url

    url="$(node -e '
        const p = require(process.argv[1]);
        const repo = p.repositories.find(r =>
            typeof r === "object" && r.url
        );
        console.log(repo ? repo.url : "");
    ' "$project_file")"

    [[ -n "$url" ]] ||
        error "No repository configured."

    mkdir -p "$dir/lib"

    local destination="$dir/lib/$lib"

    [[ ! -e "$destination" ]] ||
        error "Library already installed: $lib"

    local clone_url="${url%/}/$lib.git"

    info "Installing $lib..."

    if ! git clone --depth 1 "$clone_url" "$destination"; then
        rm -rf "$destination"
        error "Could not install $lib from $clone_url"
    fi

    [[ -f "$destination/plugin.json" ]] ||
        error "Invalid plugin: plugin.json not found."

    node - "$project_file" "$lib" <<'NODE'
const fs = require("fs");
const [file, name] = process.argv.slice(2);
const p = JSON.parse(fs.readFileSync(file, "utf8"));

if (!p.dependencies.includes(name))
    p.dependencies.push(name);

fs.writeFileSync(file, JSON.stringify(p, null, 2) + "\n");
NODE

    success "Installed $lib"
}

# ============================================
# REMOVE LIBRARY
# ============================================

remove_lib() {
    local lib="$1"
    local dir="$2"

    require_project "$dir"

    [[ -n "$lib" ]] || error "Library name required."

    local destination="$dir/lib/$lib"

    [[ -d "$destination" ]] ||
        error "Library not installed: $lib"

    rm -rf "$destination"

    node - "$dir/index.json" "$lib" <<'NODE'
const fs = require("fs");
const [file, name] = process.argv.slice(2);
const p = JSON.parse(fs.readFileSync(file, "utf8"));

p.dependencies = p.dependencies.filter(x => x !== name);

fs.writeFileSync(file, JSON.stringify(p, null, 2) + "\n");
NODE

    success "Removed $lib"
}

# ============================================
# BUILD
# ============================================

build_project() {
    local dir="$1"

    require_node
    require_project "$dir"

    [[ -f "$ENGINE_FILE" ]] ||
        error "engine.js not found beside tgame.sh."

    node - "$dir" "$ENGINE_FILE" <<'NODE'

const fs = require("fs");
const path = require("path");

const projectDir = path.resolve(process.argv[2]);
const engineFile = path.resolve(process.argv[3]);

const buildDir = path.join(projectDir, "build");
const srcDir = path.join(projectDir, "src");
const libDir = path.join(projectDir, "lib");

function fail(message) {
    console.error("[TGame] BUILD ERROR:", message);
    process.exit(1);
}

function readJSON(file) {
    try {
        return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (error) {
        fail("Cannot read " + file + ": " + error.message);
    }
}

const project = readJSON(
    path.join(projectDir, "index.json")
);

if (!project.scenes || !project.scenes.length)
    fail("Project has no scenes.");

const mainScene = project.scenes.find(
    scene => scene.name === project.main_scene
);

if (!mainScene)
    fail("Main scene not found: " + project.main_scene);

fs.rmSync(buildDir, {
    recursive: true,
    force: true
});

fs.mkdirSync(buildDir, {
    recursive: true
});

fs.copyFileSync(
    engineFile,
    path.join(buildDir, "engine.js")
);

// --------------------------------------------
// Copy directories
// --------------------------------------------

function copyDirectory(source, destination) {
    if (!fs.existsSync(source)) return;

    fs.cpSync(source, destination, {
        recursive: true
    });
}

copyDirectory(srcDir, path.join(buildDir, "src"));
copyDirectory(libDir, path.join(buildDir, "lib"));

copyDirectory(
    path.join(projectDir, "assets"),
    path.join(buildDir, "assets")
);

// --------------------------------------------
// Module resolver
// --------------------------------------------

function resolveModule(specifier, importer) {
    if (specifier === "lib@engine")
        return path.join(buildDir, "engine.js");

    if (specifier.startsWith("lib@")) {
        const name = specifier.slice(4);

        return findFile([
            path.join(libDir, name, "src/index.js"),
            path.join(libDir, name, "index.js"),
            path.join(libDir, name + ".js")
        ], specifier);
    }

    if (specifier.startsWith("./") ||
        specifier.startsWith("../")) {

        const base = path.resolve(
            path.dirname(importer),
            specifier
        );

        return findFile([
            base,
            base + ".js",
            path.join(base, "index.js")
        ], specifier);
    }

    return findFile([
        path.join(srcDir, specifier + ".js"),
        path.join(srcDir, specifier, "index.js"),
        path.join(libDir, specifier, "src/index.js"),
        path.join(libDir, specifier, "index.js"),
        path.join(libDir, specifier + ".js")
    ], specifier);
}

function findFile(candidates, specifier) {
    for (const candidate of candidates) {
        if (fs.existsSync(candidate) &&
            fs.statSync(candidate).isFile()) {
            return candidate;
        }
    }

    fail("Cannot resolve import: " + specifier);
}

// --------------------------------------------
// Rewrite JavaScript imports
// --------------------------------------------

function outputPath(source) {
    if (source === path.join(buildDir, "engine.js"))
        return source;

    const relative = path.relative(projectDir, source);

    return path.join(buildDir, relative);
}

function relativeImport(from, to) {
    let relative = path.relative(
        path.dirname(from),
        to
    ).split(path.sep).join("/");

    if (!relative.startsWith("."))
        relative = "./" + relative;

    return relative;
}

function rewriteImports(source, importer, output) {
    const importRegex =
        /((?:import|export)\s+(?:[\s\S]*?\s+from\s*)?)(["'])([^"']+)\2/g;

    return source.replace(
        importRegex,
        (match, prefix, quote, specifier) => {
            const resolved = resolveModule(
                specifier,
                importer
            );

            const target = outputPath(resolved);

            return prefix + quote +
                relativeImport(output, target) +
                quote;
        }
    );
}

// --------------------------------------------
// Process JS files
// --------------------------------------------

function walk(directory) {
    if (!fs.existsSync(directory)) return [];

    let result = [];

    for (const entry of fs.readdirSync(directory, {
        withFileTypes: true
    })) {
        const full = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            result.push(...walk(full));
        } else if (entry.name.endsWith(".js")) {
            result.push(full);
        }
    }

    return result;
}

const files = [
    ...walk(srcDir),
    ...walk(libDir)
];

for (const file of files) {
    const destination = outputPath(file);

    let code = fs.readFileSync(destination, "utf8");

    code = rewriteImports(code, file, destination);

    fs.writeFileSync(destination, code);
}

// --------------------------------------------
// Main scene entry
// --------------------------------------------

const mainSource = path.resolve(
    srcDir,
    mainScene.src
);

if (!mainSource.startsWith(srcDir + path.sep))
    fail("Main scene source must be inside src/.");

if (!fs.existsSync(mainSource))
    fail("Main scene file not found: " + mainScene.src);

const mainOutput = outputPath(mainSource);

let mainCode = fs.readFileSync(mainOutput, "utf8");

if (!/\bexport\s+default\b/.test(mainCode)) {
    const identifier = project.main_scene;

    const declaration = new RegExp(
        "\\b(?:const|let|var)\\s+" +
        identifier +
        "\\s*=\\s*new\\s+Scene\\s*\\("
    );

    if (!declaration.test(mainCode)) {
        fail(
            "Main scene must export default its Scene instance, " +
            "or declare: const " + identifier + " = new Scene();"
        );
    }

    mainCode += "\n\nexport default " +
        identifier + ";\n";

    fs.writeFileSync(mainOutput, mainCode);
}

// --------------------------------------------
// Generate HTML
// --------------------------------------------

const mainRelative = relativeImport(
    path.join(buildDir, "index.html"),
    mainOutput
);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHTML(project.name)}</title>
    <style>
        * {
            box-sizing: border-box;
        }

        html, body {
            margin: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            background: #000;
        }

        body {
            display: flex;
            align-items: center;
            justify-content: center;
        }

        canvas {
            display: block;
            width: 100vw;
            height: 100vh;
        }
    </style>
</head>
<body>
    <script type="module">
        import Main from "${mainRelative}";
        import { run } from "./engine.js";

        run(Main);
    </script>
</body>
</html>
`;

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

fs.writeFileSync(
    path.join(buildDir, "index.html"),
    html
);

console.log("[TGame] Build completed!");
console.log("[TGame] Output:", buildDir);

NODE

    success "Build completed."
}

# ============================================
# COMMAND DISPATCHER
# ============================================

case "$COMMAND" in

    help|-h|--help)
        help
        ;;

    version|-v|--version)
        echo "TGame $TGAME_VERSION"
        ;;

    new)
        [[ $# -ge 3 ]] ||
            error "Usage: tgame.sh new dir project-name"

        require_node

        project_manager new "$2" "$3"
        ;;

    newlib)
        [[ $# -ge 2 ]] ||
            error "Usage: tgame.sh newlib dir libname"

        require_node

        project_manager newlib "${2:-.}" "${3:-}"
        ;;

    add)
        [[ $# -ge 3 ]] ||
            error "Usage: tgame.sh add scene|repo ..."

        require_node

        case "$2" in
            scene)
                project_manager add-scene "${4:-.}" "$3"
                ;;
            repo)
                [[ $# -ge 4 ]] ||
                    error "Usage: tgame.sh add repo name url [dir]"

                project_manager add-repo "${5:-.}" "$3" "$4"
                ;;
            *)
                error "Unknown add target: $2"
                ;;
        esac
        ;;

    del)
        [[ $# -ge 3 ]] ||
            error "Usage: tgame.sh del scene|repo ..."

        require_node

        case "$2" in
            scene)
                project_manager del-scene "${4:-.}" "$3"
                ;;
            repo)
                project_manager del-repo "${4:-.}" "$3"
                ;;
            *)
                error "Unknown del target: $2"
                ;;
        esac
        ;;

    install)
        [[ $# -ge 2 ]] ||
            error "Usage: tgame.sh install lib [dir]"

        install_lib "$2" "${3:-.}"
        ;;

    remove)
        [[ $# -ge 2 ]] ||
            error "Usage: tgame.sh remove lib [dir]"

        remove_lib "$2" "${3:-.}"
        ;;

    build)
        build_project "${2:-.}"
        ;;

    *)
        error "Unknown command: $COMMAND. Run tgame.sh help."
        ;;

esac
