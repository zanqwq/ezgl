import { Point, Vector } from "./geometry";
import { Transform } from "./transform";

export class Camera {
  fovY: number;
  aspectRatio: number;
  zNear: number;
  zFar: number;

  viewTransform: Transform;
  orthoTransform: Transform;
  clipTransform: Transform;

  pos: Point = new Point(0, 0, 0);
  tar: Point = new Point(0, 0, -1);
  up: Vector = new Vector(0, 1, 0);

  constructor(fovY: number, aspectRatio: number, zNear: number, zFar: number) {
    this.fovY = fovY;
    this.aspectRatio = aspectRatio;
    this.zNear = zNear;
    this.zFar = zFar;


    const n = zNear, f = zFar;
    const t = Math.abs(Math.tan(fovY / 2) * n), b = -t;
    const r = t / aspectRatio, l = -r;

    // transform to [-1, 1]^3 canonical cube
    this.orthoTransform = Transform.orthoTransform(r, l, t, b, n, f);

    this.clipTransform = Transform.perspectTranform(fovY, aspectRatio, zNear, zFar);

    this.viewTransform = Transform.lookAt(this.pos, this.tar, this.up);

      let w = 0;
      let d = 0;
      window.addEventListener('keydown', e => {
        let { pos, tar, up } = this;
        let { x, y, z } = pos;
        const lookDir = tar.sub(pos).normalized();
        const crossDir = lookDir.cross(up).normalized();
        // x^2 + y^2 + z^2 = 1
        // (wx)^2 + (wy)^2 + (wz)^2 = w^2
        if (e.key === 'w') {
          w = 1;
        } else if (e.key === 's') {
          w = -1;
        }
        x += lookDir.x * w;
        y += lookDir.y * w;
        z += lookDir.z * w;

        if (e.key === 'd') {
          d = 1;
        } else if (e.key === 'a') {
          d = -1;
        }
        x += crossDir.x * d;
        y += crossDir.y * d;
        z += crossDir.z * d;

        pos.x = x;
        pos.y = y;
        pos.z = z;
        tar = pos.addVec(lookDir);
        this.lookAt(pos, tar, up);
      });

      window.addEventListener('keyup', e => {
        if (e.key === 'w' || e.key === 's') {
          w = 0;
        }
        if (e.key === 'a' || e.key === 'd') {
          d = 0;
        }
      });
  }

  lookAt(pos: Point, tar: Point, up: Vector) {
    this.pos = pos;
    this.tar = tar;
    this.up = up;
    this.viewTransform = Transform.lookAt(pos, tar, up);
  }
}