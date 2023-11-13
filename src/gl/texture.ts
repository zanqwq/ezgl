import { FBO } from "./FBO";

interface ITexture {}
export class Texture implements ITexture {
  color?: number[] = [1, 1, 1, 1];
  url?: string
  fbo?: FBO;
}