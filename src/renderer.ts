import { APISensor, Building, Floor, Wall } from "./building";

export class Renderer {
    private readonly _div = document.createElement('div');
    private readonly _body = document.createElement('div');

    private _rotationY = 0;
    private _rotationX = 0;

    private _viewPointY = this._building.height;
    private get _viewPoint(): string { return `50% calc(50% + ${this._viewPointY}${this._building.unit})`; }

    private _selectedFloor: null | Floor = null;

    private get _fromTop(): boolean {
        return this._rotationX === -90;
    }

    private _currentLayer = '';

    private readonly _floorElements = new Map<Floor, HTMLDivElement>();
    private readonly _wallElements = new Map<Wall, HTMLDivElement>();
    private readonly _sensors = new Map<Wall, Sensor>();

    public constructor(private _building: Building, floor = '', layer = '') {
        this._body.classList.add('body');
        document.body.appendChild(this._body);
        document.addEventListener('keydown', (e) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLButtonElement)
                return;
            switch (e.key) {
                case 'ArrowLeft':
                    this.left();
                    break;
                case 'ArrowRight':
                    this.right();
                    break;
                case 'ArrowUp':
                    this.up();
                    break;
                case 'ArrowDown':
                    this.down();
                    break;
            }
        });
        this._listenForTouchHandlers();
        this._rotationY = 0;
        this.apply(this._building, floor, layer);
    }

    private _listenForTouchHandlers(): void {
        let startX: number, startY: number;

        document.addEventListener('touchstart', e => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        });

        document.addEventListener('touchend', e => {
            const dx = e.changedTouches[0].clientX - startX;
            const dy = e.changedTouches[0].clientY - startY;
            if (Math.abs(dx) > Math.abs(dy)) {
                if (dx > 50) this.left();
                else if (dx < -50) this.right();
            } else {
                if (dy > 50) this.up();
                else if (dy < -50) this.down();
            }
        });
    }

    public getWall(element: HTMLDivElement): { element: HTMLElement, wall: Wall } | null {
        const info = Array.from(this._wallElements.entries()).find(x => x[1].contains(element));
        if (!info)
            return null;
        return { element: info[1], wall: info[0] };
    }

    public getElement(wall: Wall): HTMLElement | null {
        return this._wallElements.get(wall) ?? null;
    }

    public apply(building: Building, floor = '', layer = ''): void {
        this._building = building;
        this.cleanUp();
        this._selectFloor(this._building.floors.find(f => f.name === floor) ?? null);
        this.setLayer(layer);
        this._init();
        this._transform({resetX: true});
    }

    private _init(): void {
        if (!this._div.parentElement)
            this._body.append(this._div);
        this._body.style.perspective = 5 * this._building.depth + this._building.unit;
        this._div.classList.add('building')
        this._div.style.width = this._building.width + this._building.unit;
        this._div.style.height = this._building.height + this._building.unit;
        for (const floor of this._building.floors) {
            if (!this._selectedFloor || floor === this._selectedFloor) {
                const div = this._ensureFloorDiv(floor);
                if (!this._selectedFloor) {
                    div.style.transform = 'translateY(0vw) translate3d(0vw,0vw,0vw) scale3d(1,1,1)';
                    div.style.transformOrigin = '0vw 0%';
                }
            }
        }
    }

    public render(): void {
        for (const floor of this._building.floors) {
            const f = this._ensureFloorDiv(floor);
            if (!this._selectedFloor || floor === this._selectedFloor) {
                if (!this._div.contains(f))
                    this._div.appendChild(f);
                for (const wall of floor.walls) {
                    const w = this._ensureWallDiv(wall);
                    if (this._canShowWall(wall)) {
                        if (!f.contains(w)) {
                            f.appendChild(w);
                            this._sensors.get(wall)?.render();
                        }
                    } else if (f.contains(w)) {
                        this._sensors.get(wall)?.remove();
                        f.removeChild(w);
                    }
                }
            } else if (this._div.contains(f))
                this._div.removeChild(f);
        }
    }

    public cleanUp(): void {
        this._sensors.forEach(s => s.remove());
        this._body.innerHTML = '';
        this._div.innerHTML = '';
        this._floorElements.clear();
        this._wallElements.clear();
        this._sensors.clear();
    }

    private _ensureFloorDiv(floor: Floor): HTMLDivElement {
        let div = this._floorElements.get(floor);
        if (div)
            return div;
        div = document.createElement('div');
        div.classList.add('3d');
        if (floor.isLevel)
            div.classList.add('level');
        this._floorElements.set(floor, div);
        return div;
    }

    private _ensureWallDiv(wall: Wall): HTMLDivElement {
        let div = this._wallElements.get(wall);
        if (div)
            return div;
        div = document.createElement('div');
        for (const side of wall.sides) {
            const sideDiv = document.createElement('div');
            sideDiv.classList.add('side', ...side.class.split(' ').filter(x => x), ...wall.class.split(' ').filter(x => x));
            sideDiv.style.width = side.width + this._building.unit;
            sideDiv.style.height = side.height + this._building.unit;
            sideDiv.style.transform = side.transform;
            if (wall.hasClass('sensor') && wall.mainSide === side && wall.data)
                this._sensors.set(wall, new Sensor(wall.data as unknown as APISensor, sideDiv));
            div.appendChild(sideDiv);
        }
        div.classList.add('3d', 'group');
        this._wallElements.set(wall, div);
        return div;
    }

    private _selectFloor(floor: null | Floor): void {
        if (this._selectedFloor === floor)
            return;
        const reset = !this._selectedFloor;
        this._selectedFloor = floor;
        if (this._selectedFloor) {
            this._div.classList.add('floorplan');
            if (reset) {
                this._rotationX = 0;
                this._rotationY = 0;
                this._viewPointY = -40;
            }
        } else {
            this._div.classList.remove('floorplan');
            this._rotationX = 0;
            this._rotationY = 0;
            this._viewPointY = this._building.height;
        }
    }

    public up(): void {
        if (this._rotationX === -90)
            return;
        this._transform({ up: true, resetX: true });
    }

    public left(): void {
        if (this._rotationX === -90)
            return;

        this._rotationY += 45;
        this._transform();
    }

    public right(): void {
        if (this._rotationX === -90)
            return;
        this._rotationY -= 45;
        this._transform();
    }

    public down(): void {
        if (!this._rotationX)
            return;
        this._transform({ resetX: true });
    }

    public setView(view: string): void {
        const views = new Set(view.toLowerCase().split(' '));
        let newY = this._rotationY;
        let newX = this._rotationX;
        if (views.has('front')) {
            newY = 0;
            if (views.has('left'))
                newY += 45;
            else if (views.has('right'))
                newY -= 45;
        } else if (views.has('back')) {
            newY = 180;
            if (views.has('left'))
                newY -= 45;
            else if (views.has('right'))
                newY += 45;
        } else if (views.has('left'))
            newY = 90;
        else if (views.has('right'))
            newY = 270;
        if (views.has('top')) {
            newX = -90;
            newY = 0;
        }
        if (newY === this._rotationY && newX === this._rotationX)
            return;
        this._rotationX = newX;
        this._rotationY = newY;
        this._transform();
    }

    public setLayer(layer: string = ''): void {
        this._currentLayer = layer;
    }

    private _transform(options?: { up?: boolean, resetX?: boolean }): void {
        if (options?.resetX) {
            if (options.up) {
                this._viewPointY = 0;
                this._rotationX = -90;
            } else {
                this._viewPointY = -40;
                this._rotationX = 0;
            }
            this._rotationY = this._rotationY - (this._rotationY % 360) + 0;
        }
        this.render();
        this._updateUI();
    }

    private _updateUI(): void {
        if (!this._fromTop)
            this._body.classList.remove('from-top');
        else
            this._body.classList.add('from-top');
        this._sensors.forEach(s => s.rotate(this._rotationY));
        this._body.style.perspectiveOrigin = this._viewPoint;
        this._div.style.transform = `translate(-50%, -50%) rotate3d(0, 1, 0, ${this._rotationY}deg) rotate3d(1, 0, 0, ${this._rotationX}deg)`;
    }

    private _canShowWall(wall: Wall): boolean {
        if (wall.layers.size && !wall.layers.has(this._currentLayer))
            return false;
        if (!wall.sides.length)
            return false;

        if (wall.onlyOn3D && this._selectedFloor)
            return false;

        if (wall.onlyOnPlan && !this._selectedFloor)
            return false;

        if (this._rotationX === -90)
            return true;

        if (!this._selectedFloor)
            return true;

        let angle = this._rotationY % 360;
        if (angle < 0)
            angle += 360;
        if ((angle <= 60 || angle >= 300) && wall.hasClass('outer-front'))
            return false;
        if (angle >= 30 && angle <= 150 && wall.hasClass('outer-left'))
            return false;
        if (angle >= 120 && angle <= 240 && wall.hasClass('outer-back'))
            return false;
        if (angle >= 215 && angle <= 335 && wall.hasClass('outer-right'))
            return false;

        return true;
    }
}

interface Metric {
    value: string;
    state: string;
}

class Sensor {
    private readonly _div = document.createElement('sensor');
    private readonly _stateSpan = document.createElement('span');
    private readonly _textSpan = document.createElement('span');
    private _timerId = 0;
    private _pollInterval = 0;
    private _currentState = '';
    private _isVisible = false;

    public constructor(private readonly _sensor: APISensor, private readonly _parentDiv: HTMLElement) {
        this._pollInterval = (this._sensor.pollingInterval ?? 30) * 1000;
        this._stateSpan.classList.add('state');
        this._textSpan.innerText = 'loading...';
        this._div.appendChild(this._stateSpan);
        this._div.appendChild(this._textSpan);
    }

    private static async _fetch(sensor: APISensor): Promise<Metric | null> {
        if (sensor.api === 'testAPI')
            return new Promise<Metric>(resolve => {
                console.log('ping', sensor.api);
                const value = Math.random() * 100;
                resolve({ value: `${value.toFixed(2)} ${sensor.unit ?? ''}`.trim(), state: value < 40 ? 'normal' : value < 80 ? 'warning' : 'critical' });
            });
        try {
            const req = await fetch(sensor.api, { method: 'GET', mode: 'cors' });
            const response = (await req.json()) as any;
            return {
                state: response[sensor.stateProperty],
                value: `${response[sensor.valueProperty]} ${sensor.unit ?? ''}`.trim(),
            };
        } catch (error) {
            return null;
        }
    }

    public render(): void {
        this._parentDiv.appendChild(this._div);
        this._isVisible = true;
        this._poll();
    }

    public remove(): void {
        if (this._parentDiv.contains(this._div))
            this._parentDiv.removeChild(this._div);
        window.clearTimeout(this._timerId);
        this._timerId = 0;
        this._isVisible = false;
    }

    public rotate(deg: number): void {
        if (!this._isVisible)
            return;
        this._div.style.transform = `rotate3d(0, 1, 0, -90deg) rotate3d(1, 0, 0, ${deg - 90}deg) rotate3d(0, 0, 1, 90deg)`;
    }

    private async _poll(): Promise<void> {
        if (this._timerId)
            window.clearTimeout(this._timerId);

        let metric: Metric | null = null;
        try {
            metric = await Sensor._fetch(this._sensor);
            if (!metric)
                return;
        } catch (error) {
            return;
        }
        if (this._currentState && this._currentState !== metric.state)
            this._stateSpan.classList.remove(this._currentState);

        if (metric.state !== this._currentState)
            this._stateSpan.classList.add(metric.state);
        this._currentState = metric.state;
        this._textSpan.innerText = metric.value;
        this._timerId = window.setTimeout(() => this._poll(), this._pollInterval);
    }
}