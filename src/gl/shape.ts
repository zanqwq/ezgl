import { Vector } from "./geometry";
import { Transform } from "./transform";

export class Shape {
  obj2world: Transform
  world2Obj: Transform

  positions: number[][] = [];
  positionsBuffer: WebGLBuffer | null = null;

  texCoors: number[][] = [];
  texCoordsBuffer: WebGLBuffer | null = null;

  normals: number[][] = [];
  normalsBuffer: WebGLBuffer | null = null;

  indices: number[][] = [];
  indicesBuffer: WebGLBuffer | null = null;

  // getBounding
  // getArea
  // intersect

  constructor(obj2world: Transform, world2obj: Transform) {
    this.obj2world = obj2world;
    this.world2Obj = world2obj
  }

  compiled: boolean = false;
  compile(canvas: HTMLCanvasElement) {
    // if (this.compiled) return;
    // this.compiled = true;

    const gl = canvas.getContext("webgl");
    if (!gl) return;

    this.positionsBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.positions.flat()), gl.STATIC_DRAW);

    this.normalsBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.normals.flat()), gl.STATIC_DRAW);

    this.texCoordsBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.normals.flat()), gl.STATIC_DRAW);

    this.indicesBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indicesBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices.flat()), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
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
    const positions = [
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
    this.positions = positions;

    const normals = [
      ...new Array(4).fill([1, 0, 0]),
      ...new Array(4).fill([-1, 0, 0]),
      ...new Array(4).fill([0, 1, 0]),
      ...new Array(4).fill([0, -1, 0]),
      ...new Array(4).fill([0, 0, 1]),
      ...new Array(4).fill([0, 0, -1]),
    ];
    this.normals = normals;

    const texCoors: number[][] = [];
    for (let i = 0; i < 6; i++) {
      texCoors.push([1, 1], [0, 1], [0, 0], [1, 0]);
    }
    this.texCoors = texCoors;

    const indices = [
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
    ];
    this.indices = indices;
  }
}

// pane 不能完全薄, 不然法线不好处理
export class Pane extends Cube {
  constructor(o2w: Transform, w2o: Transform, w: number, h: number) {
    super(o2w, w2o, w, h, 0.1);
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
    const positions: number[][] = [];
    const normals: number[][] = [];
    const texCoors: number[][] = [];

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

        positions.push([x, y, z]);

        const norVec = new Vector(x, y, z).normalized();
        normals.push([norVec.x, norVec.y, norVec.z]);

        texCoors.push([u, v]);
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

    this.positions = positions;
    this.normals = normals;
    this.texCoors = texCoors;
    this.indices = indices;
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

    this.positions = aPos;
    this.normals = aNor;
    this.texCoors = aTex;
    this.indices = indices;
  }
}

export class Clinder extends Shape {
  constructor(o2w: Transform, w2o: Transform, radius: number, h: number, seg = 32) {
    super(o2w, w2o);
    // 同样跟 cone 一样, 同一个 vertex 在不同情况下渲染时, 它的 normal 朝向不同 
    // 所以分三个部分画, 上面, 侧面, 下面
    const positions: number[][] = [];
    const normals: number[][] = [];
    const texCoors: number[][] = [];
    const indices: number[][] = [];

    // 上面
    positions.push([0, h / 2, 0]);
    normals.push([0, 1, 0]);
    for (let i = 0; i <= seg; i++) {
      const radian = 2 * Math.PI * i / seg;
      const len = positions.length;
      positions.push([radius * Math.cos(radian), h / 2, -radius * Math.sin(radian)]);
      normals.push([0, 1, 0]);
      if (i === 0) continue;
      indices.push([0, len, len - 1])
    }

    // 下面
    const bottomIdx = positions.length;
    positions.push([0, -h / 2, 0]);
    normals.push([0, -1, 0]);
    for (let i = 0; i <= seg; i++) {
      const radian = 2 * Math.PI * i / seg;
      const len = positions.length;
      positions.push([radius * Math.cos(radian), -h / 2, -radius * Math.sin(radian)]);
      normals.push([0, -1, 0]);
      if (i === 0) continue;
      indices.push([bottomIdx, len, len - 1]);
    }

    // 侧面
    for (let i = 0; i <= seg; i++) {
      const radian = 2 * Math.PI * i / seg;
      const dx = radius * Math.cos(radian);
      const dz = -radius * Math.sin(radian);
      positions.push([dx, h / 2, dz], [dx, -h / 2, dz]);
      const nor = [Math.cos(radian), 0, -Math.sin(radian)];
      normals.push(nor, nor);
      if (i === 0) continue;
      /*
      1 -- 3
      |  / |
      | /  |
      2 -- 4
      */
      const idx = positions.length - 1;
      // (4 3 2), (3, 2, 1)
      indices.push([idx, idx - 1, idx - 2], [idx - 1, idx - 2, idx - 3]);
    }

    this.positions = positions;
    this.normals = normals;
    this.texCoors = texCoors;
    this.indices = indices;
  }
}

// 同样处理成很矮的 clinder
export class Circle extends Clinder {
  constructor(o2w: Transform, w2o: Transform, radius: number, segments = 32) {
    super(o2w, w2o, radius, 0.1, segments);
  }
}