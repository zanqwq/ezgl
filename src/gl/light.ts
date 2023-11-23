import { FBO } from "./FBO";
import { Matrix4x4, Point, Vector } from "./geometry";
import { Primitive } from "./primitive";
import { Shape } from "./shape";
import { Transform } from "./transform";

export class PointLight {
  pos: number[] 
  color: number[];
  constructor(pos: number[], color: number[]) {
    this.pos = pos;
    this.color = color;
  }
}

export class DirectionalLight {
  pos: number[];
  dir: number[];
  up: number[];
  color: number[];
  fbo: FBO | undefined;

  constructor(pos: number[], dir: number[], up: number[], color: number[]) {
    this.pos = pos;
    this.dir = dir;
    this.up = up;
    this.color = color;
  }

  getLightMVP(shape: Shape) {
    const model = shape.obj2world;

    const p = new Point(this.pos[0], this.pos[1], this.pos[2]);
    const view = Transform.lookAt(
      p,
      p.add(new Point(
        this.pos[0] + this.dir[0],
        this.pos[1] + this.dir[1],
        this.pos[2] + this.dir[2]
      )),
      new Vector(this.up[0], this.up[1], this.up[2])
    );

    const projection = Transform.orthoTransform(5, -5, 5, -5, -5, -1000);

    return projection.multi(view.multi(model));
  }

  setFBO(canvas: HTMLCanvasElement) {
    if (this.fbo) return;
    this.fbo = new FBO(canvas);
  }
}