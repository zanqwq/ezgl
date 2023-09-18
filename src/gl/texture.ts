interface ITexture {}
export class Texture implements ITexture {
  url?: string
  isVedio = false;
  constructor(url: string, isVedio = false) {
    this.url = url;
    this.isVedio = isVedio
  }
}