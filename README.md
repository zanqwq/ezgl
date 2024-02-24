# ezgl

### Step 1: create a new scene
```ts
const scene = new Scene();
```

### Step 2: create shape
```ts
const sphereShape = new Sphere(Transform.translate(0, 0, -10), Transform.translate(0, 0, 10), 5);

```

### Step 3: create material and set texture
```ts
const sphereMat = new PhongMaterial();
// set texture by color or url
// sphereMat.map.color = [1, 0, 0]; red
sphereMat.map.url = '/wood.jpg';
```

### Step 4: create primitive by shape and material
```ts
const spherePrimitive = new Primitive(sphereShape, sphereMat);
```

### Step 5: add primitives into the scene
```ts
scene.primitives = [ spherePrimitive ];
```

### Step 6: set lights for the scene

### Step 5: add camera

### Step 6: start to render

### Demo

* shapes

  sphere
  ![sphere](./public/sphere.png)

  cone
  ![cone](./public/cone.png)

  cube
  ![cube](./public/cube.png)

  clinder
  ![sphere](./public/clinder.png)

* point light

  ![plight](./public/sphere.png)
  
* directional light
  ![dlight](./public/dLight.png)
* ambient light

  ![alight](./public/aLight.png)

* camera movement and real-time shadow

  ![sm](./public/sm.gif)