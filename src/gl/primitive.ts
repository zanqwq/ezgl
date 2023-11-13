import { IMaterial } from "./material";
import { Shape } from "./shape";

// TODO: primitive and aggregate
export class Primitive {
  shape: Shape;
  material: IMaterial;
  constructor(shape: Shape, material: IMaterial) {
    this.shape = shape;
    this.material = material
  }
}