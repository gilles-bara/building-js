import { APIBuilding, APIWall, Building } from "./building";
import { Renderer } from "./renderer";

let currentJSON: APIBuilding;
let renderer: Renderer;
let lookup: ReturnType<typeof Building.fromJSON>['lookup'];
let selectedShape: ReturnType<Renderer['getWall']>;
const params = new URLSearchParams(window.location.search);
function init(json: APIBuilding = JSON.parse(window.localStorage.getItem('latest-build') ?? jsonField?.value ?? "{}")): void {
    window.localStorage.setItem('latest-build', JSON.stringify(json));
    currentJSON = json;
    jsonField.value = JSON.stringify(json, null, 2);
    const shouldSwap = window.innerWidth < window.innerHeight !== currentJSON.l < currentJSON.d;
    if (shouldSwap)
        Building.rotate(currentJSON);
    const info = Building.fromJSON(currentJSON);
    lookup = info.lookup;
    if (renderer)
        renderer.apply(info.building, params.get('floor') ?? '', params.get('layer') ?? '');
    else {
        if (params.get('xray') === 'true')
            document.body.classList.add('x-ray');
        if (params.get('mono') === 'true')
            document.body.classList.add('mono');
        renderer = new Renderer(info.building, params.get('floor') ?? '', params.get('layer') ?? '');
        if (params.get('view') != null)
            renderer.setView(params.get('view') ?? '');
    }
    updateOptions(json);
}

function ensureOptions(collection: HTMLOptionsCollection, options: string[]): void {
    collection.length = 0;
    const option = document.createElement('option');
    option.innerText = 'None';
    option.value = '';
    collection.add(option);
    for (const o of options) {
        const option = document.createElement('option');
        option.innerText = o;
        option.value = o;
        collection.add(option);
    }
}

function updateOptions(json: APIBuilding): void {
    const layers = new Set<string>();
    for (const f of json.floors)
        f.sensors?.forEach(s => layers.add(s.layer ?? ''));
    const layerOptions = Array.from(layers).sort();
    ensureOptions(layerField.options, layerOptions);
    ensureOptions(floorField.options, json.floors.map(f => f.name).filter(x => !!x) as string[]);
}

const jsonField = document.getElementById('json') as HTMLTextAreaElement;
const applyButton = document.getElementById('apply') as HTMLButtonElement;
const shapeXField = document.getElementById('shape-x') as HTMLInputElement;
const shapeYField = document.getElementById('shape-y') as HTMLInputElement;
const shapeZField = document.getElementById('shape-z') as HTMLInputElement;
const shapeLField = document.getElementById('shape-l') as HTMLInputElement;
const shapeDField = document.getElementById('shape-d') as HTMLInputElement;
const shapeHField = document.getElementById('shape-h') as HTMLInputElement;
const classesField = document.getElementById('classes') as HTMLInputElement;
const shapeTypeField = document.getElementById('shape-type') as HTMLSelectElement;
const modeField = document.getElementById('mode') as HTMLSelectElement;
const viewField = document.getElementById('view') as HTMLSelectElement;
const urlField = document.getElementById('url') as HTMLInputElement;
const layerField = document.getElementById('layer') as HTMLSelectElement;
const floorField = document.getElementById('floor') as HTMLSelectElement;
const addShapeButton = document.getElementById('add-shape') as HTMLButtonElement;

applyButton.addEventListener('click', () => {
    const json = JSON.parse(jsonField?.value ?? "{}");
    init(json);
});

init();

addShapeButton.addEventListener('click', () => {
    const shapeType = shapeTypeField.value;
    if (!shapeType)
        return;
    const f = currentJSON.floors[0];
    let y = f.floors[0]?.h ?? 0.23;
    let h = currentJSON.h - y;
    let array: any = f;
    let d = 0.17;
    let l = f.l;
    if (shapeType.indexOf('inner') > -1) {
        d = 0.15;
        h -= 0.20;
    } else if (shapeType.indexOf('windows') > -1) {
        d = 0.05;
    } else if (shapeType.indexOf('glass') > -1) {
        d = 0.02;
    } else if (shapeType.indexOf('ceilings') > -1) {
        y = currentJSON.h - 0.20;
        h = 0.20;
    } else if (shapeType.indexOf('floors') > -1) {
        h = y;
        y = 0;
    } else if (shapeType.indexOf('items') > -1) {
        h = 0.6;
        d = 0.6;
        l = 0.6;
    }
    for (const x of shapeType.split('.'))
        array = array ? array[x] as typeof currentJSON.floors[0]['glass'] : [];
    const wall = { x: f.x, y, z: f.z, l, d, h, o: 'we' };
    array?.push(wall);
    init(currentJSON);
    const w = Array.from(lookup.entries()).find(x => x[1] === wall)?.[0];
    if (!w)
        return;
    renderer.getElement(w)?.click();
});

function updateUrl() {
    let url = `?layer=${layerField.value}&floor=${floorField.value}&view=${viewField.value}`;
    if (modeField.value)
        url += "&" + modeField.value + "=true";
    urlField.value = url;
}

layerField.addEventListener('input', () => updateUrl());
viewField.addEventListener('input', () => updateUrl());
modeField.addEventListener('input', () => updateUrl());
floorField.addEventListener('input', () => updateUrl());

function updateShape(): void {
    if (!selectedShape)
        return;
    const originalObject = lookup.get(selectedShape.wall);
    if (!originalObject)
        return;
    const [x, y, z, l, d, h, c] = [
        +shapeXField.value,
        +shapeYField.value,
        +shapeZField.value,
        +shapeLField.value,
        +shapeDField.value,
        +shapeHField.value,
        classesField.value
    ];
    if (originalObject.x !== x && !isNaN(x))
        originalObject.x = x;
    else if (originalObject.y !== y && !isNaN(y))
        originalObject.y = y;
    else if (originalObject.z !== z && !isNaN(z))
        originalObject.z = z;
    else if (originalObject.l !== l && !isNaN(l))
        originalObject.l = l;
    else if (originalObject.d !== d && !isNaN(d))
        originalObject.d = d;
    else if (originalObject.h !== h && !isNaN(h))
        originalObject.h = h;
    else if (originalObject.class !== c)
        originalObject.class = c;
    else
        return;
    init(currentJSON);
    const wall = Array.from(lookup.entries()).find(x => x[1] === originalObject)?.[0];
    if (!wall)
        return;
    renderer.getElement(wall)?.click();
}

shapeXField.addEventListener('input', () => updateShape());
shapeYField.addEventListener('input', () => updateShape());
shapeZField.addEventListener('input', () => updateShape());
shapeLField.addEventListener('input', () => updateShape());
shapeDField.addEventListener('input', () => updateShape());
shapeHField.addEventListener('input', () => updateShape());
classesField.addEventListener('input', () => updateShape());

function deleteShape(): void {
    if (!selectedShape)
        return;
    const originalObject = lookup.get(selectedShape.wall) as any;
    if (!originalObject)
        return;

    function checkArray(walls?: APIWall[]): boolean {
        if (!walls)
            return false;
        const index = walls.indexOf(originalObject);
        if (index === -1)
            return false;
        walls.splice(index, 1);
        return true;
    }

    for (const f of currentJSON.floors) {
        if (checkArray(f.walls.inner) || checkArray(f.walls.outer) || checkArray(f.glass) || checkArray(f.windows) || checkArray(f.items) || checkArray(f.sensors) || checkArray(f.floors))
            break;
    }
    lookup.get(selectedShape.wall);
    selectedShape.element.classList.toggle('selected');
    selectedShape = null;
    init(currentJSON);
}

document.addEventListener('keyup', (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLButtonElement)
        return;
    switch (e.key) {
        case 'Delete':
            deleteShape();
    }
});

document.addEventListener('click', (event) => {
    if (!renderer || !lookup)
        return;

    if (!(event.target instanceof HTMLDivElement))
        return;

    const info = renderer.getWall(event.target);
    if (!info)
        return;

    if (!event.ctrlKey || selectedShape?.wall !== info.wall)
        selectedShape?.element.classList.remove('selected');
    selectedShape = info;
    selectedShape?.element.classList.toggle('selected');
    const originalObject = lookup.get(info.wall);
    if (!originalObject)
        return;
    if (shapeXField !== document.activeElement)
        shapeXField.value = originalObject.x.toString();
    if (shapeYField !== document.activeElement)
        shapeYField.value = originalObject.y.toString();
    if (shapeZField !== document.activeElement)
        shapeZField.value = originalObject.z.toString();
    if (shapeLField !== document.activeElement)
        shapeLField.value = originalObject.l.toString();
    if (shapeDField !== document.activeElement)
        shapeDField.value = originalObject.d.toString();
    if (shapeHField !== document.activeElement)
        shapeHField.value = originalObject.h.toString();
    if (classesField !== document.activeElement)
        classesField.value = originalObject.class ?? '';
});