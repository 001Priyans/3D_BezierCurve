'use strict';

// Cubic bezier curve - B(t) = (1-t)³P₀ + 3(1-t)²tP₁ + 3(1-t)t²P₂ + t³P₃
class CubicBezier {
    constructor(p0, p1, p2, p3) {
        this.p0 = p0;
        this.p1 = p1;
        this.p2 = p2;
        this.p3 = p3;
    }

    evaluate(t) {
        t = Math.max(0, Math.min(1, t));
        
        const mt = 1 - t;
        const mt2 = mt * mt;
        const mt3 = mt2 * mt;
        const t2 = t * t;
        const t3 = t2 * t;

        const b0 = mt3;
        const b1 = 3 * mt2 * t;
        const b2 = 3 * mt * t2;
        const b3 = t3;

        return new Vector2D(
            b0 * this.p0.x + b1 * this.p1.x + b2 * this.p2.x + b3 * this.p3.x,
            b0 * this.p0.y + b1 * this.p1.y + b2 * this.p2.y + b3 * this.p3.y
        );
    }

    derivative(t) {
        t = Math.max(0, Math.min(1, t));
        
        const mt = 1 - t;
        const mt2 = mt * mt;
        const t2 = t * t;

        const d0 = this.p1.subtract(this.p0);
        const d1 = this.p2.subtract(this.p1);
        const d2 = this.p3.subtract(this.p2);

        return new Vector2D(
            3 * mt2 * d0.x + 6 * mt * t * d1.x + 3 * t2 * d2.x,
            3 * mt2 * d0.y + 6 * mt * t * d1.y + 3 * t2 * d2.y
        );
    }

    tangent(t) {
        return this.derivative(t).normalize();
    }

    secondDerivative(t) {
        t = Math.max(0, Math.min(1, t));
        const mt = 1 - t;

        const term1 = new Vector2D(
            this.p2.x - 2 * this.p1.x + this.p0.x,
            this.p2.y - 2 * this.p1.y + this.p0.y
        );
        const term2 = new Vector2D(
            this.p3.x - 2 * this.p2.x + this.p1.x,
            this.p3.y - 2 * this.p2.y + this.p1.y
        );

        return new Vector2D(
            6 * mt * term1.x + 6 * t * term2.x,
            6 * mt * term1.y + 6 * t * term2.y
        );
    }

    normal(t) {
        const tan = this.tangent(t);
        return new Vector2D(-tan.y, tan.x);
    }

    curvature(t) {
        const d1 = this.derivative(t);
        const d2 = this.secondDerivative(t);
        const cross = d1.x * d2.y - d1.y * d2.x;
        const mag = d1.magnitude();
        const magCubed = mag * mag * mag;
        if (magCubed < 0.0001) return 0;
        return Math.abs(cross) / magCubed;
    }

    sample(segments = 100) {
        const points = [];
        for (let i = 0; i <= segments; i++) {
            points.push(this.evaluate(i / segments));
        }
        return points;
    }

    sampleWithTangents(segments = 100) {
        const samples = [];
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            samples.push({ t, point: this.evaluate(t), tangent: this.tangent(t) });
        }
        return samples;
    }

    getTangentLines(count = 10, length = 30) {
        const tangents = [];
        for (let i = 0; i <= count; i++) {
            const t = i / count;
            const point = this.evaluate(t);
            const dir = this.tangent(t);
            tangents.push({
                t,
                start: point,
                end: point.add(dir.multiply(length)),
                direction: dir
            });
        }
        return tangents;
    }

    arcLength(segments = 100) {
        let length = 0;
        let prev = this.evaluate(0);
        for (let i = 1; i <= segments; i++) {
            const pt = this.evaluate(i / segments);
            length += prev.distanceTo(pt);
            prev = pt;
        }
        return length;
    }

    boundingBox(segments = 100) {
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        this.sample(segments).forEach(p => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        });
        
        return { min: new Vector2D(minX, minY), max: new Vector2D(maxX, maxY) };
    }

    withUpdates(updates) {
        return new CubicBezier(
            updates.p0 || this.p0,
            updates.p1 || this.p1,
            updates.p2 || this.p2,
            updates.p3 || this.p3
        );
    }

    getControlPoints() {
        return [this.p0, this.p1, this.p2, this.p3];
    }
}

// Spring physics simulation
class SpringPhysics {
    constructor(config = {}) {
        this.stiffness = config.stiffness ?? 150;
        this.damping = config.damping ?? 12;
        this.mass = config.mass ?? 1;
        this.position = config.initialPosition || new Vector2D(0, 0);
        this.velocity = new Vector2D(0, 0);
        this.target = this.position;
        this.maxVelocity = config.maxVelocity ?? 2000;
        this.maxDisplacement = config.maxDisplacement ?? 500;
    }

    setTarget(target) {
        this.target = target;
    }

    update(dt) {
        dt = Math.min(dt, 1/30);

        const displacement = this.position.subtract(this.target);
        const springForce = displacement.multiply(-this.stiffness);
        const dampingForce = this.velocity.multiply(-this.damping);
        const totalForce = springForce.add(dampingForce);
        const acceleration = totalForce.divide(this.mass);

        this.velocity = this.velocity.add(acceleration.multiply(dt));

        if (this.velocity.magnitude() > this.maxVelocity) {
            this.velocity = this.velocity.normalize().multiply(this.maxVelocity);
        }

        this.position = this.position.add(this.velocity.multiply(dt));

        const currentDisp = this.position.subtract(this.target);
        if (currentDisp.magnitude() > this.maxDisplacement) {
            this.position = this.target.add(
                currentDisp.normalize().multiply(this.maxDisplacement)
            );
        }

        return this.position;
    }

    reset(position) {
        this.position = position;
        this.velocity = new Vector2D(0, 0);
        this.target = position;
    }

    applyImpulse(impulse) {
        this.velocity = this.velocity.add(impulse.divide(this.mass));
    }

    kineticEnergy() {
        return 0.5 * this.mass * this.velocity.magnitudeSquared();
    }

    potentialEnergy() {
        const disp = this.position.subtract(this.target);
        return 0.5 * this.stiffness * disp.magnitudeSquared();
    }

    totalEnergy() {
        return this.kineticEnergy() + this.potentialEnergy();
    }

    isSettled(velThresh = 0.1, dispThresh = 0.1) {
        return this.velocity.magnitude() < velThresh &&
               this.position.subtract(this.target).magnitude() < dispThresh;
    }

    setParameters(params) {
        if (params.stiffness !== undefined) this.stiffness = params.stiffness;
        if (params.damping !== undefined) this.damping = params.damping;
        if (params.mass !== undefined) this.mass = params.mass;
    }
}

// Spring-controlled point
class SpringPoint {
    constructor(x, y, config = {}) {
        this.spring = new SpringPhysics({
            ...config,
            initialPosition: new Vector2D(x, y)
        });
        this.basePosition = new Vector2D(x, y);
        this.influence = config.influence ?? 1.0;
    }

    get position() { return this.spring.position; }
    get x() { return this.spring.position.x; }
    get y() { return this.spring.position.y; }

    setInputOffset(offset) {
        const scaled = offset.multiply(this.influence);
        this.spring.setTarget(this.basePosition.add(scaled));
    }

    setTarget(position) {
        this.spring.setTarget(position);
    }

    update(dt) {
        return this.spring.update(dt);
    }

    reset() {
        this.spring.reset(this.basePosition);
    }

    setBasePosition(x, y) {
        this.basePosition = new Vector2D(x, y);
    }

    setSpringParams(params) {
        this.spring.setParameters(params);
        if (params.influence !== undefined) this.influence = params.influence;
    }
}

// Main interactive bezier system
class InteractiveBezier {
    constructor(config = {}) {
        this.width = config.width || 800;
        this.height = config.height || 600;

        this.springConfig = {
            stiffness: config.stiffness ?? 150,
            damping: config.damping ?? 12,
            mass: config.mass ?? 1
        };

        this.initControlPoints(config);
        this.curveResolution = config.curveResolution ?? 100;
        this.tangentCount = config.tangentCount ?? 10;
        this.tangentLength = config.tangentLength ?? 40;
        this.lastUpdateTime = performance.now();
    }

    initControlPoints(config) {
        const margin = 100;

        this.p0 = config.p0 || new Vector2D(margin, this.height / 2);
        this.p3 = config.p3 || new Vector2D(this.width - margin, this.height / 2);

        const p1Default = config.p1 || new Vector2D(this.width * 0.33, this.height * 0.25);
        const p2Default = config.p2 || new Vector2D(this.width * 0.66, this.height * 0.75);

        this.springP1 = new SpringPoint(p1Default.x, p1Default.y, {
            ...this.springConfig,
            influence: config.p1Influence ?? 1.0
        });

        this.springP2 = new SpringPoint(p2Default.x, p2Default.y, {
            ...this.springConfig,
            influence: config.p2Influence ?? 0.8
        });
    }

    getCurve() {
        return new CubicBezier(
            this.p0,
            this.springP1.position,
            this.springP2.position,
            this.p3
        );
    }

    setInputOffset(offset) {
        this.springP1.setInputOffset(offset);
        this.springP2.setInputOffset(offset.multiply(-0.6));
    }

    setTargets(p1Target, p2Target) {
        if (p1Target) this.springP1.setTarget(p1Target);
        if (p2Target) this.springP2.setTarget(p2Target);
    }

    update(dt) {
        if (dt === undefined) {
            const now = performance.now();
            dt = (now - this.lastUpdateTime) / 1000;
            this.lastUpdateTime = now;
        }
        this.springP1.update(dt);
        this.springP2.update(dt);
    }

    reset() {
        this.springP1.reset();
        this.springP2.reset();
    }

    setSpringParams(params) {
        this.springP1.setSpringParams(params);
        this.springP2.setSpringParams(params);
    }

    getRenderData() {
        const curve = this.getCurve();
        return {
            curve,
            points: curve.sample(this.curveResolution),
            tangents: curve.getTangentLines(this.tangentCount, this.tangentLength),
            controlPoints: {
                p0: this.p0,
                p1: this.springP1.position,
                p2: this.springP2.position,
                p3: this.p3
            },
            springs: {
                p1Velocity: this.springP1.spring.velocity,
                p2Velocity: this.springP2.spring.velocity,
                p1Energy: this.springP1.spring.totalEnergy(),
                p2Energy: this.springP2.spring.totalEnergy()
            }
        };
    }

    resize(width, height) {
        const scaleX = width / this.width;
        const scaleY = height / this.height;
        this.width = width;
        this.height = height;

        this.p0 = new Vector2D(this.p0.x * scaleX, this.p0.y * scaleY);
        this.p3 = new Vector2D(this.p3.x * scaleX, this.p3.y * scaleY);

        this.springP1.setBasePosition(
            this.springP1.basePosition.x * scaleX,
            this.springP1.basePosition.y * scaleY
        );
        this.springP2.setBasePosition(
            this.springP2.basePosition.x * scaleX,
            this.springP2.basePosition.y * scaleY
        );
    }

    setEndpoint(index, position) {
        if (index === 0) this.p0 = position;
        else if (index === 3) this.p3 = position;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CubicBezier, SpringPhysics, SpringPoint, InteractiveBezier };
}
