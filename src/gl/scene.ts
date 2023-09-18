import { DirectionalLight, PointLight } from "./light";
import { Primitive } from "./primitive";

export class Scene {
  primitives: Primitive[] = [];
  ambientLights: number[][] = [];
  directionalLights: DirectionalLight[] = [];
  pointLights: PointLight[] = [];
}