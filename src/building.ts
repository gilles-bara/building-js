interface Side {
	x: number;
	y: number;
	z: number;
	width: number;
	height: number;
	class: string;
	transform: string;
	wall?: Wall;
}

export class Wall {
	public class = '';
	public onlyOnPlan = false;
	public onlyOn3D = false;
	public readonly sides: Side[];
	public mainSide: null | Side = null;
	public data: unknown;
	public readonly layers = new Set<string>();
	private _classes = new Set<string>();

	public get floor(): Floor {
		return this._floor;
	}

	public constructor(private _floor: Floor, public x: number, public y: number, public z: number, public width: number, public height: number, public depth: number, public front: Side, public back: Side, public left: Side, public right: Side, public bottom: Side, public top: Side) {
		this.sides = [this.bottom, this.back, this.left, this.right, this.top, this.front].filter(x => x && x.width && x.height);
		if (!this.left.width)
			this.remove('back');
		if (!this.front.width)
			this.remove('right');
		this.setClass('wall');
		for (const side of this.sides)
			side.wall = this;
		this._setMainSide();
	}

	private _setMainSide(): void {
		if (this.front.height < this.top.height) {
			this.mainSide = this.top;
			return;
		}

		if (this.left.width < this.front.width)
			this.mainSide = this.front;
		else
			this.mainSide = this.left;
	}

	public merge(wall: Wall): Wall {
		this.sides.push(...wall.sides);
		this._floor.walls.splice(this._floor.walls.indexOf(wall), 1);
		return this;
	}

	public remove(side: 'top' | 'front' | 'back' | 'bottom' | 'left' | 'right'): Wall {
		switch (side) {
			case 'top':
				this.sides.splice(this.sides.indexOf(this.top), 1);
				break;
			case 'front':
				this.sides.splice(this.sides.indexOf(this.front), 1);
				break;
			case 'back':
				this.sides.splice(this.sides.indexOf(this.back), 1);
				break;
			case 'bottom':
				this.sides.splice(this.sides.indexOf(this.bottom), 1);
				break;
			case 'left':
				this.sides.splice(this.sides.indexOf(this.left), 1);
				break;
			case 'right':
				this.sides.splice(this.sides.indexOf(this.right), 1);
				break;
		}
		return this;
	}

	public addClass(className?: string): Wall {
		if (!className)
			return this;
		for (const classPart of className.split(' '))
			this._classes.add(classPart);
		this.class = Array.from(this._classes).join(' ');
		return this;
	}

	public onLayer(layer?: string): Wall {
		if (!layer)
			return this;
		this.layers.add(layer);
		return this;
	}

	public removeClass(className: string): Wall {
		if (!className)
			return this;
		for (const classPart of className.split(' '))
			this._classes.delete(classPart);
		this.class = Array.from(this._classes).join(' ');
		return this;
	}

	public hasClass(className: string): boolean {
		return this._classes.has(className);
	}

	public setClass(className: string): Wall {
		this.class = className;
		this._classes = new Set(this.class.split(' '));
		return this;
	}

	public showOnlyOnPlan(): Wall {
		this.onlyOnPlan = true;
		this.onlyOn3D = false;
		return this;
	}

	public showOnlyOn3D(): Wall {
		this.onlyOn3D = true;
		this.onlyOnPlan = false;
		return this;
	}
}

export class Floor {
	public walls: Wall[] = [];
	public isLevel = true;

	public constructor(public building: Building, private _x: number, private _y: number, private _z: number, public level: number, private _width: number, private _depth: number, public name: string = '', public description: string = '') { }

	public isOnFront(wall: Wall): boolean {
		return wall.z + wall.depth < this._depth * 0.05;
	}

	public isOnBack(wall: Wall): boolean {
		return wall.z > this._depth * 0.95;
	}

	public isOnLeft(wall: Wall): boolean {
		return wall.x + wall.width < this._width * 0.05;
	}

	public isOnRight(wall: Wall): boolean {
		return wall.x > this._width * 0.95;
	}

	public addWall(x: number, y: number, z: number, width: number, height: number, depth: number): Wall {
		x = this._x + x;
		y = this._y + y;
		z = this._z + z;
		const xVW = x;
		const yVW = -y;
		const zVW = (-z + this.building.depth / 2);
		const front = { width, height, x, y, z, class: 'front', transform: `translate3d(${xVW}${this.building.unit}, ${yVW}${this.building.unit}, ${zVW}${this.building.unit})` };
		const back = { width, height, x, y, z: z - depth, class: 'back', transform: `translate3d(${xVW}${this.building.unit}, ${yVW}${this.building.unit}, ${zVW - depth}${this.building.unit}) rotateY(180deg)` };
		const left = { width: depth, x, y, z: z - depth, height, class: 'left', transform: `translate3d(${xVW}${this.building.unit}, ${yVW}${this.building.unit}, ${zVW - depth}${this.building.unit}) rotateY(-90deg)` };
		const right = { width: depth, x: x + width, y, z, height, class: 'right', transform: `translate3d(${xVW + width}${this.building.unit}, ${yVW}${this.building.unit}, ${zVW}${this.building.unit}) rotateY(90deg)` };
		const top = { width, height: depth, x, y: y - height, z, class: 'top', transform: `translate3d(${xVW}${this.building.unit}, ${yVW - height}${this.building.unit}, ${zVW}${this.building.unit}) rotateX(90deg)` };
		const bottom = { width, height: depth, x, y, z, class: 'bottom', transform: `translate3d(${xVW}${this.building.unit}, ${yVW}${this.building.unit}, ${zVW}${this.building.unit}) rotateX(90deg)` };
		const wall = new Wall(this, x, y, z, width, height, depth, front, back, left, right, bottom, top);
		this.walls.push(wall);
		return wall;
	}

	public addFloor(x: number, y: number, z: number, width: number, height: number, depth: number): Wall {
		const floor = this.addWall(x, y, z, width, height, depth);
		floor.setClass('floor');
		return floor;
	}

	public addWindow(x: number, y: number, z: number, width: number, height: number, depth: number): Wall {
		const window = this.addWall(x, y, z, width, height, depth);
		window.setClass('window');
		return window;
	}

	public addGlass(x: number, y: number, z: number, width: number, height: number, depth: number): Wall {
		const window = this.addWall(x, y, z, width, height, depth).remove('bottom').showOnlyOnPlan();
		window.setClass('glass');
		return window;
	}

	public addCeiling(x: number, y: number, z: number, width: number, height: number, depth: number): Wall {
		const ceiling = this.addWall(x, y, z, width, height, depth).showOnlyOn3D();
		ceiling.setClass('ceiling');
		return ceiling;
	}
}

type Position = {
	x: number;
	y: number;
	z: number;
}

type orientation = 'ns' | 'we';

type Surface = {
	d: number;
	l: number;
}

type Block = Surface & {
	h: number;
}

export type APIWall = Block & Position & { class?: string };

export type Walls = (APIWall & { o: orientation })[];

export type APISensor = { outside?: boolean, api: string, valueProperty: string, stateProperty: string, unit?: string, pollingInterval: number };

export type APIBuilding = Block & {
	name: string,
	styles: { class: string, style: string }[],
	floors: (Surface & Position & {
		name?: string,
		floors: Walls,
		ceilings?: Walls,
		walls: {
			outer: Walls,
			inner: Walls
		},
		windows?: Walls,
		glass?: Walls,
		items?: Walls,
		sensors?: (APIWall & APISensor & { layer?: string })[]
	})[]
}

export class Building {
	public floors: Floor[] = [];

	public unit = 'vw';

	private constructor(public name: string, public width: number, public height: number, public depth: number) { }


	private static _ratio = 1;
	private static _t(meters: number): number {
		return (meters ?? 0) * this._ratio;
	}

	private static _rotate(object: Surface & Position): void {
		[object.l, object.d, object.x, object.z] = [object.d, object.l, object.z, object.x];

	}

	public static rotate(json: APIBuilding): void {
		[json.l, json.d] = [json.d, json.l];
		for (const floor of json.floors) {
			this._rotate(floor);
			floor.floors?.forEach(x => this._rotate(x));
			floor.ceilings?.forEach(x => this._rotate(x));
			floor.walls?.outer?.forEach(x => this._rotate(x));
			floor.walls?.inner?.forEach(x => this._rotate(x));
			floor.windows?.forEach(x => this._rotate(x));
			floor.glass?.forEach(x => this._rotate(x));
			floor.items?.forEach(x => this._rotate(x));
			floor.sensors?.forEach(x => this._rotate(x));
		}
	}

	public static fromJSON(json: APIBuilding): { building: Building, lookup: Map<Wall, APIWall> } {
		const t = (x: number) => this._t(x);
		const h = Math.max(json.h, json.d);
		const lookup = new Map<Wall, Block & Position>();
		if (json.styles?.length) {
			document.getElementById('custom-style')?.remove();
			const se = document.createElement('style');
			se.id = 'custom-style';
			for (const s of json.styles)
				se.innerHTML += `.${s.class}{${s.style}}`;
			document.body.appendChild(se);
		}
		let unit = 'vw';
		if (window.innerWidth / json.l < window.innerHeight / h) {
			this._ratio = 80 / json.l;
		} else {
			this._ratio = 80 / h;
			unit = 'vh';
		}
		const b = new Building(json.name, t(json.l), t(json.h), t(json.d));
		b.unit = unit;
		for (const f of json.floors ?? []) {
			const floor = b.addFloor(t(f.x), t(f.y), t(f.z), t(f.l), t(f.d), f.name);
			for (const x of f.floors ?? [])
				lookup.set(floor.addFloor(t(x.x), t(x.y), t(x.z), t(x.l), t(x.h), t(x.d)).addClass(x.class), x);
			for (const x of f.ceilings ?? [])
				lookup.set(floor.addCeiling(t(x.x), t(x.y), t(x.z), t(x.l), t(x.h), t(x.d)).addClass(x.class), x);
			for (const x of f.walls.outer ?? [])
				lookup.set(this._addWall(x, floor, 'outer').addClass(x.class), x);
			for (const x of f.walls.inner ?? [])
				lookup.set(this._addWall(x, floor, 'inner').addClass(x.class), x);
			for (const x of f.windows ?? [])
				lookup.set(this._addWindow(x, floor, 'outer').addClass(x.class), x);
			for (const x of f.glass ?? [])
				lookup.set(this._addGlass(x, floor).addClass(x.class), x);
			for (const x of f.items ?? [])
				lookup.set(this._addWall(x, floor, 'inner').addClass(x.class), x);
			for (const x of f.sensors ?? []) {
				const s = floor.addWall(this._t(x.x - x.l / 2), this._t(x.y - x.h / 2), this._t(x.z - x.d / 2), this._t(x.l), this._t(x.h), this._t(x.d)).addClass((x.class ?? '') + ' sensor').onLayer(x.layer);
				lookup.set(s, x);
				if (x.outside === true)
					s.showOnlyOn3D();
				else
					s.showOnlyOnPlan();
				s.data = x as APISensor;
			}
		}
		return { building: b, lookup };
	}

	private static _addClasses(x: Wall, floor: Floor, type: 'inner' | 'outer'): Wall {
		if (floor.isOnLeft(x))
			x.addClass(`${type}-left`);
		if (floor.isOnRight(x))
			x.addClass(`${type}-right`);
		if (floor.isOnFront(x))
			x.addClass(`${type}-front`);
		if (floor.isOnBack(x))
			x.addClass(`${type}-back`);
		return x;
	}

	private static _addWindow(wall: Walls[0], floor: Floor, type: 'inner' | 'outer'): Wall {
		const [w, d] = wall.o === 'ns' ? [this._t(wall.d), this._t(wall.l)] : [this._t(wall.l), this._t(wall.d)];
		const x = floor.addWindow(this._t(wall.x), this._t(wall.y), this._t(wall.z), w, this._t(wall.h), d);
		this._addClasses(x, floor, type);
		return x;
	}

	private static _addGlass(wall: Walls[0], floor: Floor): Wall {
		const [w, d] = wall.o === 'ns' ? [this._t(wall.d), this._t(wall.l)] : [this._t(wall.l), this._t(wall.d)];
		const x = floor.addGlass(this._t(wall.x), this._t(wall.y), this._t(wall.z), w, this._t(wall.h), d);
		this._addClasses(x, floor, 'inner');
		return x;
	}

	private static _addWall(wall: Walls[0], floor: Floor, type: 'inner' | 'outer'): Wall {
		const [w, d] = wall.o === 'ns' ? [this._t(wall.d), this._t(wall.l)] : [this._t(wall.l), this._t(wall.d)];
		const x = floor.addWall(this._t(wall.x), this._t(wall.y), this._t(wall.z), w, this._t(wall.h), d);
		this._addClasses(x, floor, type);
		return x;
	}

	public addFloor(x: number, y: number, z: number, width: number, depth: number, name = '', description = ''): Floor {
		const floor = new Floor(this, x, y, z, this.floors.length, width, depth, name, description);
		this.floors.push(floor);
		return floor;
	}
}