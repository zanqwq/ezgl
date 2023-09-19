import { ArrayOfLen } from "../types";
import { Vector } from "./geometry";
import { DrawConfig } from "./renderer";
import { Transform } from "./transform";

const vsTemplate = `
uniform mat4 uMatModelView;
uniform mat4 uMatProjection;
uniform mat4 uMatNormal;
uniform vec3 uColor;

attribute vec3 aPos;
attribute vec3 aNor;
attribute vec2 aTex;

varying vec3 vPos;
varying vec3 vNor;
varying vec2 vTex;

void main() {
  gl_Position = uMatProjection * uMatModelView * vec4(aPos, 1);
  gl_Position = gl_Position / gl_Position.w;

  vPos = vec3(gl_Position.x, gl_Position.y, gl_Position.z);
  // 注意, normalize 时 w 值也会影响 normalize, 所以应该用 vec3 做 normalize
  vec4 t = uMatNormal * vec4(aNor, 0);
  vNor = normalize(vec3(t.x, t.y, t.z));
  vTex = aTex;
}
`;

// 传 lights ? 设置 uniform int NUM_LIGHTS
// 然后 Light lights[NUM_LIGHTS]
// 不能 std::vector<Light>, 不能变长
// TODO: 可以控制渲染为 normal, wireframe, texture, or phong
const fsTemplate = `
#ifdef GL_ES
  precision highp float;
#endif

uniform mat4 uMatProjection;
uniform vec3 ambientLights[NUM_AMB_LIGHTS > 0 ? NUM_AMB_LIGHTS : 1];
uniform struct DirectionalLight {
  vec3 dir;
  vec3 color;
} directionalLights[NUM_DIR_LIGHTS > 0 ? NUM_DIR_LIGHTS : 1];
uniform struct PointLight {
  vec3 pos;
  vec3 color;
} pointLights[NUM_POINT_LIGHTS > 0 ? NUM_POINT_LIGHTS : 1];

uniform float uMaterialType;
uniform float uInteractWithLight;
uniform vec3 uColor;
uniform vec3 uEyePos;
uniform sampler2D uMap;

varying vec3 vPos;
varying vec3 vNor;
varying vec2 vTex;

void main() {
  vec3 norColor = vec3(
    (vNor.x + 1.0) / 2.0,
    (vNor.y + 1.0) / 2.0,
    (vNor.z + 1.0) / 2.0
  );
  vec4 t = texture2D(uMap, vTex);
  vec3 texColor = vec3(t.x, t.y, t.z);

  vec3 kd;
  if (uMaterialType == 0.0) {
    kd = norColor;
  } else if (uMaterialType == 1.0) {
    kd = texColor;
  } else if (uMaterialType == 2.0) {
    kd = uColor;
  }


  if (uInteractWithLight == 0.0) {
    gl_FragColor = vec4(kd, 1);
    return;
  }

  // 计算 pling-phong 反射模型 ambient + diffuse + specular
  vec3 color = vec3(0, 0, 0);

  vec3 ka = vec3(0.1, 0.05, 0.1);
  for (int i = 0; i < NUM_AMB_LIGHTS; i++) {
    color += ka * ambientLights[i];
  }

  vec3 eye_dir = normalize(uEyePos - vPos);
  vec3 ks = vec3(0.5, 0.5, 0.5);
  // 控制高光大小(值越大, pow 值越小, 高光越小)
  float p = 10.0;
  for (int i = 0; i < NUM_DIR_LIGHTS; i++) {
    vec3 light_intensity = directionalLights[i].color;
    vec3 light_dir = -normalize(directionalLights[i].dir);

    vec3 diffuse = kd * light_intensity * max(dot(vNor, light_dir), 0.0);
    vec3 specular = ks * light_intensity * pow(max(0.0, dot(vNor, normalize(light_dir + eye_dir))), p);

    color += diffuse + specular;
  }

  for (int i = 0; i < NUM_POINT_LIGHTS; i++) {
    // 球的表面积 A = 4*pi*r^2
    // 假设点光源在 r = 1 处能量为 I, 则总能量为 I * 4pi
    // 则在 r 处的能量为 I * 4pi / r^2 * 4pi
    // 即 I / r^2
    vec4 t = uMatProjection * vec4(pointLights[i].pos, 1);
    t /= t.w;
    vec3 lightPos = vec3(t.x, t.y, t.z);
    vec3 lightColor = pointLights[i].color;

    float rSquare = pow(length(lightPos - vPos), 2.0);
    vec3 light_intensity = lightColor / (rSquare < 1.0 ? 1.0 : rSquare);
    light_intensity = lightColor;
    vec3 light_dir = normalize(lightPos - vPos);

    vec3 diffuse = kd * light_intensity * max(dot(vNor, light_dir), 0.0);
    vec3 specular = ks * light_intensity * pow(max(0.0, dot(vNor, normalize(light_dir + eye_dir))), p);

    color += diffuse + specular;
  }

  gl_FragColor = vec4(color, 1);
}
`;

export class Shape {
  obj2world: Transform
  world2Obj: Transform
  drawCfg: DrawConfig | undefined;

  // getBounding
  // getArea
  // intersect

  constructor(obj2world: Transform, world2obj: Transform) {
    this.obj2world = obj2world;
    this.world2Obj = world2obj
  }
}

// 2d polygon, circle; 3d cube, sphere, cone, clinder, triangle mesh, aggregate
export class Cube extends Shape {
  constructor(
    obj2world: Transform,
    world2obj: Transform,
    a: number,
    b: number,
    c: number,
  ) {
    super(obj2world, world2obj);
    // 右
    const r = a / 2;
    // 上
    const t = b / 2;
    // 前
    const f = c / 2;

    // 按 xyz 的顺序来
    const aPos = [
      // 右左(r取反)
      [r, t, -f],
      [r, t, f],
      [r, -t, f],
      [r, -t, -f],
      [-r, t, -f],
      [-r, t, f],
      [-r, -t, f],
      [-r, -t, -f],

      // 上下(t取反)
      [r, t, -f],
      [-r, t, -f],
      [-r, t, f],
      [r, t, f],
      [r, -t, -f],
      [-r, -t, -f],
      [-r, -t, f],
      [r, -t, f],

      // 前后(f取反)
      [r, t, f],
      [-r, t, f],
      [-r, -t, f],
      [r, -t, f],
      [r, t, -f],
      [-r, t, -f],
      [-r, -t, -f],
      [r, -t, -f],
    ];

    const aNor = [
      ...new Array(4).fill([1, 0, 0]),
      ...new Array(4).fill([-1, 0, 0]),
      ...new Array(4).fill([0, 1, 0]),
      ...new Array(4).fill([0, -1, 0]),
      ...new Array(4).fill([0, 0, 1]),
      ...new Array(4).fill([0, 0, -1]),
    ];

    const aTex: number[][] = [];
    for (let i = 0; i < 6; i++) {
      aTex.push([1, 1], [1, 0], [0, 0], [0, 1]);
    }

    this.drawCfg = {
      drawVertexCnt: 6 * 6,
      drawMethod: WebGLRenderingContext.TRIANGLES,
      drawVertexIndexes: [
        // 右
        [0, 1, 2],
        [0, 2, 3],
        // 左
        [4, 5, 6],
        [4, 6, 7],
        // 上
        [8, 9, 10],
        [8, 10, 11],
        // 下
        [12, 13, 14],
        [12, 14, 15],
        // 前
        [16, 17, 18],
        [16, 18, 19],
        // 后
        [20, 21, 22],
        [20, 22, 23],
      ],
      vs: {
        source: vsTemplate,
        arrtris: { aPos, aNor, aTex },
      },
      fs: { source: fsTemplate },
    }
  }
}

// pane 不能完全薄, 不然法线不好处理
export class Pane extends Shape {
  constructor(o2w: Transform, w2o: Transform, w: number, h: number) {
    super(o2w, w2o);
    // 处理成很薄的 cube
    this.drawCfg = new Cube(o2w, w2o, w, h, 0.1).drawCfg;
  }
}

export class Sphere extends Shape {
  // hSeg, wSeg
  /*
  for i <= hSeg
    theta 北极到南极转角 = pi * i / hSeg

    for j <= wSeg
      fi 平面逆时针转角 = 2 * pi * j / wSeg

      y = r * cosTheta
      e = r * sinTheta
      x = e * cosFi
      z = e * sinFi

      pos = vec(x, y, z)
      nor = vertex.normalized()
      uv = ?
  */
  constructor(obj2world: Transform, world2obj: Transform, radius: number, hSeg = 16, wSeg = 32) {
    super(obj2world, world2obj);

    /*
    [
      // first level
      [[x, y, z], [xx, yy, zz], ...]
      // second level
      [[x, y, z], [xx, yy, zz], ...]
      ...
    ]
    */
    const aPos: number[][] = [];
    const aNor: number[][] = [];
    const aTex: number[][] = [];

    for (let i = 0; i <= hSeg; i++) {
      const v = i / hSeg;
      const theta = Math.PI * v;
      for (let j = 0; j <= wSeg; j++) {
        const u = j / wSeg;
        const phi = 2 * Math.PI * u;
        const y = radius * Math.cos(theta);
        const e = radius * Math.sin(theta);
        const x = e * Math.cos(phi);
        const z = -e * Math.sin(phi);

        aPos.push([x, y, z]);

        const norVec = new Vector(x, y, z).normalized();
        aNor.push([norVec.x, norVec.y, norVec.z]);

        aTex.push([u, v]);
      }
    }
    const indices: number[][] = [];
    for (let i = 0; i < hSeg; i++) {
      for (let j = 0; j < wSeg; j++) {
        /*
        a ------ b
        | \      |
        |   \    |
        |     \  |
        a' ---- b'
        */
        const a = i * (wSeg + 1) + j, _a = (i + 1) * (wSeg + 1) + j, b = a + 1, _b = _a + 1;
        indices.push([a, _a, _b], [a, b, _b]);
      }
    }

    this.drawCfg = {
      drawMethod: WebGLRenderingContext.TRIANGLES,
      drawVertexCnt: indices.flat().length,
      drawVertexIndexes: indices,
      vs: {
        source: vsTemplate,
        arrtris: { aPos, aNor, aTex },
      },
      fs: { source: fsTemplate }
    }
  }
}

export class Cone extends Shape {
  constructor(o2w: Transform, w2o: Transform, radius: number, h: number, seg = 32) {
    super(o2w, w2o);
    // 底部的 vertex 要定两次, 一次是在画底的时候, 法线方向是 -y; 一次是画侧面的时候, 法线是半径指向的方向
    const aPos: number[][] = [];
    const aNor: number[][] = [];
    const aTex: number[][] = [];
    const indices: number[][] = [];

    aPos.push([0, 0, 0]);
    aNor.push([0, -1, 0]);
    for (let i = 0; i <= seg; i++) {
      const radian = 2 * Math.PI * i / seg;
      const len = aPos.length;
      aPos.push([radius * Math.cos(radian), 0, -radius * Math.sin(radian)]);
      aNor.push([0, -1, 0]);
      if (i === 0) continue;
      indices.push([0, len, len - 1]);
    }

    const topIdx = aPos.length;
    aPos.push([0, h, 0]);
    aNor.push([0, 1, 0]);
    for (let i = 0; i <= seg; i++) {
      const radian = 2 * Math.PI * i / seg;
      const len = aPos.length;
      aPos.push([radius * Math.cos(radian), 0, -radius * Math.sin(radian)]);
      aNor.push([Math.cos(radian), 0, -Math.sin(radian)]);
      if (i === 0) continue;
      indices.push([topIdx, len, len - 1]);
    }

    this.drawCfg = {
      drawMethod: WebGLRenderingContext.TRIANGLES,
      drawVertexCnt: indices.flat().length,
      drawVertexIndexes: indices,
      vs: { source: vsTemplate, arrtris: { aPos, aNor } },
      fs: { source: fsTemplate },
    }
  }
}

export class Clinder extends Shape {
  constructor(o2w: Transform, w2o: Transform, radius: number, h: number, seg = 32) {
    super(o2w, w2o);
    // 同样跟 cone 一样, 同一个 vertex 在不同情况下渲染时, 它的 normal 朝向不同 
    // 所以分三个部分画, 上面, 侧面, 下面
    const aPos: number[][] = [];
    const aNor: number[][] = [];
    const aTex: number[][] = [];
    const indices: number[][] = [];

    // 上面
    aPos.push([0, h / 2, 0]);
    aNor.push([0, 1, 0]);
    for (let i = 0; i <= seg; i++) {
      const radian = 2 * Math.PI * i / seg;
      const len = aPos.length;
      aPos.push([radius * Math.cos(radian), h / 2, -radius * Math.sin(radian)]);
      aNor.push([0, 1, 0]);
      if (i === 0) continue;
      indices.push([0, len, len - 1])
    }

    // 下面
    const bottomIdx = aPos.length;
    aPos.push([0, -h / 2, 0]);
    aNor.push([0, -1, 0]);
    for (let i = 0; i <= seg; i++) {
      const radian = 2 * Math.PI * i / seg;
      const len = aPos.length;
      aPos.push([radius * Math.cos(radian), -h / 2, -radius * Math.sin(radian)]);
      aNor.push([0, -1, 0]);
      if (i === 0) continue;
      indices.push([bottomIdx, len, len - 1]);
    }

    // 侧面
    for (let i = 0; i <= seg; i++) {
      const radian = 2 * Math.PI * i / seg;
      const dx = radius * Math.cos(radian);
      const dz = -radius * Math.sin(radian);
      aPos.push([dx, h / 2, dz], [dx, -h / 2, dz]);
      const nor = [Math.cos(radian), 0, -Math.sin(radian)];
      aNor.push(nor, nor);
      if (i === 0) continue;
      /*
      1 -- 3
      |  / |
      |/  |
      2 - 4
      */
      const idx = aPos.length - 1;
      // (4 3 2), (3, 2, 1)
      indices.push([idx, idx - 1, idx - 2], [idx - 1, idx - 2, idx - 3]);
    }

    this.drawCfg = {
      drawMethod: WebGLRenderingContext.TRIANGLES,
      drawVertexCnt: indices.flat().length,
      drawVertexIndexes: indices,
      vs: {
        source: vsTemplate,
        arrtris: { aPos, aNor },
      },
      fs: { source: fsTemplate },
    }
  }
}

// 同样处理成很矮的 clinder
export class Circle extends Shape {
  constructor(o2w: Transform, w2o: Transform, radius: number, segments = 32) {
    super(o2w, w2o);
    this.drawCfg = new Clinder(o2w, w2o, radius, 0.1, segments).drawCfg
  }
}