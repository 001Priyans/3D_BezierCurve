'use strict';

const App = {
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,
    dpr: 1,
    bezier: null,
    mouse: { x: 0, y: 0, prevX: 0, prevY: 0 },
    isDragging: false,
    draggedPoint: null,
    interactionMode: 'follow',
    isRunning: true,
    lastTime: 0,
    fpsCounter: null,
    
    options: {
        showGrid: true,
        showHandles: true,
        showTangents: true,
        showPoints: true,
        showGlow: true,
        gradientCurve: true,
        curveResolution: 100,
        tangentCount: 10,
        tangentLength: 40,
        curveWidth: 3,
        curveColor1: '#00d4ff',
        curveColor2: '#ff00aa',
        tangentColor: '#ff8800'
    },

    presets: {
        bouncy: { stiffness: 300, damping: 8, mass: 0.5 },
        smooth: { stiffness: 150, damping: 12, mass: 1 },
        stiff: { stiffness: 400, damping: 20, mass: 1 },
        loose: { stiffness: 50, damping: 5, mass: 1 },
        heavy: { stiffness: 100, damping: 15, mass: 3 },
        snappy: { stiffness: 500, damping: 25, mass: 0.5 }
    },

    viewMode: 'curve'
};

function init() {
    App.canvas = document.getElementById('mainCanvas');
    App.ctx = App.canvas.getContext('2d');
    App.dpr = window.devicePixelRatio || 1;
    App.fpsCounter = Utils.createFPSCounter();

    handleResize();
    initBezierSystem();
    setupEventListeners();
    setupUIControls();

    setTimeout(() => {
        document.getElementById('loadingOverlay').classList.add('hidden');
    }, 500);

    App.lastTime = performance.now();
    requestAnimationFrame(animate);
}

function initBezierSystem() {
    const margin = Math.min(App.width, App.height) * 0.1;
    
    App.bezier = new InteractiveBezier({
        width: App.width,
        height: App.height,
        stiffness: 150,
        damping: 12,
        mass: 1,
        curveResolution: App.options.curveResolution,
        tangentCount: App.options.tangentCount,
        tangentLength: App.options.tangentLength,
        p0: new Vector2D(margin, App.height / 2),
        p3: new Vector2D(App.width - margin, App.height / 2),
        p1: new Vector2D(App.width * 0.33, App.height * 0.3),
        p2: new Vector2D(App.width * 0.66, App.height * 0.7)
    });
}

function setupEventListeners() {
    window.addEventListener('resize', Utils.debounce(handleResize, 100));
    App.canvas.addEventListener('mousemove', handleMouseMove);
    App.canvas.addEventListener('mousedown', handleMouseDown);
    App.canvas.addEventListener('mouseup', handleMouseUp);
    App.canvas.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mousemove', updateCustomCursor);
    document.addEventListener('keydown', handleKeyDown);
    App.canvas.addEventListener('contextmenu', e => e.preventDefault());
}

function handleResize() {
    const container = App.canvas.parentElement;
    App.width = container.clientWidth;
    App.height = container.clientHeight;

    App.canvas.width = App.width * App.dpr;
    App.canvas.height = App.height * App.dpr;
    App.canvas.style.width = App.width + 'px';
    App.canvas.style.height = App.height + 'px';
    App.ctx.setTransform(App.dpr, 0, 0, App.dpr, 0, 0);

    if (App.bezier) {
        App.bezier.resize(App.width, App.height);
    }
}

function handleMouseMove(e) {
    const rect = App.canvas.getBoundingClientRect();
    App.mouse.prevX = App.mouse.x;
    App.mouse.prevY = App.mouse.y;
    App.mouse.x = e.clientX - rect.left;
    App.mouse.y = e.clientY - rect.top;

    document.getElementById('mouseDisplay').textContent = 
        `${Math.round(App.mouse.x)}, ${Math.round(App.mouse.y)}`;

    if (App.interactionMode === 'follow') {
        handleFollowMode();
    } else if (App.interactionMode === 'drag' && App.isDragging && App.draggedPoint) {
        handleDragMode();
    }
}

function handleFollowMode() {
    const centerX = App.width / 2;
    const centerY = App.height / 2;
    const offsetX = (App.mouse.x - centerX) * 0.5;
    const offsetY = (App.mouse.y - centerY) * 0.5;
    App.bezier.setInputOffset(new Vector2D(offsetX, offsetY));
}

function handleDragMode() {
    const mousePos = new Vector2D(App.mouse.x, App.mouse.y);
    
    if (App.draggedPoint === 'p1') {
        App.bezier.springP1.setTarget(mousePos);
    } else if (App.draggedPoint === 'p2') {
        App.bezier.springP2.setTarget(mousePos);
    } else if (App.draggedPoint === 'p0') {
        App.bezier.p0 = mousePos;
    } else if (App.draggedPoint === 'p3') {
        App.bezier.p3 = mousePos;
    }
}

function handleMouseDown(e) {
    if (App.interactionMode === 'drag') {
        const mousePos = new Vector2D(App.mouse.x, App.mouse.y);
        const hitRadius = 20;

        const points = [
            { name: 'p0', pos: App.bezier.p0 },
            { name: 'p1', pos: App.bezier.springP1.position },
            { name: 'p2', pos: App.bezier.springP2.position },
            { name: 'p3', pos: App.bezier.p3 }
        ];

        for (const point of points) {
            if (mousePos.distanceTo(point.pos) < hitRadius) {
                App.isDragging = true;
                App.draggedPoint = point.name;
                document.getElementById('customCursor').classList.add('dragging');
                break;
            }
        }
    }
}

function handleMouseUp() {
    App.isDragging = false;
    App.draggedPoint = null;
    document.getElementById('customCursor').classList.remove('dragging');
}

function handleMouseLeave() {
    App.isDragging = false;
    App.draggedPoint = null;
    document.getElementById('customCursor').classList.remove('dragging');
}

function updateCustomCursor(e) {
    const cursor = document.getElementById('customCursor');
    const cursorDot = document.getElementById('customCursorDot');
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
    cursorDot.style.left = e.clientX + 'px';
    cursorDot.style.top = e.clientY + 'px';
}

function handleKeyDown(e) {
    if (e.target.tagName === 'INPUT') return;

    switch (e.key.toLowerCase()) {
        case 'r': resetSimulation(); break;
        case 'p': togglePanel(); break;
        case 'g': toggleOption('showGrid'); break;
        case 't': toggleOption('showTangents'); break;
        case 'd': toggleInteractionMode(); break;
        case ' ':
            e.preventDefault();
            App.isRunning = !App.isRunning;
            if (App.isRunning) {
                App.lastTime = performance.now();
                requestAnimationFrame(animate);
            }
            break;
        case 'escape':
            document.getElementById('controlPanel').classList.add('collapsed');
            break;
    }
}

function setupUIControls() {
    document.getElementById('resetBtn').addEventListener('click', resetSimulation);
    document.getElementById('togglePanel').addEventListener('click', togglePanel);
    document.getElementById('panelClose').addEventListener('click', togglePanel);

    document.querySelectorAll('.view-option').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.view-option').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            App.viewMode = btn.dataset.view;
            updateViewMode();
        });
    });

    setupSlider('stiffnessSlider', 'stiffnessValue', v => App.bezier.setSpringParams({ stiffness: parseFloat(v) }));
    setupSlider('dampingSlider', 'dampingValue', v => App.bezier.setSpringParams({ damping: parseFloat(v) }));
    setupSlider('massSlider', 'massValue', v => App.bezier.setSpringParams({ mass: parseFloat(v) }), 1);

    setupSlider('resolutionSlider', 'resolutionValue', v => {
        App.options.curveResolution = parseInt(v);
        App.bezier.curveResolution = parseInt(v);
    });
    setupSlider('tangentCountSlider', 'tangentCountValue', v => {
        App.options.tangentCount = parseInt(v);
        App.bezier.tangentCount = parseInt(v);
    });
    setupSlider('tangentLengthSlider', 'tangentLengthValue', v => {
        App.options.tangentLength = parseInt(v);
        App.bezier.tangentLength = parseInt(v);
    });
    setupSlider('curveWidthSlider', 'curveWidthValue', v => App.options.curveWidth = parseInt(v));

    setupToggle('showGrid', c => App.options.showGrid = c);
    setupToggle('showHandles', c => App.options.showHandles = c);
    setupToggle('showTangents', c => App.options.showTangents = c);
    setupToggle('showPoints', c => App.options.showPoints = c);
    setupToggle('showGlow', c => App.options.showGlow = c);
    setupToggle('gradientCurve', c => App.options.gradientCurve = c);

    document.getElementById('curveColor1').addEventListener('input', e => App.options.curveColor1 = e.target.value);
    document.getElementById('curveColor2').addEventListener('input', e => App.options.curveColor2 = e.target.value);
    document.getElementById('tangentColor').addEventListener('input', e => App.options.tangentColor = e.target.value);

    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const preset = App.presets[btn.dataset.preset];
            if (preset) applyPreset(preset, btn);
        });
    });

    document.getElementById('statsToggle').addEventListener('click', () => {
        document.getElementById('statsCollapse').classList.toggle('collapsed');
        document.getElementById('statsArrow').classList.toggle('collapsed');
    });
}

function setupSlider(sliderId, valueId, callback, decimals = 0) {
    const slider = document.getElementById(sliderId);
    const display = document.getElementById(valueId);
    slider.addEventListener('input', () => {
        display.textContent = decimals > 0 ? parseFloat(slider.value).toFixed(decimals) : slider.value;
        callback(slider.value);
    });
}

function setupToggle(toggleId, callback) {
    document.getElementById(toggleId).addEventListener('change', e => callback(e.target.checked));
}

function applyPreset(preset, button) {
    document.getElementById('stiffnessSlider').value = preset.stiffness;
    document.getElementById('stiffnessValue').textContent = preset.stiffness;
    document.getElementById('dampingSlider').value = preset.damping;
    document.getElementById('dampingValue').textContent = preset.damping;
    document.getElementById('massSlider').value = preset.mass;
    document.getElementById('massValue').textContent = preset.mass.toFixed(1);
    App.bezier.setSpringParams(preset);
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    button.classList.add('active');
}

function resetSimulation() {
    App.bezier.springP1.reset();
    App.bezier.springP2.reset();
}

function togglePanel() {
    document.getElementById('controlPanel').classList.toggle('collapsed');
}

function toggleOption(option) {
    App.options[option] = !App.options[option];
    const toggle = document.getElementById(option);
    if (toggle) toggle.checked = App.options[option];
}

function toggleInteractionMode() {
    App.interactionMode = App.interactionMode === 'follow' ? 'drag' : 'follow';
    document.getElementById('modeDisplay').textContent = App.interactionMode === 'follow' ? 'Follow' : 'Drag';
    
    if (App.interactionMode === 'drag') {
        App.bezier.springP1.setTarget(App.bezier.springP1.basePosition);
        App.bezier.springP2.setTarget(App.bezier.springP2.basePosition);
    }
}

function updateViewMode() {
    const info = document.getElementById('infoOverlay');
    const curve = document.getElementById('curveInfo');
    const panel = document.getElementById('controlPanel');

    switch (App.viewMode) {
        case 'minimal':
            info.style.display = 'none';
            curve.style.display = 'none';
            panel.classList.add('collapsed');
            break;
        case 'analysis':
            info.style.display = 'block';
            curve.style.display = 'block';
            break;
        default:
            info.style.display = 'block';
            curve.style.display = 'none';
    }
}

function animate(currentTime) {
    if (!App.isRunning) return;

    const dt = (currentTime - App.lastTime) / 1000;
    App.lastTime = currentTime;

    App.bezier.update(dt);
    render();

    const fps = App.fpsCounter.update();
    const fpsEl = document.getElementById('fpsDisplay');
    fpsEl.textContent = fps;
    fpsEl.className = 'info-value ' + (fps >= 55 ? 'good' : fps >= 30 ? 'warning' : 'bad');

    updateStats();
    requestAnimationFrame(animate);
}

function updateStats() {
    const data = App.bezier.getRenderData();
    document.getElementById('p1VelocityStat').textContent = Math.round(data.springs.p1Velocity.magnitude());
    document.getElementById('p2VelocityStat').textContent = Math.round(data.springs.p2Velocity.magnitude());
    document.getElementById('p1EnergyStat').textContent = Math.round(data.springs.p1Energy);
    document.getElementById('p2EnergyStat').textContent = Math.round(data.springs.p2Energy);
    document.getElementById('arcLengthDisplay').textContent = Math.round(data.curve.arcLength()) + ' px';
}

function render() {
    const ctx = App.ctx;
    const w = App.width;
    const h = App.height;

    const bg = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w, h) * 0.7);
    bg.addColorStop(0, '#12121a');
    bg.addColorStop(0.5, '#0a0a0f');
    bg.addColorStop(1, '#050508');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    if (App.options.showGrid) drawGrid(ctx, w, h);

    const data = App.bezier.getRenderData();
    const { p0, p1, p2, p3 } = data.controlPoints;

    if (App.options.showHandles) drawControlHandles(ctx, p0, p1, p2, p3);
    drawCurve(ctx, data.points);
    if (App.options.showTangents) drawTangents(ctx, data.tangents);
    if (App.options.showPoints) drawControlPoints(ctx, p0, p1, p2, p3);
}

function drawGrid(ctx, w, h) {
    const size = 50;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;

    for (let x = 0; x <= w; x += size) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y <= h; y += size) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.moveTo(w/2, 0); ctx.lineTo(w/2, h);
    ctx.moveTo(0, h/2); ctx.lineTo(w, h/2);
    ctx.stroke();
}

function drawControlHandles(ctx, p0, p1, p2, p3) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y);
    ctx.stroke();

    ctx.restore();
}

function drawCurve(ctx, points) {
    if (points.length < 2) return;

    ctx.save();

    if (App.options.showGlow) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = App.options.curveColor1;
    }

    ctx.lineWidth = App.options.curveWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (App.options.gradientCurve) {
        for (let i = 0; i < points.length - 1; i++) {
            const t = i / (points.length - 1);
            ctx.strokeStyle = ColorUtils.lerp(App.options.curveColor1, App.options.curveColor2, t);
            ctx.beginPath();
            ctx.moveTo(points[i].x, points[i].y);
            ctx.lineTo(points[i + 1].x, points[i + 1].y);
            ctx.stroke();
        }
    } else {
        ctx.strokeStyle = App.options.curveColor1;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();
    }

    ctx.restore();
}

function drawTangents(ctx, tangents) {
    ctx.save();

    if (App.options.showGlow) {
        ctx.shadowBlur = 8;
        ctx.shadowColor = App.options.tangentColor;
    }

    ctx.strokeStyle = App.options.tangentColor;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    tangents.forEach(t => {
        ctx.beginPath();
        ctx.moveTo(t.start.x, t.start.y);
        ctx.lineTo(t.end.x, t.end.y);
        ctx.stroke();

        ctx.fillStyle = App.options.tangentColor;
        ctx.beginPath();
        ctx.arc(t.start.x, t.start.y, 3, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.restore();
}

function drawControlPoints(ctx, p0, p1, p2, p3) {
    const pts = [
        { pos: p0, color: '#ffffff', label: 'P₀', fixed: true },
        { pos: p1, color: '#00d4ff', label: 'P₁', fixed: false },
        { pos: p2, color: '#ff00aa', label: 'P₂', fixed: false },
        { pos: p3, color: '#ffffff', label: 'P₃', fixed: true }
    ];

    pts.forEach(pt => {
        ctx.save();
        const r = pt.fixed ? 10 : 12;

        if (App.options.showGlow) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = pt.color;
        }

        ctx.strokeStyle = pt.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pt.pos.x, pt.pos.y, r, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = pt.fixed ? 'rgba(255,255,255,0.3)' : pt.color;
        ctx.beginPath();
        ctx.arc(pt.pos.x, pt.pos.y, r - 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(pt.label, pt.pos.x, pt.pos.y - r - 8);

        ctx.restore();
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
