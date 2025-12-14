'use strict';

const App = {
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,
    dpr: 1,
    bezier: null,

    gyro: {
        available: false,
        enabled: false,
        alpha: 0,
        beta: 0,
        gamma: 0,
        calibration: { beta: 0, gamma: 0 }
    },

    touch: {
        active: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        isDragging: false,
        draggedPoint: null,
        activeTouches: {}
    },

    controlMode: 'gyro',
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
        curveResolution: 80,
        tangentCount: 8,
        tangentLength: 35,
        curveWidth: 3,
        curveColor1: '#00d4ff',
        curveColor2: '#ff00aa',
        tangentColor: '#ff8800'
    },

    presets: {
        bouncy: { stiffness: 300, damping: 8, mass: 0.5 },
        smooth: { stiffness: 150, damping: 12, mass: 1 },
        stiff: { stiffness: 400, damping: 20, mass: 1 },
        loose: { stiffness: 50, damping: 5, mass: 1 }
    },

    showStats: false
};

function init() {
    App.canvas = document.getElementById('mainCanvas');
    App.ctx = App.canvas.getContext('2d');
    App.dpr = window.devicePixelRatio || 1;
    App.fpsCounter = Utils.createFPSCounter();

    handleResize();
    initBezierSystem();
    checkGyroscopeSupport();
    setupEventListeners();
    setupUIControls();

    setTimeout(() => {
        document.getElementById('loadingOverlay').classList.add('hidden');
    }, 500);

    App.lastTime = performance.now();
    requestAnimationFrame(animate);
}

function initBezierSystem() {
    const margin = Math.min(App.width, App.height) * 0.12;
    
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
        p1: new Vector2D(App.width * 0.33, App.height * 0.35),
        p2: new Vector2D(App.width * 0.66, App.height * 0.65)
    });
}

function checkGyroscopeSupport() {
    if (typeof DeviceOrientationEvent !== 'undefined') {
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            App.gyro.available = true;
            document.getElementById('permissionOverlay').classList.remove('hidden');
        } else {
            App.gyro.available = true;
            enableGyroscope();
            document.getElementById('permissionOverlay').classList.add('hidden');
        }
    } else {
        App.gyro.available = false;
        App.controlMode = 'touch';
        document.getElementById('permissionOverlay').classList.add('hidden');
        updateGyroIndicator(false);
        document.getElementById('currentMode').textContent = 'Touch';
    }
}

async function requestGyroscopePermission() {
    try {
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            const permission = await DeviceOrientationEvent.requestPermission();
            if (permission === 'granted') {
                enableGyroscope();
                document.getElementById('permissionOverlay').classList.add('hidden');
            } else {
                switchToTouchMode();
            }
        }
    } catch (error) {
        console.error('Gyroscope permission error:', error);
        switchToTouchMode();
    }
}

function enableGyroscope() {
    App.gyro.enabled = true;
    App.controlMode = 'gyro';
    
    window.addEventListener('deviceorientation', handleDeviceOrientation, true);
    
    updateGyroIndicator(true);
    document.getElementById('currentMode').textContent = 'Gyroscope';
    
    setTimeout(calibrateGyroscope, 500);
}

function switchToTouchMode() {
    App.gyro.enabled = false;
    App.controlMode = 'touch';
    
    window.removeEventListener('deviceorientation', handleDeviceOrientation, true);
    
    updateGyroIndicator(false);
    document.getElementById('permissionOverlay').classList.add('hidden');
    document.getElementById('currentMode').textContent = 'Touch';
}

function updateGyroIndicator(active) {
    const dot = document.getElementById('gyroDot');
    const text = document.getElementById('gyroText');
    
    if (active) {
        dot.classList.add('active');
        text.textContent = 'Gyroscope: Active';
    } else {
        dot.classList.remove('active');
        text.textContent = App.gyro.available ? 'Gyroscope: Inactive' : 'Gyroscope: Unavailable';
    }
}

function calibrateGyroscope() {
    App.gyro.calibration.beta = App.gyro.beta;
    App.gyro.calibration.gamma = App.gyro.gamma;
    
    if (navigator.vibrate) {
        navigator.vibrate(50);
    }
}

function setupEventListeners() {
    window.addEventListener('resize', Utils.debounce(handleResize, 100));
    window.addEventListener('orientationchange', () => {
        setTimeout(handleResize, 200);
    });

    App.canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    App.canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    App.canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    App.canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    document.getElementById('enableGyroBtn').addEventListener('click', requestGyroscopePermission);
    document.getElementById('skipGyroBtn').addEventListener('click', switchToTouchMode);

    document.body.addEventListener('touchmove', (e) => {
        if (e.target === App.canvas) {
            e.preventDefault();
        }
    }, { passive: false });
}

function handleResize() {
    App.width = window.innerWidth;
    App.height = window.innerHeight;

    App.canvas.width = App.width * App.dpr;
    App.canvas.height = App.height * App.dpr;
    App.canvas.style.width = App.width + 'px';
    App.canvas.style.height = App.height + 'px';

    App.ctx.setTransform(App.dpr, 0, 0, App.dpr, 0, 0);

    if (App.bezier) {
        App.bezier.resize(App.width, App.height);
    }
}

function handleDeviceOrientation(e) {
    if (!App.gyro.enabled) return;

    App.gyro.alpha = e.alpha || 0;
    App.gyro.beta = e.beta || 0;
    App.gyro.gamma = e.gamma || 0;

    const betaOffset = App.gyro.beta - App.gyro.calibration.beta;
    const gammaOffset = App.gyro.gamma - App.gyro.calibration.gamma;

    const sensitivity = 3;
    const maxOffset = Math.min(App.width, App.height) * 0.3;
    
    const offsetX = Utils.clamp(gammaOffset * sensitivity, -maxOffset, maxOffset);
    const offsetY = Utils.clamp(betaOffset * sensitivity, -maxOffset, maxOffset);

    App.bezier.setInputOffset(new Vector2D(offsetX, offsetY));

    if (App.showStats) {
        document.getElementById('betaValue').textContent = Math.round(App.gyro.beta) + '°';
        document.getElementById('gammaValue').textContent = Math.round(App.gyro.gamma) + '°';
    }
}

function handleTouchStart(e) {
    e.preventDefault();
    
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const touchId = touch.identifier;
        const touchPos = new Vector2D(touch.clientX, touch.clientY);
        const hitRadius = 50;

        const points = [
            { name: 'p1', pos: App.bezier.springP1.position },
            { name: 'p2', pos: App.bezier.springP2.position },
            { name: 'p0', pos: App.bezier.p0 },
            { name: 'p3', pos: App.bezier.p3 }
        ];

        const controlledPoints = new Set(
            Object.values(App.touch.activeTouches).map(t => t.point)
        );

        let assigned = false;
        
        for (const point of points) {
            if (touchPos.distanceTo(point.pos) < hitRadius && !controlledPoints.has(point.name)) {
                App.touch.activeTouches[touchId] = {
                    point: point.name,
                    x: touch.clientX,
                    y: touch.clientY
                };
                assigned = true;
                
                if (navigator.vibrate) {
                    navigator.vibrate(20);
                }
                
                showMultiTouchFeedback(touchId, touch.clientX, touch.clientY, point.name);
                break;
            }
        }
        
        if (!assigned) {
            const availablePoints = ['p1', 'p2'].filter(p => !controlledPoints.has(p));
            if (availablePoints.length > 0) {
                let closestPoint = null;
                let closestDist = Infinity;
                
                for (const pName of availablePoints) {
                    const pPos = pName === 'p1' ? App.bezier.springP1.position : App.bezier.springP2.position;
                    const dist = touchPos.distanceTo(pPos);
                    if (dist < closestDist) {
                        closestDist = dist;
                        closestPoint = pName;
                    }
                }
                
                if (closestPoint) {
                    App.touch.activeTouches[touchId] = {
                        point: closestPoint,
                        x: touch.clientX,
                        y: touch.clientY
                    };
                    
                    if (navigator.vibrate) {
                        navigator.vibrate(15);
                    }
                    
                    showMultiTouchFeedback(touchId, touch.clientX, touch.clientY, closestPoint);
                }
            }
        }
    }
    
    if (e.touches.length > 0) {
        const touch = e.touches[0];
        App.touch.active = true;
        App.touch.startX = touch.clientX;
        App.touch.startY = touch.clientY;
        App.touch.currentX = touch.clientX;
        App.touch.currentY = touch.clientY;
        App.touch.isDragging = Object.keys(App.touch.activeTouches).length > 0;
    }
}

function handleTouchMove(e) {
    e.preventDefault();
    
    if (!App.touch.active) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const touchId = touch.identifier;
        const touchData = App.touch.activeTouches[touchId];
        
        if (touchData) {
            touchData.x = touch.clientX;
            touchData.y = touch.clientY;
            
            const touchPos = new Vector2D(touch.clientX, touch.clientY);
            
            if (touchData.point === 'p1') {
                App.bezier.springP1.setTarget(touchPos);
            } else if (touchData.point === 'p2') {
                App.bezier.springP2.setTarget(touchPos);
            } else if (touchData.point === 'p0') {
                App.bezier.p0 = touchPos;
            } else if (touchData.point === 'p3') {
                App.bezier.p3 = touchPos;
            }
            
            updateMultiTouchFeedback(touchId, touch.clientX, touch.clientY);
        }
    }
    
    if (e.touches.length > 0) {
        const touch = e.touches[0];
        App.touch.currentX = touch.clientX;
        App.touch.currentY = touch.clientY;
    }
    
    if (Object.keys(App.touch.activeTouches).length === 0 && App.controlMode === 'touch') {
        const touch = e.touches[0];
        const centerX = App.width / 2;
        const centerY = App.height / 2;
        const offsetX = (touch.clientX - centerX) * 0.4;
        const offsetY = (touch.clientY - centerY) * 0.4;
        
        App.bezier.setInputOffset(new Vector2D(offsetX, offsetY));
    }
}

function handleTouchEnd(e) {
    e.preventDefault();
    
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const touchId = touch.identifier;
        
        hideMultiTouchFeedback(touchId);
        delete App.touch.activeTouches[touchId];
    }
    
    if (e.touches.length === 0) {
        App.touch.active = false;
        App.touch.isDragging = false;
        App.touch.draggedPoint = null;
        
        if (App.controlMode === 'touch') {
            App.bezier.setInputOffset(new Vector2D(0, 0));
        }
    } else {
        App.touch.isDragging = Object.keys(App.touch.activeTouches).length > 0;
    }
}

function showTouchFeedback(x, y) {
    const touchPoint = document.getElementById('touchPoint');
    touchPoint.style.left = x + 'px';
    touchPoint.style.top = y + 'px';
    touchPoint.classList.add('visible');
}

function updateTouchFeedback(x, y) {
    const touchPoint = document.getElementById('touchPoint');
    touchPoint.style.left = x + 'px';
    touchPoint.style.top = y + 'px';
}

function hideTouchFeedback() {
    const touchPoint = document.getElementById('touchPoint');
    touchPoint.classList.remove('visible');
}

function showMultiTouchFeedback(touchId, x, y, pointName) {
    let indicator = document.getElementById('touchFeedback-' + touchId);
    
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'touchFeedback-' + touchId;
        indicator.className = 'touch-point multi-touch visible';
        indicator.style.cssText = `
            position: fixed;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            pointer-events: none;
            z-index: 1000;
            transform: translate(-50%, -50%);
            transition: opacity 0.15s ease;
        `;
        document.body.appendChild(indicator);
    }
    
    const color = pointName === 'p1' ? '#00d4ff' : '#ff00aa';
    indicator.style.border = `3px solid ${color}`;
    indicator.style.background = `${color}22`;
    indicator.style.boxShadow = `0 0 20px ${color}66`;
    
    indicator.style.left = x + 'px';
    indicator.style.top = y + 'px';
    indicator.style.opacity = '1';
}

function updateMultiTouchFeedback(touchId, x, y) {
    const indicator = document.getElementById('touchFeedback-' + touchId);
    if (indicator) {
        indicator.style.left = x + 'px';
        indicator.style.top = y + 'px';
    }
}

function hideMultiTouchFeedback(touchId) {
    const indicator = document.getElementById('touchFeedback-' + touchId);
    if (indicator) {
        indicator.style.opacity = '0';
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        }, 150);
    }
}

function setupUIControls() {
    document.getElementById('resetBtn').addEventListener('click', () => {
        App.bezier.reset();
        calibrateGyroscope();
        
        if (navigator.vibrate) {
            navigator.vibrate(30);
        }
    });

    document.getElementById('toggleStats').addEventListener('click', () => {
        App.showStats = !App.showStats;
        document.getElementById('mobileStats').classList.toggle('hidden', !App.showStats);
    });

    document.getElementById('modeToggle').addEventListener('click', () => {
        if (App.controlMode === 'gyro') {
            switchToTouchMode();
        } else if (App.gyro.available) {
            if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                requestGyroscopePermission();
            } else {
                enableGyroscope();
            }
        }
        
        if (navigator.vibrate) {
            navigator.vibrate(30);
        }
    });

    document.getElementById('presetBouncy').addEventListener('click', () => {
        applyPreset('bouncy');
    });
    document.getElementById('presetSmooth').addEventListener('click', () => {
        applyPreset('smooth');
    });
    document.getElementById('presetStiff').addEventListener('click', () => {
        applyPreset('stiff');
    });
    document.getElementById('presetLoose').addEventListener('click', () => {
        applyPreset('loose');
    });

    document.getElementById('toggleTangents').addEventListener('click', () => {
        App.options.showTangents = !App.options.showTangents;
        
        if (navigator.vibrate) {
            navigator.vibrate(20);
        }
    });
}

function applyPreset(presetName) {
    const preset = App.presets[presetName];
    if (preset) {
        App.bezier.setSpringParams(preset);
        
        if (navigator.vibrate) {
            navigator.vibrate(30);
        }
    }
}

function animate(currentTime) {
    if (!App.isRunning) return;

    const dt = (currentTime - App.lastTime) / 1000;
    App.lastTime = currentTime;

    App.bezier.update(dt);
    render();

    if (App.showStats) {
        const fps = App.fpsCounter.update();
        document.getElementById('fpsValue').textContent = fps;
        document.getElementById('modeValue').textContent = App.controlMode === 'gyro' ? 'Gyro' : 'Touch';
    } else {
        App.fpsCounter.update();
    }

    requestAnimationFrame(animate);
}

function render() {
    const ctx = App.ctx;
    const w = App.width;
    const h = App.height;

    const bgGradient = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w, h) * 0.7);
    bgGradient.addColorStop(0, '#12121a');
    bgGradient.addColorStop(0.5, '#0a0a0f');
    bgGradient.addColorStop(1, '#050508');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, w, h);

    if (App.options.showGrid) {
        drawGrid(ctx, w, h);
    }

    const data = App.bezier.getRenderData();
    const { p0, p1, p2, p3 } = data.controlPoints;

    if (App.options.showHandles) {
        drawControlHandles(ctx, p0, p1, p2, p3);
    }

    drawCurve(ctx, data.points);

    if (App.options.showTangents) {
        drawTangents(ctx, data.tangents);
    }

    if (App.options.showPoints) {
        drawControlPoints(ctx, p0, p1, p2, p3);
    }
}

function drawGrid(ctx, w, h) {
    const gridSize = 40;
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;

    for (let x = 0; x <= w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
    }

    for (let y = 0; y <= h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
    }
}

function drawControlHandles(ctx, p0, p1, p2, p3) {
    ctx.save();
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.stroke();

    ctx.restore();
}

function drawCurve(ctx, points) {
    if (points.length < 2) return;

    ctx.save();

    if (App.options.showGlow) {
        ctx.shadowBlur = 12;
        ctx.shadowColor = App.options.curveColor1;
    }

    ctx.lineWidth = App.options.curveWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (App.options.gradientCurve) {
        for (let i = 0; i < points.length - 1; i++) {
            const t = i / (points.length - 1);
            const color = ColorUtils.lerp(App.options.curveColor1, App.options.curveColor2, t);
            
            ctx.strokeStyle = color;
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
        ctx.shadowBlur = 6;
        ctx.shadowColor = App.options.tangentColor;
    }

    ctx.strokeStyle = App.options.tangentColor;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    tangents.forEach(tangent => {
        ctx.beginPath();
        ctx.moveTo(tangent.start.x, tangent.start.y);
        ctx.lineTo(tangent.end.x, tangent.end.y);
        ctx.stroke();

        ctx.fillStyle = App.options.tangentColor;
        ctx.beginPath();
        ctx.arc(tangent.start.x, tangent.start.y, 3, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.restore();
}

function drawControlPoints(ctx, p0, p1, p2, p3) {
    const points = [
        { pos: p0, color: '#ffffff', label: 'P₀', fixed: true },
        { pos: p1, color: '#00d4ff', label: 'P₁', fixed: false },
        { pos: p2, color: '#ff00aa', label: 'P₂', fixed: false },
        { pos: p3, color: '#ffffff', label: 'P₃', fixed: true }
    ];

    points.forEach(point => {
        ctx.save();

        const radius = point.fixed ? 12 : 15;

        if (App.options.showGlow) {
            ctx.shadowBlur = 12;
            ctx.shadowColor = point.color;
        }

        ctx.strokeStyle = point.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(point.pos.x, point.pos.y, radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = point.fixed ? 'rgba(255,255,255,0.3)' : point.color;
        ctx.beginPath();
        ctx.arc(point.pos.x, point.pos.y, radius - 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(point.label, point.pos.x, point.pos.y - radius - 8);

        ctx.restore();
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
