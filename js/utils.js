'use strict';

// 2D Vector class
class Vector2D {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
        Object.freeze(this);
    }

    static zero() { return new Vector2D(0, 0); }
    static right() { return new Vector2D(1, 0); }
    static up() { return new Vector2D(0, -1); }

    static fromAngle(angle, magnitude = 1) {
        return new Vector2D(
            Math.cos(angle) * magnitude,
            Math.sin(angle) * magnitude
        );
    }

    static fromObject(obj) {
        return new Vector2D(obj.x || 0, obj.y || 0);
    }

    static lerp(a, b, t) {
        const ct = Math.max(0, Math.min(1, t));
        return new Vector2D(
            a.x + (b.x - a.x) * ct,
            a.y + (b.y - a.y) * ct
        );
    }

    add(v) { return new Vector2D(this.x + v.x, this.y + v.y); }
    subtract(v) { return new Vector2D(this.x - v.x, this.y - v.y); }
    multiply(s) { return new Vector2D(this.x * s, this.y * s); }
    
    divide(s) {
        if (s === 0) return new Vector2D(0, 0);
        return new Vector2D(this.x / s, this.y / s);
    }

    negate() { return new Vector2D(-this.x, -this.y); }
    magnitude() { return Math.sqrt(this.x * this.x + this.y * this.y); }
    magnitudeSquared() { return this.x * this.x + this.y * this.y; }

    normalize() {
        const mag = this.magnitude();
        if (mag === 0) return new Vector2D(0, 0);
        return this.divide(mag);
    }

    angle() { return Math.atan2(this.y, this.x); }
    dot(v) { return this.x * v.x + this.y * v.y; }
    cross(v) { return this.x * v.y - this.y * v.x; }

    distanceTo(v) {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    distanceSquaredTo(v) {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        return dx * dx + dy * dy;
    }

    equals(v, epsilon = 0.0001) {
        return Math.abs(this.x - v.x) < epsilon && Math.abs(this.y - v.y) < epsilon;
    }

    rotate(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return new Vector2D(
            this.x * cos - this.y * sin,
            this.x * sin + this.y * cos
        );
    }

    perpendicular() { return new Vector2D(-this.y, this.x); }

    reflect(normal) {
        const n = normal.normalize();
        return this.subtract(n.multiply(2 * this.dot(n)));
    }

    projectOnto(v) {
        const magSq = v.magnitudeSquared();
        if (magSq === 0) return new Vector2D(0, 0);
        return v.multiply(this.dot(v) / magSq);
    }

    clampMagnitude(max) {
        if (this.magnitude() > max) {
            return this.normalize().multiply(max);
        }
        return new Vector2D(this.x, this.y);
    }

    toMutable() { return { x: this.x, y: this.y }; }
    toString() { return `Vector2D(${this.x.toFixed(2)}, ${this.y.toFixed(2)})`; }
    toArray() { return [this.x, this.y]; }
}

// Color utilities
class ColorUtils {
    static hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }

    static rgbToHex(r, g, b) {
        const toHex = c => {
            const hex = Math.round(Math.max(0, Math.min(255, c))).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    static rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s;
        const l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }
        return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
    }

    static hslToRgb(h, s, l) {
        h /= 360; s /= 100; l /= 100;
        let r, g, b;

        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
    }

    static lerp(color1, color2, t) {
        const c1 = this.hexToRgb(color1);
        const c2 = this.hexToRgb(color2);
        const ct = Math.max(0, Math.min(1, t));
        return this.rgbToHex(
            c1.r + (c2.r - c1.r) * ct,
            c1.g + (c2.g - c1.g) * ct,
            c1.b + (c2.b - c1.b) * ct
        );
    }

    static rgba(r, g, b, a) {
        return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`;
    }

    static hsla(h, s, l, a) {
        return `hsla(${h}, ${s}%, ${l}%, ${a})`;
    }

    static gradient(t, colors) {
        if (colors.length === 0) return '#ffffff';
        if (colors.length === 1) return colors[0];
        
        const ct = Math.max(0, Math.min(1, t));
        const segments = colors.length - 1;
        const segment = Math.min(Math.floor(ct * segments), segments - 1);
        const localT = (ct * segments) - segment;
        
        return this.lerp(colors[segment], colors[segment + 1], localT);
    }
}

// General utilities
const Utils = {
    clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
    },

    lerp(a, b, t) {
        return a + (b - a) * this.clamp(t, 0, 1);
    },

    inverseLerp(a, b, val) {
        if (a === b) return 0;
        return this.clamp((val - a) / (b - a), 0, 1);
    },

    map(val, inMin, inMax, outMin, outMax) {
        return this.lerp(outMin, outMax, this.inverseLerp(inMin, inMax, val));
    },

    smoothstep(t) {
        const x = this.clamp(t, 0, 1);
        return x * x * (3 - 2 * x);
    },

    smootherstep(t) {
        const x = this.clamp(t, 0, 1);
        return x * x * x * (x * (x * 6 - 15) + 10);
    },

    degToRad(deg) { return deg * (Math.PI / 180); },
    radToDeg(rad) { return rad * (180 / Math.PI); },

    random(min, max) {
        return Math.random() * (max - min) + min;
    },

    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    },

    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func(...args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    formatNumber(val, decimals = 2) {
        return val.toFixed(decimals);
    },

    pointInCircle(px, py, cx, cy, r) {
        const dx = px - cx, dy = py - cy;
        return dx * dx + dy * dy <= r * r;
    },

    now() { return performance.now(); },

    createFPSCounter() {
        let frames = 0, lastTime = performance.now(), fps = 60;
        return {
            update() {
                frames++;
                const now = performance.now();
                const elapsed = now - lastTime;
                if (elapsed >= 1000) {
                    fps = Math.round((frames * 1000) / elapsed);
                    frames = 0;
                    lastTime = now;
                }
                return fps;
            },
            get fps() { return fps; }
        };
    }
};

// Canvas helpers
const CanvasUtils = {
    setupHiDPI(canvas, width, height) {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        return ctx;
    },

    clear(ctx, width, height, fill = '#000000') {
        ctx.fillStyle = fill;
        ctx.fillRect(0, 0, width, height);
    },

    createRadialGradient(ctx, x, y, r1, r2, colorStops) {
        const gradient = ctx.createRadialGradient(x, y, r1, x, y, r2);
        colorStops.forEach(([pos, color]) => gradient.addColorStop(pos, color));
        return gradient;
    },

    createLinearGradient(ctx, x1, y1, x2, y2, colorStops) {
        const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
        colorStops.forEach(([pos, color]) => gradient.addColorStop(pos, color));
        return gradient;
    },

    drawGlowingCircle(ctx, x, y, radius, color, glowRadius = 0, glowColor = null) {
        ctx.save();
        if (glowRadius > 0) {
            ctx.shadowBlur = glowRadius;
            ctx.shadowColor = glowColor || color;
        }
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();
    },

    drawGlowingLine(ctx, x1, y1, x2, y2, color, lineWidth = 2, glowRadius = 0) {
        ctx.save();
        if (glowRadius > 0) {
            ctx.shadowBlur = glowRadius;
            ctx.shadowColor = color;
        }
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Vector2D, ColorUtils, Utils, CanvasUtils };
}
