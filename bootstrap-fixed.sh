#!/usr/bin/env bash
# =============================================================================
# RunPod ComfyUI Bootstrap — v5.0 (POST-LAUNCH)
#
# STRATEGY: Let /start.sh launch ComfyUI normally.
# This script runs IN PARALLEL, waits for the venv to be ready,
# installs everything, then restarts ComfyUI so it picks up new nodes.
#
# START COMMAND for RunPod:
#   bash -c 'curl -fsSL https://gist.githubusercontent.com/eszakra/0048e5579599d81ee73103476604d9f5/raw/bootstrap.sh -o /bootstrap.sh && chmod +x /bootstrap.sh && /bootstrap.sh &  /start.sh'
#
# This runs bootstrap in background (&) and /start.sh in foreground.
# Bootstrap waits for venv, installs deps, then restarts ComfyUI.
# =============================================================================
set -uo pipefail
# NOTE: no set -e because we run in background and need to be resilient

COMFY_DIR="/workspace/ComfyUI"
VENV_PY="$COMFY_DIR/venv/bin/python"
VENV_PIP="$COMFY_DIR/venv/bin/pip"
CUSTOM_NODES="$COMFY_DIR/custom_nodes"
STAMP_FILE="$COMFY_DIR/.bootstrap_v5_done"
LOG_PREFIX="[BOOTSTRAP]"

log()  { echo "$LOG_PREFIX $(date '+%H:%M:%S') $*"; }
warn() { echo "$LOG_PREFIX $(date '+%H:%M:%S') [WARN] $*"; }
ok()   { echo "$LOG_PREFIX $(date '+%H:%M:%S') [OK]   $*"; }

# =============================================================================
# FAST PATH: If everything is already installed, do nothing
# =============================================================================
if [ -f "$STAMP_FILE" ] && \
   [ -f "$VENV_PY" ] && \
   "$VENV_PY" -c "import mediapipe, cv2, ultralytics" 2>/dev/null && \
   [ -d "$CUSTOM_NODES/ComfyUI-Impact-Pack" ]; then
    log "=== FAST PATH: Everything already installed. Nothing to do. ==="
    # Quick update Manager to avoid "outdated" block (non-blocking)
    if [ -d "$CUSTOM_NODES/ComfyUI-Manager/.git" ]; then
        timeout 10 git -C "$CUSTOM_NODES/ComfyUI-Manager" pull --rebase --quiet 2>/dev/null || true
    fi
    exit 0
fi

log "=== FULL INSTALL MODE (running alongside ComfyUI) ==="

# =============================================================================
# PHASE 0: System deps (only if missing)
# =============================================================================
if ! command -v aria2c &>/dev/null || ! command -v ffmpeg &>/dev/null; then
    log "Phase 0: Installing system packages..."
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -qq 2>/dev/null
    apt-get install -y -qq git aria2 ca-certificates ffmpeg libsm6 libxext6 \
        libgl1 libglib2.0-0 libxrender1 libgomp1 > /dev/null 2>&1
    log "Phase 0: Done."
else
    log "Phase 0: System packages already present, skipping."
fi

# =============================================================================
# PHASE 1: Wait for /start.sh to create the venv
# /start.sh is running in foreground — it will sync/create the ComfyUI env.
# We just need to wait for it to finish setting up.
# =============================================================================
log "Phase 1: Waiting for /start.sh to create venv..."

WAIT_TIMEOUT=600
ELAPSED=0

# Wait for the venv python to exist on disk
while [ ! -f "$VENV_PY" ]; do
    if [ "$ELAPSED" -ge "$WAIT_TIMEOUT" ]; then
        log "FATAL: Timed out waiting for venv after ${ELAPSED}s"
        exit 1
    fi
    sleep 5
    ELAPSED=$((ELAPSED + 5))
    [ $((ELAPSED % 15)) -eq 0 ] && log "  Waiting for venv... (${ELAPSED}s)"
done
log "  venv python found at ${ELAPSED}s"

# Wait for pip to be usable (venv fully extracted, not locked by tar)
while ! "$VENV_PIP" --version > /dev/null 2>&1; do
    if [ "$ELAPSED" -ge "$WAIT_TIMEOUT" ]; then
        log "FATAL: venv pip not usable after ${ELAPSED}s"
        exit 1
    fi
    sleep 5
    ELAPSED=$((ELAPSED + 5))
    [ $((ELAPSED % 15)) -eq 0 ] && log "  venv pip not ready... (${ELAPSED}s)"
done
log "  venv pip usable at ${ELAPSED}s"

# Wait for any tar/sync process to finish
SYNC_WAIT=0
while pgrep -f "tar.*ComfyUI" > /dev/null 2>&1 && [ "$SYNC_WAIT" -lt 120 ]; do
    sleep 3
    SYNC_WAIT=$((SYNC_WAIT + 3))
    [ $((SYNC_WAIT % 15)) -eq 0 ] && log "  tar sync running... (+${SYNC_WAIT}s)"
done
[ "$SYNC_WAIT" -gt 0 ] && sleep 3

log "Phase 1: Done. (total wait: $((ELAPSED + SYNC_WAIT))s)"

# =============================================================================
# PHASE 2: Update ComfyUI core
# =============================================================================
log "Phase 2: Updating ComfyUI..."
if [ -d "$COMFY_DIR/.git" ]; then
    git -C "$COMFY_DIR" pull --rebase --quiet 2>/dev/null && ok "ComfyUI updated" || warn "ComfyUI update failed (non-fatal)"
fi

# =============================================================================
# PHASE 3: Clone / Update Custom Nodes (PARALLEL)
# =============================================================================
log "Phase 3: Installing custom nodes..."
mkdir -p "$CUSTOM_NODES"

install_node() {
    local repo_url="$1"
    local dir_name="$2"
    local target="$CUSTOM_NODES/$dir_name"
    if [ -d "$target/.git" ]; then
        git -C "$target" pull --rebase --quiet 2>/dev/null || true
    else
        [ -d "$target" ] && rm -rf "$target"
        git clone --depth 1 --quiet "$repo_url" "$target" 2>/dev/null || true
    fi
    log "  $dir_name done"
}

install_node "https://github.com/MoonGoblinDev/Civicomfy.git"              "Civicomfy" &
install_node "https://github.com/ltdrdata/ComfyUI-Manager.git"             "ComfyUI-Manager" &
install_node "https://github.com/Fannovel16/comfyui_controlnet_aux.git"    "comfyui_controlnet_aux" &
install_node "https://github.com/ssitu/ComfyUI_UltimateSDUpscale.git"      "ComfyUI_UltimateSDUpscale" &
install_node "https://github.com/ltdrdata/ComfyUI-Impact-Pack.git"         "ComfyUI-Impact-Pack" &
install_node "https://github.com/ltdrdata/ComfyUI-Impact-Subpack.git"      "ComfyUI-Impact-Subpack" &
install_node "https://github.com/yolain/ComfyUI-Easy-Use.git"              "ComfyUI-Easy-Use" &
install_node "https://github.com/sipherxyz/comfyui-art-venture.git"        "comfyui-art-venture" &
install_node "https://github.com/rgthree/rgthree-comfy.git"                "rgthree-comfy" &

wait
log "  All nodes cloned/updated."

# Impact Pack submodules
if [ -d "$CUSTOM_NODES/ComfyUI-Impact-Pack" ]; then
    log "  Impact Pack submodules..."
    cd "$CUSTOM_NODES/ComfyUI-Impact-Pack"
    git submodule update --init --recursive --quiet 2>/dev/null || warn "submodule failed"
    cd /
fi

log "Phase 3: Done."

# =============================================================================
# PHASE 4: Python dependencies
# =============================================================================
log "Phase 4: Python dependencies..."

"$VENV_PIP" install --quiet --upgrade pip setuptools wheel 2>/dev/null || true

# ── mediapipe ──
if ! "$VENV_PY" -c "import mediapipe" 2>/dev/null; then
    log "  [CRITICAL] mediapipe not found — installing..."
    "$VENV_PIP" uninstall -y opencv-python 2>/dev/null || true
    "$VENV_PIP" install --no-cache-dir \
        "protobuf>=3.20,<5" \
        "opencv-python-headless>=4.8" \
        "mediapipe>=0.10.9" \
        "numpy<2" 2>&1 | tail -3

    if "$VENV_PY" -c "import mediapipe" 2>/dev/null; then
        ok "mediapipe installed"
    else
        warn "mediapipe failed — force reinstall..."
        "$VENV_PIP" install --no-cache-dir --force-reinstall mediapipe 2>&1 | tail -3
    fi
else
    ok "mediapipe already installed"
fi

# ── Other critical packages ──
for pkg_pair in "ultralytics:ultralytics" "segment_anything:segment-anything" "onnxruntime:onnxruntime"; do
    import_name="${pkg_pair%%:*}"
    pip_name="${pkg_pair##*:}"
    if ! "$VENV_PY" -c "import $import_name" 2>/dev/null; then
        log "  Installing $pip_name..."
        "$VENV_PIP" install --quiet --no-cache-dir "$pip_name" 2>&1 | tail -1 || true
    else
        ok "  $pip_name already installed"
    fi
done

# ── Per-node requirements.txt ──
log "  Per-node requirements..."
find "$CUSTOM_NODES" -maxdepth 2 -name "requirements.txt" -print0 2>/dev/null | \
    while IFS= read -r -d "" req; do
        node_name=$(basename "$(dirname "$req")")
        stamp="$CUSTOM_NODES/$node_name/.deps_installed"
        if [ -f "$stamp" ] && [ "$stamp" -nt "$req" ]; then
            continue
        fi
        log "    -> $node_name"
        "$VENV_PIP" install --quiet -r "$req" 2>&1 | tail -1 || true
        touch "$stamp"
    done

# ── POST-INSTALL: Verify mediapipe wasn't broken ──
if ! "$VENV_PY" -c "import mediapipe" 2>/dev/null; then
    warn "mediapipe BROKEN by another node — repairing..."
    "$VENV_PIP" uninstall -y opencv-python 2>/dev/null || true
    "$VENV_PIP" install --no-cache-dir --force-reinstall \
        "mediapipe>=0.10.9" "protobuf>=3.20,<5" "opencv-python-headless>=4.8" 2>&1 | tail -3
fi

# ── Impact Pack install.py ──
IMPACT_STAMP="$CUSTOM_NODES/ComfyUI-Impact-Pack/.install_done"
if [ -f "$CUSTOM_NODES/ComfyUI-Impact-Pack/install.py" ] && [ ! -f "$IMPACT_STAMP" ]; then
    log "  Running Impact Pack install.py..."
    cd "$CUSTOM_NODES/ComfyUI-Impact-Pack"
    "$VENV_PY" install.py 2>&1 | tail -3 || warn "install.py errors"
    touch "$IMPACT_STAMP"
    cd /
fi

# ── Final verification ──
log "  === VERIFICATION ==="
for pkg in mediapipe cv2 ultralytics segment_anything onnxruntime; do
    if "$VENV_PY" -c "import $pkg" 2>/dev/null; then
        ok "  $pkg"
    else
        warn "  $pkg MISSING"
    fi
done

log "Phase 4: Done."

# =============================================================================
# PHASE 5: Model download (background, non-blocking)
# =============================================================================
CONTROLNET_DIR="$COMFY_DIR/models/controlnet"
mkdir -p "$CONTROLNET_DIR"
MODEL_URL="https://huggingface.co/CompVis/stable-diffusion-v1-4/resolve/main/vae/diffusion_pytorch_model.safetensors"
MODEL_FILE="$CONTROLNET_DIR/diffusion_pytorch_model.safetensors"

if [ ! -f "$MODEL_FILE" ] && command -v aria2c &>/dev/null; then
    log "Phase 5: Downloading model..."
    nohup aria2c -x 8 -s 8 --console-log-level=warn \
        -d "$CONTROLNET_DIR" \
        -o "diffusion_pytorch_model.safetensors" \
        "$MODEL_URL" > /tmp/model_download.log 2>&1 &
    disown
    log "Phase 5: Download started in background (PID $!)"
else
    log "Phase 5: Model exists or aria2c not available, skipping."
fi

# =============================================================================
# PHASE 6: Restart ComfyUI so it loads the new nodes
# =============================================================================
log "Phase 6: Restarting ComfyUI to load new nodes..."

# Find and kill the running ComfyUI python process
COMFY_PID=$(pgrep -f "python.*main.py.*--listen" 2>/dev/null | head -1) || true

if [ -n "$COMFY_PID" ]; then
    log "  Killing ComfyUI (PID $COMFY_PID)..."
    kill "$COMFY_PID" 2>/dev/null || true
    # Wait up to 15s for it to die
    for i in $(seq 1 15); do
        if ! kill -0 "$COMFY_PID" 2>/dev/null; then
            break
        fi
        sleep 1
    done
    # Force kill if still alive
    kill -9 "$COMFY_PID" 2>/dev/null || true
    sleep 2
    log "  ComfyUI stopped. /start.sh supervisor will auto-restart it."
else
    log "  ComfyUI process not found — it may restart on its own."
fi

# =============================================================================
# DONE
# =============================================================================
touch "$STAMP_FILE"

log "================================================"
log "  BOOTSTRAP v5.0 COMPLETE"
log "  ComfyUI will restart with all nodes loaded."
log "================================================"
