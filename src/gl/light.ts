import { FBO } from "./FBO";
import { Point, Vector } from "./geometry";
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
  fbo: FBO | null = null;

  constructor(pos: number[], dir: number[], up: number[], color: number[]) {
    this.pos = pos;
    this.dir = dir;
    this.up = up;
    this.color = color;
  }

  getLightMVP(shape: Shape, r = 100, t = 100, n = -1, f = -500) {
    const model = shape.obj2world;

    const pos = new Point(this.pos[0], this.pos[1], this.pos[2]);
    const tar = new Point(
      this.pos[0] + this.dir[0],
      this.pos[1] + this.dir[1],
      this.pos[2] + this.dir[2]
    );
    const view = Transform.lookAt(
      pos,
      tar,
      new Vector(this.up[0], this.up[1], this.up[2])
    );
    
    const modelView = view.multi(model);

    const projection = Transform.orthoTransform(r, -r, t, -t, n, f);

    const mvp = projection.multi(modelView);

    return mvp;
  }

  initFBO(canvas: HTMLCanvasElement) {
    this.fbo = new FBO(canvas);
  }
}