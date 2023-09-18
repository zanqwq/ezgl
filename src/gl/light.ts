export class PointLight {
  pos: number[] 
  color: number[];
  constructor(pos: number[], color: number[]) {
    this.pos = pos;
    this.color = color;
  }
}
export class DirectionalLight {
  dir: number[] 
  color: number[];
  constructor(dir: number[], color: number[]) {
    this.dir = dir;
    this.color = color;
  }
}