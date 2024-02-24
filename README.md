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

* 形状类

  球体
  ![sphere](./public/sphere.png)

  圆锥
  ![cone](./public/cone.png)

  立方体
  ![cube](./public/cube.png)

  圆柱体
  ![sphere](./public/clinder.png)

* 点光源

  ![plight](./public/sphere.png)
  
* 直线光源
  ![dlight](./public/dLight.png)
* 环境光源

  ![alight](./public/aLight.png)

* 镜头移动和实时阴影

  ![sm](./public/sm.gif)