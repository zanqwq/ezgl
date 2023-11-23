import { Camera } from "./camera";
import { Primitive } from "./primitive";
import { Scene } from "./scene";
import { Transform } from "./transform";
import { Matrix4x4, Point } from "./geometry";
import { Texture } from "./texture";
import { FBO } from "./FBO";
import { DirLightShadowMaterial } from "./material";
import { Cube, Pane } from "./shape";

export type DrawConfig = {
  // uniform is available for both vs and fs
  // while attribute is only available for vs
  // and varying can be declare in vs and pass to fs
  uniforms?: Record<string, number | number[] | Array<number[]>>;
  textures?: Record<string, Texture>;
  vs: { source: string; attributes?: Record<string, Array<number[]>> };
  fs: { source: string; }
  drawVertexIndexes?: Array<number[]>;
  drawMethod: number;
  drawVertexCnt: number;
  fbo?: FBO;
};

const checkIsPowerOf2 = (x: number) => {
  // 4(100), 4 - 1 = 3(011), 4 & 3 = 0
  return (x & (x - 1)) === 0;
}

const init = (canvas: HTMLCanvasElement) => {
  const gl = canvas.getContext("webgl");
  if (!gl) return;
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);
  // 深度缓存设置为 -1
  gl.clearDepth(-1);
  // near thins obscure far things, z 越大越近
  gl.depthFunc(gl.GEQUAL);
}

export function draw(canvas: HTMLCanvasElement, cfg: DrawConfig) {
  const gl = canvas.getContext("webgl");
  if (!gl) return;

  const { vs, fs, drawVertexIndexes, drawMethod, drawVertexCnt, fbo } = cfg;

  if (fbo?.frameBuffer) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.frameBuffer);
    gl.viewport(0, 0, 2048, 2048);
  } else {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  const program = gl.createProgram();
  if (!program) return;

  const addShader = (type: 'vs' | 'fs', source: string) => {
    // init shader
    const shader = gl.createShader(type === 'vs' ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER);
    if (!shader) return;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('shader compile failed');
      alert(gl.getShaderInfoLog(shader))
    }
    gl.attachShader(program, shader);
  };
  addShader('vs', vs.source);
  addShader('fs', fs.source);

  // link util all shaders attached
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('program link failed');
    return;
  }
  gl.useProgram(program);

  for (const [name, value] of Object.entries(vs.attributes || {})) {
    if (value[0] === undefined) continue;
    // create buffer, bind buffer data and assign data to attributes and uniforms
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(value.flat()), gl.STATIC_DRAW);

    const location = gl.getAttribLocation(program, name);
    gl.vertexAttribPointer(location, value[0].length, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(location);
  }

  const { uniforms } = cfg;
  for (const [name, value] of Object.entries(uniforms || {})) {
    const location = gl.getUniformLocation(program, name);
    if (Array.isArray(value)) {
      if (Array.isArray(value[0])) {
        const len = value[0].length;
        (gl as any)[`uniformMatrix${len}fv`](location, false, value.flat());
      } else {
        const len = value.length;
        (gl as any)[`uniform${len}fv`](location, value);
      }
    } else {
      gl.uniform1f(location, value);
    }
  }

  const { textures } = cfg;
  Object.entries(textures || {}).forEach(([name, tex], i) => {
    const location = gl.getUniformLocation(program, name);
    // Tell the shader we bound the texture to i
    gl.uniform1i(location, i);

    const texture = gl.createTexture();
    const level = 0;
    const internalFormat = gl.RGBA;
    const format = gl.RGBA;
    const type = gl.UNSIGNED_BYTE;

    const texUnit = gl.TEXTURE0 + i;
    if (tex.url) {
      if (tex.url.endsWith('mp4')) {
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

        vedio.src = tex.url;
        vedio.play();

        const timer = setInterval(() => {
          if (!playing || !timeupdate) return;
          // Tell WebGL we want to affect texture unit
          gl.activeTexture(texUnit);
          gl.bindTexture(gl.TEXTURE_2D, texture)
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
          gl.activeTexture(texUnit);
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, format, type, image);
          if (checkIsPowerOf2(image.width) && checkIsPowerOf2(image.height)) {
            gl.generateMipmap(gl.TEXTURE_2D);
          } else {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          }
        };
        image.src = tex.url;
      }
    } else if (tex.fbo) {
      gl.activeTexture(texUnit);
      gl.bindTexture(gl.TEXTURE_2D, tex.fbo.texture);
    } else if (tex.color) {
      gl.activeTexture(texUnit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, 1, 1, 0, format, type, new Uint8Array(tex.color.map(c => c * 255)))
    }
  });

  if (drawVertexIndexes) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(drawVertexIndexes.flat()), gl.STATIC_DRAW);
    gl.drawElements(drawMethod, drawVertexCnt, gl.UNSIGNED_SHORT, 0);
    return;
  }
  gl.drawArrays(drawMethod, 0, drawVertexCnt);
}

export function render(canvas: HTMLCanvasElement, scene: Scene, camera: Camera) {
  init(canvas);
  // for each light, create frameBuffer
  //  for each primitive, render the depth graph
  for (const light of scene.directionalLights) {
    light.setFBO(canvas);
    for (const primitive of scene.primitives) {
      const dirLightShadowMaterial = new DirLightShadowMaterial();
      const cfg = dirLightShadowMaterial.compile(primitive.shape, light);
      draw(canvas, cfg);
    }
  }

  // frame buffer object: consist of color attachment(texture), depth attachment + stencil attachment(render buffer)
  for (const primitive of scene.primitives) {
    const cfg = primitive.material.compile(primitive.shape, scene, camera);
    draw(canvas, cfg);
  }
}
