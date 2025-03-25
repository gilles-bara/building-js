import { APIBuilding, Building } from "./building";
import { Renderer } from "./renderer";

let params = new URLSearchParams(window.location.hash.replace('#', '?'));
let latestFile = '';
let currentRenderer: Renderer;
let latestBuilding: APIBuilding;
async function init(file: string = params.get('file') ?? './assets/json/building.json'): Promise<void> {
    if (latestFile !== file) {
        const req = await fetch(file, { method: 'GET', mode: 'cors' });
        latestBuilding = (await req.json()) as APIBuilding;
        const shouldSwap = window.innerWidth < window.innerHeight !== latestBuilding.l < latestBuilding.d;
        if (shouldSwap)
            Building.rotate(latestBuilding);
    }
    const building = Building.fromJSON(latestBuilding);
    if (currentRenderer)
        currentRenderer.apply(building.building, params.get('floor') ?? '', params.get('layer') ?? '', false);
    else
        currentRenderer = new Renderer(building.building, params.get('floor') ?? '', params.get('layer') ?? '');
    if (params.get('view') != null)
        currentRenderer.setView(params.get('view') ?? '');
    latestFile = file;
    if (params.get('xray') === 'true')
        document.body.classList.add('x-ray');
    else
        document.body.classList.remove('x-ray');

    if (params.get('mono') === 'true')
        document.body.classList.add('mono');
    else
        document.body.classList.remove('mono');
}

window.addEventListener('hashchange', (event) => {
    params = new URLSearchParams(window.location.hash.replace('#', '?'));
    init();
});

init();