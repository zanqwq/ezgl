import { Matrix4x4, Point, Ray, Vector } from "./geometry";

export class Transform {
  m: Matrix4x4;
  // for quick inverse
  mInv: Matrix4x4;

  constructor(m: Matrix4x4, mInv = m.inverse()) {
    this.m = m;
    this.mInv = mInv;
  }

  transpose() {
    return new Transform(this.m.transpose(), this.mInv.transpose());
  }

  inverse() {
    return new Transform(this.mInv, this.m);
  }

  multi(t: Transform): Transform {
    return new Transform(this.m.multi(t.m));
  }

  static translate(x = 0, y = 0, z = 0): Transform {
    return new Transform(
      new Matrix4x4([
        [1, 0, 0, x],
        [0, 1, 0, y],
        [0, 0, 1, z],
        [0, 0, 0, 1],
      ]),
      new Matrix4x4([
        [1, 0, 0, -x],
        [0, 1, 0, -y],
        [0, 0, 1, -z],
        [0, 0, 0, 1],
      ]),
    );
  }

  static scale(x = 1, y = 1, z = 1): Transform {
    return new Transform(
      new Matrix4x4([
        [x, 0, 0, 0],
        [0, y, 0, 0],
        [0, 0, z, 0],
        [0, 0, 0, 1],
      ]),
      new Matrix4x4([
        [1/x, 0, 0, 0],
        [0, 1/y, 0, 0],
        [0, 0, 1/z, 0],
        [0, 0, 0, 1],
      ])
    );
  }

  static rotateX(rad: number) {
    const sin = Math.sin(rad);
    const cos = Math.cos(rad);
    const m = new Matrix4x4([
      [1, 0, 0, 0],
      [0, cos, -sin, 0],
      [0, sin, cos, 0],
      [0, 0, 0, 1],
    ]);

    return new Transform(m, m.transpose());
  }
  // 因为 cross(x, y) = z, cross(y, z) = x, cross(x, z) = -y
  // 所以这里符号和 rotateX, rotateZ 不同
  static rotateY(rad: number) {
    const sin = Math.sin(rad);
    const cos = Math.cos(rad);
    const m = new Matrix4x4([
      [cos, 0, sin, 0],
      [0, 1, 0, 0],
      [-sin, 0, cos, 0],
      [0, 0, 0, 1],
    ]);

    return new Transform(m, m.transpose());
  }
  static rotateZ(rad: number) {
    const sin = Math.sin(rad);
    const cos = Math.cos(rad);
    const m = new Matrix4x4([
      [cos, -sin, 0, 0],
      [sin, cos, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ]);

    return new Transform(m, m.transpose());
  }

  /*
  对 v 沿任意轴 a 旋转 t 得到 v'

  ------------------------------------------------
  STEP 1:
  vPara = proj(v, a)
        = cosTheta * |v| * a
        = (dot(a, v) / |a||v|) * |v| * a,
        = dot(a, v) * a
        = (xa * xv + ya * yv + za * zv) * a
        = (xa * xv + ya * yv + za * zv) * xa + (xa * xv + ya * yv + za * zv) * ya + (xa * xv + ya * yv + za * zv) * za
        = (xa^2 + xa*ya + xa*za) * xv + (xa*ya + ya^2 + ya*za) * yv + (xa*za + ya*za + za^2) * zv
        = a * a^T * v

  vPerp = v - vPara = (I - a * a^T) * v,

  b = vPerp.normlized

  c = a X b

  NOTE: |a| = |b| = |c| = 1

  现在我们有了: a, b, c, vPara, vPerp

  ----------------------------------------------
  STEP 2: 通过 a, b, c, vPara, vPerp 计算 v'Para, v'Perp, 从而得到 v'
  v'Para = vPara = a * a^T * v

  v'Perp = proj(v'Perp, b) + proj(v'Perp, c)
         = |v'Perp| * cosT * b + |v'Perp| * cos(pi/2 - t) * c
         = |vPerp| * cosT * b + |vPerp| * sinT * c
         = cosT * vPerp + sinT * (a X v)
         = cosT * (I - a * a^T) * v + sinT * MatCrossA * v

  NOTE: MatCrossA = [
    0    -za  ya   0
    za   0    -xa  0
    -ya  xa   0    0
    0    0    0    1
  ]

  v' = v'Para + v'Perp
     = a * a^T * v + cosT * (I - a * a^T) * v + sinT * MatCrossA * v
     = cosT * I * v + (1 - cosT) * (a * a^T) * v + sinT * MatCrossA * v

  所以: 旋转矩阵 = cosT * I + (1 - cosT) * (a * a^T) + sinT * MatCrossA
  */
  static rotate(a: Vector, rad: number) {
    const xa = a.x, ya = a.y, za = a.z;
    const cosT = Math.cos(rad);
    const sinT = Math.sin(rad);

    // cosT * I
    const t = Matrix4x4.Identity().multiScalar(cosT);

    // (1 - cosT) * (a * a^T)
    const tt = new Matrix4x4([
      [xa * xa, xa * ya, xa * za, 0],
      [xa * ya, ya * ya, ya * za, 0],
      [xa * za, ya * za, za * za, 0],
      [0, 0, 0, 1],
    ]).multiScalar(1 - cosT);

    // sinT * MatCrossA
    const ttt = new Matrix4x4([
      [0, -za, ya, 0],
      [za, 0, -xa, 0],
      [-ya, xa, 0, 0],
      [0, 0, 0, 1],
    ]).multiScalar(sinT);

    const res = t.add(tt).add(ttt);

    return new Transform(res)
  }

  /*
  look at 变换, 把 world space 的某个点 transform 到 view space 下

  先考虑把 world space 的 pos 变成 view space 的原点:
  MatTranslate = [
    1 0 0 -xPos
    0 1 0 -yPos
    0 0 1 -zPos
    0 0 0 1
  ]

  再考虑把 view space 的 x, y, -z 变成 world space 的 cross(look, up), up, look;
  MatRotateAxis^-1 = [
    xLookXUp xUp -xLook 0
    yLookXUp yUp -yLook 0
    zLookXUp zUp -zLook 0
    0 0 0 1
  ]
  可以求证该矩阵乘 view space 的 x(1, 0, 0, 1), y(0, 1, 0, 1), -z(0, 0, -1, 1) 的结果符合预期

  由于是正交矩阵, 所以 MatRotateAxis = Transpos(MatRotateAxis^-1)

  all inputs are world space
  */
  static lookAt(pos: Point, tar: Point, _up: Vector): Transform {
    const translate = Transform.translate(-pos.x, -pos.y, -pos.z);
    const up = _up.normalized();

    const look = tar.sub(pos).normalized();
    const lookCrossUp = Vector.cross(look, up).normalized();
    const matRotateAxisInv = new Matrix4x4([
      [lookCrossUp.x, up.x, -look.x, 0],
      [lookCrossUp.y, up.y, -look.y, 0],
      [lookCrossUp.z, up.z, -look.z, 0],
      [0, 0, 0, 1],
    ]);
    
    const rotateAxis = new Transform(matRotateAxisInv.transpose(), matRotateAxisInv);

    return rotateAxis.multi(translate);
  }

  static orthoTransform(r: number, l: number, t: number, b: number, n: number, f: number) {
    // z 反转一下, 方便后面 gl depth test 算法用 LEARNEST, z 越小的通过测试
    const scale = Transform.scale(2 / (r - l), 2 / (t - b), -2 / (n - f));
    const translate = Transform.translate(-(r + l) / 2, -(t + b) / 2, -(n + f) / 2);
    return scale.multi(translate);
  }

  static perspectTranform(fovY: number, aspectRatio: number, zNear: number, zFar: number) {
    const n = zNear, f = zFar;
    const t = Math.abs(Math.tan(fovY / 2) * n), b = -t;
    const r = t / aspectRatio, l = -r;

    const matPersp2Ortho = new Matrix4x4([
      [n, 0, 0, 0],
      [0, n, 0, 0],
      [0, 0, n + f, -n * f],
      [0, 0, 1, 0],
    ]);
    const persp2orthoTransform = new Transform(matPersp2Ortho);

    return Transform.orthoTransform(r, l, t, b, n, f).multi(persp2orthoTransform);
  }

  transformPoint(p: Point) {
    const x = this.m.m[0][0] * p.x + this.m.m[0][1] * p.y + this.m.m[0][2] * p.z + this.m.m[0][3];
    const y = this.m.m[1][0] * p.x + this.m.m[1][1] * p.y + this.m.m[1][2] * p.z + this.m.m[1][3];
    const z = this.m.m[2][0] * p.x + this.m.m[2][1] * p.y + this.m.m[2][2] * p.z + this.m.m[2][3];
    const w = this.m.m[3][0] * p.x + this.m.m[3][1] * p.y + this.m.m[3][2] * p.z + this.m.m[3][3];
    const res = new Point(x, y, z);
    if (w === 1) return res;
    return res.multiScalar(1 / w);
  }
  transformVector(v: Vector, db = false) {
    db && console.log('tv', this.m.m, v);
    const x = this.m.m[0][0] * v.x + this.m.m[0][1] * v.y + this.m.m[0][2] * v.z;
    const y = this.m.m[1][0] * v.x + this.m.m[1][1] * v.y + this.m.m[1][2] * v.z;
    const z = this.m.m[2][0] * v.x + this.m.m[2][1] * v.y + this.m.m[2][2] * v.z;
    db && console.log('result', x, y, z);
    return new Vector(x, y, z);
  }

  /*
  对于任意一种变换 M, 不能直接将 M 应用到法线上, 因为这样变换后的法线和平面不一定垂直
  0 = n * t = n^T * t

  0 = (n')^T * t'
    = (Sn)^T * M*t
    = (n)^T * S^T * M*t
  当 S^T * M = I 时成立, 两边乘 (S^T)^-1 得到 M = (S^T)^-1, M^-1 = S^T, S = (M^-1)^T
  最终得到法线变换矩阵 = 变换矩阵逆的转置
  */
  transformNormal(n: Vector) {
    const { x, y, z } = n;
    const { m } = this.mInv.transpose();
    return new Vector(
      m[0][0] * x + m[0][1] * y + m[0][2] * z,
      m[1][0] * x + m[1][1] * y + m[1][2] * z,
      m[2][0] * x + m[2][1] * y + m[2][2] * z,
    );
  }
  static normalTransform(transform: Transform) {
    return transform.inverse().transpose();
  }

  transformRay(r: Ray) {
  }
}
