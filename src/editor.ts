import { APIBuilding, Building } from "./building";
import { Renderer } from "./renderer";

let currentJSON: APIBuilding;
let renderer: Renderer;
let lookup: ReturnType<typeof Building.fromJSON>['lookup'];
let selectedShape: ReturnType<Renderer['getWall']>;
const params = new URLSearchParams(window.location.search);
function init(json: APIBuilding): void {
    selectedShape?.element.classList.remove('selected');
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
    layerField.options.length = 0;
    const layers = new Set<string>();
    for (const f of json.floors)
        f.sensors?.forEach(s => layers.add(s.layer ?? ''));
    const options = Array.from(layers).sort();
    for (const layer of options) {
        const option = document.createElement('option');
        option.innerText = layer;
        option.value = layer;
        layerField.options.add(option);
    }
}

const jsonField = document.getElementById('json') as HTMLTextAreaElement;
const applyButton = document.getElementById('apply') as HTMLButtonElement;
const shapeXField = document.getElementById('shape-x') as HTMLInputElement;
const shapeYField = document.getElementById('shape-y') as HTMLInputElement;
const shapeZField = document.getElementById('shape-z') as HTMLInputElement;
const shapeLField = document.getElementById('shape-l') as HTMLInputElement;
const shapeDField = document.getElementById('shape-d') as HTMLInputElement;
const shapeHField = document.getElementById('shape-h') as HTMLInputElement;
const shapeTypeField = document.getElementById('shape-type') as HTMLSelectElement;
const modeField = document.getElementById('mode') as HTMLSelectElement;
const viewField = document.getElementById('view') as HTMLSelectElement;
const urlField = document.getElementById('url') as HTMLInputElement;
const layerField = document.getElementById('layer') as HTMLSelectElement;
const applyShapeButton = document.getElementById('apply-shape') as HTMLButtonElement;
const addShapeButton = document.getElementById('add-shape') as HTMLButtonElement;

applyButton.addEventListener('click', () => {
    const json = JSON.parse(jsonField?.value ?? "{}");
    init(json);
});


addShapeButton.addEventListener('click', () => {
    const shapeType = shapeTypeField.value;
    if (!shapeType)
        return;
    let array: any = currentJSON.floors[0];
    for (const x of shapeType.split('.'))
        array = array ? array[x] as typeof currentJSON.floors[0]['glass'] : [];
    array?.push({ x: currentJSON.l / 4, y: 0, z: currentJSON.d / 4, l: currentJSON.l / 2, d: currentJSON.d / 2, h: currentJSON.h / 2, o: 'we' });
    init(currentJSON);
});

applyButton.click();

function updateUrl() {
    let url = `?layer=${layerField.value}&view=${viewField.value}`
    if (modeField.value)
        url += "&" + modeField.value + "=true";
    urlField.value = url;
}

layerField.addEventListener('input', () => updateUrl());
viewField.addEventListener('input', () => updateUrl());
modeField.addEventListener('input', () => updateUrl());

applyShapeButton.addEventListener('click', () => {
    if (!selectedShape)
        return;
    const originalObject = lookup.get(selectedShape.wall);
    if (!originalObject)
        return;
    originalObject.x = +shapeXField.value;
    originalObject.y = +shapeYField.value;
    originalObject.z = +shapeZField.value;
    originalObject.l = +shapeLField.value;
    originalObject.d = +shapeDField.value;
    originalObject.h = +shapeHField.value;
    selectedShape = null;
    document.getElementById('shape-settings')?.classList.add('hidden');
    init(currentJSON);
});

document.addEventListener('click', (event) => {
    if (!renderer || !lookup)
        return;

    if (!(event.target instanceof HTMLDivElement))
        return;

    const info = renderer.getWall(event.target);
    if (!info)
        return;

    selectedShape?.element.classList.remove('selected');
    selectedShape = info;
    selectedShape?.element.classList.toggle('selected');
    document.getElementById('shape-settings')?.classList.remove('hidden');
    const originalObject = lookup.get(info.wall);
    if (!originalObject)
        return;

    shapeXField.value = originalObject.x.toString();
    shapeYField.value = originalObject.y.toString();
    shapeZField.value = originalObject.z.toString();
    shapeLField.value = originalObject.l.toString();
    shapeDField.value = originalObject.d.toString();
    shapeHField.value = originalObject.h.toString();
});