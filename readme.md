# Building Viewer

A lightweight web-based viewer to render and interact with 3D building models defined via JSON.

## Features

- 🏗️ Renders 3D representations of buildings using declarative JSON.
- 🧱 Supports building floors, walls, windows, items, and sensors.
- 🎮 Gesture and key-controlled interaction.
- 🔍 Supports view filters, x-ray, monochrome, and layer-based rendering.
- ⚙️ Fully client-side: No backend needed.

## Example JSON

The building configuration is defined in a JSON file, and needs to follow this format:

```ts
type Position = {
  x: number;
  y: number;
  z: number;
};

type orientation = "ns" | "we";

type Surface = {
  d: number;
  l: number;
};

type Block = Surface & { h: number };

type APIWall = Block & Position & { class?: string };

type Walls = (APIWall & { o: orientation })[];

type APISensor = {
  api: string;
  layer?: string;
  outside?: boolean;
  pollingInterval: number;
  stateProperty: string;
  unit?: string;
  valueProperty: string;
};

type APIBuilding = Block & {
  name: string;
  styles: { selector: string; style: string }[];
  floors: (Surface &
    Position & {
      name?: string;
      floors: Walls;
      ceilings?: Walls;
      walls: {
        outer: Walls;
        inner: Walls;
      };
      windows?: Walls;
      glass?: Walls;
      items?: Walls;
      sensors?: (APIWall & APISensor)[];
    })[];
};
```

And simple rack ([full version](https://github.com/gilles-bara/building-js/blob/master/assets/json/rack.json)) would look something like this ([live demo](https://slc-gillesba.skyline.local/building/index.html#file=./assets/json/rack.json&view=left%20back)):

```json
{
  "name": "rack",
  "l": 0.9,
  "h": 2,
  "d": 0.8,
  "styles": [
    {
      "selector": ".wall[class*=outer], .ceiling, .floor",
      "style": "background-color: #333"
    },
    {
      "selector": ".model.back::before",
      "style": "content:'X001'; position: absolute; right: 1vh; top: 1vh; font-size: 2.5vh; color: #fff"
    },
    ...
  ],
  "floors": [
    {
      "x": 0,
      "y": 0,
      "z": 0,
      "d": 0.8,
      "l": 0.9,
      "name": "Floor 1",
      "floors": [
        {
          "x": 0,
          "y": 0,
          "z": 0.01,
          "l": 0.9,
          "d": 0.78,
          "h": 0.1,
          "o": "we",
          "class": ""
        }
      ],
      "ceilings": [
        {
          "x": 0,
          "y": 1.9,
          "z": 0.01,
          "l": 0.9,
          "d": 0.78,
          "h": 0.1,
          "o": "we",
          "class": ""
        }
      ],
      "walls": {
        "outer": [
          {
            "x": 0.89,
            "y": 0,
            "z": 0.01,
            "l": 0.01,
            "d": 0.01,
            "h": 2,
            "o": "we",
            "class": ""
          },
          ...
        ],
        "inner": [
          {
            "x": 0.01,
            "y": 0.09,
            "z": 0.01,
            "l": 0.88,
            "d": 0.78,
            "h": 0.02,
            "o": "we",
            "class": ""
          },
          ...
        ]
      },
      "items": [
        {
          "x": 0,
          "y": 0.49,
          "z": 0.01,
          "l": 0.89,
          "d": 0.78,
          "h": 0.11,
          "o": "we",
          "class": "slot filled"
        },
        ...
      ]
    }
  ]
}
```

Key details:

- 🧭 `o` = orientation: "we" = west-east, "ns" = north-south
- 🧱 `walls.outer` and `windows` will hide automatically depending on the view to give an interior look.
- 📡 `sensors` can connect to an external API to display values and reflect states via CSS classes.

## Sensor Configuration

📡 Sensors are special building elements that can dynamically fetch and display data from APIs.

### Sensor Properties

Each sensor entry in the JSON includes the following:

- 📍 `x`, `y`, `z`, `l`, `d`, `h`: Position and size of the sensor in 3D space.
- 🧭 `o`: Orientation ("we" or "ns").
- 🎨 `class`: CSS classes applied to the sensor element.
- 🔗 `api`: URL of the external API to poll for data.
- 🧾 `unit`: Unit displayed with the value (e.g., "kWh☀️").
- ⏲️ `pollingInterval`: How often (in seconds) the sensor queries the API.
- 🌍 `outside`: Whether the sensor is placed outside the building.
- 🧩 `layer`: Logical layer to which the sensor belongs (used with `layer` URL param).
- ⚙️ `stateProperty`: Key in the API response that defines the sensor state. This value becomes a CSS class.
- 📊 `valueProperty`: Key in the API response used to display the sensor value.

### Example

```json
{
  "x": 2.55,
  "y": 2.7,
  "z": 1.14,
  "l": 1.11,
  "d": 1.85,
  "h": 0.04,
  "o": "we",
  "class": "black solar",
  "api": "testAPI",
  "unit": "kWh☀️",
  "pollingInterval": 10,
  "outside": true,
  "layer": "solar",
  "stateProperty": "powerstate",
  "valueProperty": "powerOutage"
}
```

### How It Works

- The viewer fetches the API defined in the `api` field.
- The JSON response is parsed.
- The value from `valueProperty` is displayed next to the sensor.
- The `stateProperty` becomes a dynamic CSS class, which allows styling based on state.
- Sensors can be filtered by layer using the `layer` URL parameter.

## URL Parameters

Use URL hash strategy to pass configuration:

```
#file=path/to/building.json&xray=true&mono=true&layer=solar&floor=Zero&view=top
```

Available parameters:

- 📁 `file`: Path to the building JSON file
- ⟳ `no-cache=true`: Enforce the latest version of the JSON file
- 🧬 `xray=true`: Show x-ray view
- 🎨 `mono=true`: Show monochromatic view
- 🧩 `layer=layername`: Filter visible elements by layer
- 🧱 `floor=floorname`: Display a specific floor only
- 🧭 `view=`: One of `top`, `front`, `back`, `left`, `right`, `front left`, `front right`, `back left`, `back right`

## Gestures and Controls

- ⌨️ **Arrow keys**: Rotate model

  - 🔼 Up: 2D top/plan view
  - 🔽 Down: 3D perspective view
  - ◀️▶️ Left/Right: Rotate building

## Build & Deployment

1. 🛠️ **Build Viewer**

   ```bash
   npm install
   npm run build
   ```

2. 📦 Extract and deploy `dist/building-js.zip` to your server.

3. 🛠️ **Build Editor (Optional JSON Creator UI)**

   ```bash
   cd editor
   npm install
   npm run build
   ```

4. 📦 Extract and deploy `dist/building-editor-js.zip` to your server.

## License

📄 MIT

## Directory Structure

```
/
├── assets/
│   └── json/
│       └── examples...
├── dist/
│   └── building-js.zip
├── editor/
│   └── dist/building-editor-js.zip
├── src/
└── README.md
```

## Contact

📬 For issues or suggestions, open an issue in the repository or contact the maintainer.
