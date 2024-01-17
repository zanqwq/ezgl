import { Point, Vector } from "./geometry";
import { Transform } from "./transform";

export class Camera {
  fovY: number;
  aspectRatio: number;
  zNear: number;
  zFar: number;

  viewTranform: Transform;
  orthoTransform: Transform;
  clipTransform: Transform;

  constructor(fovY: number, aspectRatio: number, zNear: number, zFar: number) {
    this.fovY = fovY;
    this.aspectRatio = aspectRatio;
    this.zNear = zNear;
    this.zFar = zFar;


    const n = zNear, f = zFar;
    const t = Math.abs(Math.tan(fovY / 2) * n), b = -t;
    const r = t / aspectRatio, l = -r;

    // transform to [-1, 1]^3 canonical cube
    // const matOrtho = new Matrix4x4([
    //   [2 / (r - l), 0, 0, -(r + l) / 2],
    //   [0, 2 / (t - b), 0, -(t + b) / 2],
    //   [0, 0, 2 / (n - f), -(n + f) / 2],
    //   [0, 0, 0, 1],
    // ]);
    this.orthoTransform = Transform.orthoTransform(r, l, t, b, n, f);

    this.clipTransform = Transform.perspectTranform(fovY, aspectRatio, zNear, zFar);

    this.viewTranform = Transform.lookAt(new Point(0, 0, 0), new Point(0, 0, -1), new Vector(0, 1, 0));
  }

  lookAt(pos: Point, tar: Point, up: Vector) {
    this.viewTranform = Transform.lookAt(pos, tar, up);
  }
}