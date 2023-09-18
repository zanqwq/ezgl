import { ArrayOfLen } from "../types";

export class Point {
  x: number;
  y: number;
  z: number;

  constructor(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  add(p: Point) {
    return new Point(
      this.x + p.x,
      this.y + p.y,
      this.z + p.z,
    );
  }

  addVec(v: Vector) {
    return new Point(
      this.x + v.x,
      this.y + v.y,
      this.z + v.z,
    );
  }

  sub(p: Point) {
    return new Vector(
      this.x - p.x,
      this.y - p.y,
      this.z - p.z,
    );
  }

  subVec(v: Vector) {
    return new Point(
      this.x - v.x,
      this.y - v.y,
      this.z - v.z,
    );
  }

  multi(p: Point) {
    return new Vector(
      this.x * p.x,
      this.y * p.y,
      this.z * p.z,
    );
  }

  multiScalar(k: number) {
    return new Point(this.x * k, this.y * k, this.z * k);
  }

  reverse() {
    return new Point(-this.x, -this.y, -this.z);
  }
}

export class Vector {
  x: number
  y: number
  z: number

  constructor(x: number, y: number, z: number, w: number = 1) {
    this.x = x
    this.y = y
    this.z = z
  }

  add(v: Vector) {
    return new Vector(this.x + v.x, this.y + v.y, this.z + v.z);
  }

  sub(v: Vector) {
    return new Vector(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  multi(v: Vector) {
    return new Vector(this.x * v.x, this.y * v.y, this.z * v.z);
  }

  multiScalar(k: number) {
    return new Vector(this.x * k, this.y * k, this.z * k);
  }

  reverse() {
    return new Vector(-this.x, -this.y, -this.z);
  }

  norm(): number {
    return Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2);
  }

  normalized() {
    const t = this.norm();
    return new Vector(
      this.x /  t,
      this.y / t,
      this.z / t,
    );
  }

  static dot(v1: Vector, v2: Vector): number {
    return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  }

  /*
  [
    [0, -z1, y1],
    [z1, 0, -x1],
    [-y1, x1, 0],
  ] * [x2, y2, z2]^T
  */
  static cross(v1: Vector, v2: Vector): Vector {
    const x1 = v1.x, y1 = v1.y, z1 = v1.z;
    const x2 = v2.x, y2 = v2.y, z2 = v2.z;
    return new Vector(
      y1 * z2 - z1 * y2,
      z1 * x2 - x1 * z2,
      x1 * y2 - y1 * x2,
    );
  }
}

enum Coordinate { X, Y, Z }

export class BoundingBox {
  pMin: Point;
  pMax: Point;

  constructor(pMin: Point, pMax: Point) {
    this.pMin = pMin;
    this.pMax = pMax;
  }

  getDiagonal() {
    return this.pMax.sub(this.pMin);
  }

  getSurfaceArea() {
    const { x, y, z } = this.getDiagonal();
    return 2 * (x*y + x*z + y*z);
  }

  getVolume() {
    const { x, y, z } = this.getDiagonal();
    return x * y * z;
  }

  getMaxExtend() {
    const { x, y, z } = this.getDiagonal();
    if (x > y && x > z) {
      return Coordinate.X;
    } else if (y > z) {
      return Coordinate.Y;
    }
    return Coordinate.Z;
  }

  // TODO:
  intersectP(r: Ray) {
  }
}

export class Ray {
  origin: Point | undefined;
  direction: Vector | undefined;
  // 介质
  // medium
}

export class Intersection {
  p!: Point;
  t!: number;
  n!: Vector;
}

type M = ArrayOfLen<ArrayOfLen<number, 4>, 4>;

const cloneMatrix = (m: ArrayOfLen<ArrayOfLen<number, number>, number>) => {
  const res = [] as any;
  for (let i = 0, len = m.length; i < len; i++)
    res.push([...m[i]]);
  return res;
};
const calcDet = (m: ArrayOfLen<ArrayOfLen<number, number>, number>) => {
  const len = m.length;
  if (len === 0) {
    return 0;
  }
  if (len === 1) {
    return m[0][0];
  }
  if (len === 2) {
    return m[0][0] * m[1][1] - m[0][1] * m[1][0];
  }

  let res = 0;
  for (let c = 0; c < len; c++) {
    const subM = [];
    for (let i = 1; i < len; i++) {
      const t = [];
      for (let j = 0; j < len; j++) {
        if (j === c) continue;
        t.push(m[i][j]);
      }
      subM.push(t);
    }
    res += Math.pow(-1, c) * m[0][c] * calcDet(subM as any);
  }
  return res;
};

export class Matrix4x4 {
  m: M = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];

  constructor(m: M) {
    for (let i = 0; i < 4; i++) {
      this.m[i] = [...m[i]] as any;
    }
  }

  add(a: Matrix4x4) {
    const newM = [[], [], [], []] as any;
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        newM[i][j] = this.m[i][j] + a.m[i][j];
      }
    }
    return new Matrix4x4(newM);
  }

  sub(a: Matrix4x4) {
    const newM = [[], [], [], []] as any;
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        newM[i][j] = this.m[i][j] - a.m[i][j];
      }
    }
    return new Matrix4x4(newM);
  }

  multi(a: Matrix4x4) {
    const newM = [[], [], [], []] as any;
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        newM[i][j] = 0
          + this.m[i][0] * a.m[0][j]
          + this.m[i][1] * a.m[1][j]
          + this.m[i][2] * a.m[2][j]
          + this.m[i][3] * a.m[3][j];
      }
    }
    return new Matrix4x4(newM);
  }
  
  multiScalar(a: number) {
    const newM = [[], [], [], []] as any;
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        newM[i][j] = this.m[i][j] * a;
      }
    }
    return new Matrix4x4(newM);
  }

  transpose() {
    const newM = [[], [], [], []] as any;
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        newM[i][j] = this.m[j][i];
      }
    }
    return new Matrix4x4(newM);
  }

  /*
  初等变换
  1. 交换
  2. 乘
  3. 乘加
  */
  exchange(i: number, j: number, col = false) {
    const newM = cloneMatrix(this.m);
    for (let t = 0; t < 4; t++) {
      if (col) {
        [newM[t][i], newM[t][j]] = [newM[t][j], newM[t][i]];
      } else {
        [newM[i][t], newM[j][t]] = [newM[j][t], newM[i][t]];
      }
    }
    return new Matrix4x4(newM);
  }
  // times k on row/col i
  times(k: number, i: number, col: boolean) {
    const newM = cloneMatrix(this.m);
    for (let t = 0; t < 4; t++) {
      if (col) {
        newM[t][i] *= k;
      } else {
        newM[i][t] *= k;
      }
    }
    return new Matrix4x4(newM);
  }
  // times k on row/col i and plus on row/col j
  timesAndPlusOn(k: number, i: number, j: number, col = false) {
    const newM = cloneMatrix(this.m);
    for (let t = 0; t < 4; t++) {
      if (col) {
        newM[t][j] += newM[t][i] * k;
      } else {
        newM[i][j] += newM[i][t] * k;
      }
    }
    return new Matrix4x4(newM);
  }

  /*
  返回行列式值, 求法

  1. 对角线法

  2. 逆序对法:
  sum[((-1)^inv(j1, j2, ... jn)) * a_1j1 * ... a_1jn]
  其中 sum 表示所有 j1, ... jn 的排列组合, inv 表示跑列组合的逆序对数
  例如排列为 2 3 1, 逆序对为 2, 则该项为:
  a_12 * a_23 * a_31

  3. 展开定理:
  按某行展开: a_i1 * A_i1 + ... + a_in * A_in, 其中 A 为代数余子式
  按某列展开: a_1j * A_1j + ... + a_nj * A_nj
  */
  det() {
    return calcDet(this.m);
  }
  // 余子式: 除去 i 行和 j 列元素组成的行列式
  cofactor(i: number, j: number) {
    // 3 * 3
    const cofactorM = [] as any;
    for (let r = 0; r < 4; r++) {
      const t = [] as any;
      for (let c = 0; c < 4; c++) {
        if (r === i) continue;
        if (c === j) continue;
        t.push(this.m[r][c]);
      }
      if (t.length === 3) {
        cofactorM.push(t);
      }
    }
    return calcDet(cofactorM);
  }
  // 代数余子式: -1^(i + j) * cofactor(i, j)
  algerCofator(i: number, j: number) {
    return ((-1) ** (i + j)) *  this.cofactor(i, j);
  }
  /*
  返回伴随/共轭矩阵, 伴随矩阵 M[i][j] = algerCofactor(j, i)
  伴随矩阵性质 A*: A A* = A* A = |A|I
  A^-1 = A* / |A| 证明: 由于 A A* = A* A = |A|I, 所以 A (A* / |A|) = (A* / |A|) A = I, 符合逆矩阵定义
  */
  adjoint(): Matrix4x4 {
    const newM = [[], [], [], []] as any;
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        newM[i][j] = this.algerCofator(j, i);
      }
    }
    return new Matrix4x4(newM);
  }
  // 计算方式: 高斯消元 or A^-1 = adjoint / |A|
  inverse() {
    const d = this.det();
    if (d === 0) {
      return Matrix4x4.Zero();
    }
    return this.adjoint().multiScalar(1 / d);
  }

  // 秩: 线性无关向量数, TODO
  rank() {
    return 0;
  }

  /*
  eigen vector & eigen value

  对一个 n 维矩阵 A, 如果存在一个值 e, 和一个 n 维向量 E [x, y, z]^T 使得 A*E = e*E
  则称 e 为矩阵 A 的特征值, B 为矩阵 A 的特征向量

  求解: A*E = e*E, e*E - A*E = O, (e*I - A)E = O
  即 det(e*I - A)E = 0
  | e-a11 -a12 ... -a1n |
  | -a21 e-a22 ... -a2n |
  | ...                |
  | ...          e-ann|
  称该式为特征方程
  */

  /*
  克莱姆法求线性方程组:
  xj = |Aj| / |A|, 其中 A 是系数矩阵, Aj 是伴随矩阵的第 j 列换称方程组常数

  高斯消元法求线性方程组:
  通过初等变换把矩阵变成阶梯矩阵
  */

  /*
  二次型: n 元齐次二次方程
  */

  static Identity() {
    return new Matrix4x4([
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ])
  }

  static Zero() {
    return new Matrix4x4([
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ])
  }
}
