import { FBO } from "./FBO";
import { checkIsPowerOf2 } from "./utils";

export class Texture {
  color?: number[] = [1, 1, 1, 1];
  url?: string
  fbo?: FBO;

  texture: WebGLTexture | null = null;
  compiled = false;

  compile(canvas: HTMLCanvasElement) {
    if (this.compiled) return;
    this.compiled = true;

    const gl = canvas.getContext('webgl');
    if (!gl) return;

    const level = 0;
    const internalFormat = gl.RGBA;
    const format = gl.RGBA;
    const type = gl.UNSIGNED_BYTE;

    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    if (this.url) {
      if (this.url.endsWith('mp4')) {
        const vedio = document.createElement('video');
        vedio.playsInline = true;
        vedio.muted = true;
        vedio.loop = true;

        let playing = false;
        let timeupdate = false;

        vedio.addEventListener('playing', () => {
          playing = true;
        }, true);
        vedio.addEventListener('timeupdate', () => {
          timeupdate = true;
        }, true)

        vedio.src = this.url;
        vedio.play();

        const timer = setInterval(() => {
          if (!playing || !timeupdate) return;
          // Tell WebGL we want to affect texture unit
          gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, format, type, vedio)
          // Turn off mips and set wrapping to clamp to edge so it
          // will work regardless of the dimensions of the video.
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

          clearTimeout(timer);
        });
      } else {
        const image = new Image();
        image.onload = () => {
          // Tell WebGL we want to affect texture unit
          gl.bindTexture(gl.TEXTURE_2D, this.texture);
          gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, format, type, image);
          if (checkIsPowerOf2(image.width) && checkIsPowerOf2(image.height)) {
            gl.generateMipmap(gl.TEXTURE_2D);
          } else {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          }
        };
        image.src = this.url;
      }
    } else if (this.color) {
      gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, 1, 1, 0, format, type, new Uint8Array(this.color.map(c => c * 255)))
    }
  }
}