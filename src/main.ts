import { APIBuilding, Building } from "./building";
import { Renderer } from "./renderer";

const params = new URLSearchParams(window.location.search);
async function init(file: string): Promise<void> {
    const req = await fetch(file, { method: 'GET', mode: 'cors' });
    const response = (await req.json()) as APIBuilding;
    const shouldSwap = window.innerWidth < window.innerHeight !== response.l < response.d;
    if (shouldSwap)
        Building.rotate(response);
    const building = Building.fromJSON(response);
    const renderer = new Renderer(building.building, params.get('floor') ?? '', params.get('layer') ?? '');
    if (params.get('view') != null)
        renderer.setView(params.get('view') ?? '');
}

if (params.get('xray') === 'true')
    document.body.classList.add('x-ray');
if (params.get('mono') === 'true')
    document.body.classList.add('mono');

init(params.get('file') ?? './assets/json/building.json');