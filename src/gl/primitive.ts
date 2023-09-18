import { Material } from "./material";
import { Shape } from "./shape";

// TODO: primitive and aggregate
export class Primitive {
  shape: Shape;
  material: Material | undefined
  constructor(shape: Shape, material?: Material) {
    this.shape = shape;
    this.material = material
  }
}