import { Camera } from "./camera";
import { Primitive } from "./primitive";
import { Scene } from "./scene";
import { cloneDeep } from 'lodash';
import { Transform } from "./transform";
import { Point } from "./geometry";

export type DrawConfig = {
  // uniform is available for both vs and fs
  // while attribute is only available for vs
  // and varying can be declare in vs and pass to fs
  uniforms?: Record<string, number | number[] | Array<number[]>>;
  textures?: Record<string, string>;
  vedioTextures?: Record<string, string>;
  vs: { source: string; arrtris?: Record<string, Array<number[]>> };
  fs: { source: string; }
  drawVertexIndexes?: Array<number[]>;
  drawMethod: number;
  drawVertexCnt: number;
  // 面, 点(gouraud shading), 像素(phong shading)
  shadingFrequency?: 'flat' | 'vertex' | 'pixel';
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

  const { vs, fs, drawVertexIndexes, drawMethod, drawVertexCnt } = cfg;

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

  for (const [name, value] of Object.entries(vs.arrtris || {})) {
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
  for (const [name, url] of Object.entries(textures || {})) {
    const image = new Image();
    image.onload = () => {
      gl.activeTexture(gl.TEXTURE0);
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);

      const level = 0;
      const internalFormat = gl.RGBA;
      const srcFormat = gl.RGBA;
      const srcType = gl.UNSIGNED_BYTE;

      gl.texImage2D(
        gl.TEXTURE_2D,
        level,
        internalFormat,
        srcFormat,
        srcType,
        image
      );

      if (checkIsPowerOf2(image.width) && checkIsPowerOf2(image.height)) {
        gl.generateMipmap(gl.TEXTURE_2D);
      } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      }

      gl.uniform1i(location, 0);
    };
    image.src = url;

    const location = gl.getUniformLocation(program, name);
      // Tell WebGL we want to affect texture unit 0
    gl.activeTexture(gl.TEXTURE0);

    // Bind the texture to texture unit 0
    // ctx.bindTexture(ctx.TEXTURE_2D, texture);

    // Tell the shader we bound the texture to texture unit 0
    gl.uniform1i(location, 0);

    // gl.activeTexture(gl.TEXTURE30);
    // gl.bindTexture(gl.TEXTURE_2D, texture);
    // bind to texture unit 0
    // gl.uniform1i(location, 0);
  }

  const { vedioTextures } = cfg;
  for (const [name, url] of Object.entries(vedioTextures || {})) {
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

    vedio.src = url;
    vedio.play();

    const timer = setInterval(() => {
      if (playing && timeupdate) {

        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, vedio)
        gl.activeTexture(gl.TEXTURE0)
        gl.uniform1i(gl.getUniformLocation(program, name), 0)
        // Turn off mips and set wrapping to clamp to edge so it
        // will work regardless of the dimensions of the video.
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

        clearTimeout(timer);
      }
    });
  }

  if (drawVertexIndexes) {
    const buffer = gl.createBuffer();
    if (!buffer) return;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(drawVertexIndexes.flat()), gl.STATIC_DRAW);
    gl.drawElements(drawMethod, drawVertexCnt, gl.UNSIGNED_SHORT, 0);
    return;
  }
  gl.drawArrays(drawMethod, 0, drawVertexCnt);
}

// think: 怎么对单个物体进行 transform ?
// render (scene, camera), for each object, set uniform modelView and render it
export function renderPrimitive(canvas: HTMLCanvasElement, primitive: Primitive, scene: Scene, camera: Camera) {
  /*
  (local space) -> model -> (world space) -> view -> (view space) -> projection -> (clip space)
  NOTE: 需要 transpose 一下, 因为 glsl 里 mat 按列声明, 例如

  mat4 m(
    1, 0, 0, 0, // col0
    0, 1, 0, 0, // col1
    0, 0, 1, 0, // col2
    0, 0, 0, 1 // col3
  );
  */

  // TODO: error mInv
  const modelViewTransform = camera.viewTranform.multi(primitive.shape.obj2world);
  const uMatModelView = modelViewTransform.transpose().m.m;

  const clipTransform = camera.clipTransform;
  const uMatProjection = clipTransform.transpose().m.m;

  // 法线不用经过 clipTransform
  const transform = modelViewTransform;
  const uMatNormal = Transform.normalTransform(transform).transpose().m.m;

  const orthoTransform = camera.orthoTransform;
  const eyePosPoint = orthoTransform.transformPoint(new Point(0, 0, 0));
  const uEyePos = [eyePosPoint.x, eyePosPoint.y, eyePosPoint.z];

  const uniformCfgs: DrawConfig['uniforms'] = { uMatModelView, uMatProjection, uMatNormal, uEyePos };

  const drawCfg = cloneDeep(primitive.shape.drawCfg);
  if (drawCfg === undefined) return;
  drawCfg.uniforms = { ...uniformCfgs, ...(drawCfg.uniforms || {}) };

  if (primitive.material?.map?.url) {
    const texType: keyof DrawConfig = primitive.material.map.isVedio ? 'vedioTextures' : 'textures';
      drawCfg[texType] = { ...(drawCfg![texType] || {}), uMap: primitive.material.map.url }
  }

  drawCfg.uniforms['uColor'] = primitive.material?.color || [1, 1, 1];
  drawCfg.uniforms['uInteractWithLight'] = primitive.material?.interactWithLight ? 1 : 0;
  drawCfg.uniforms['uMaterialType'] = primitive.material?.materialType || 0;

  const { ambientLights, directionalLights, pointLights } = scene;

  const NUM_AMB = 'NUM_AMB_LIGHTS';
  const numAmbs = ambientLights.length;
  drawCfg.uniforms![NUM_AMB] = numAmbs;
  ambientLights.forEach((light, idx) => {
    drawCfg.uniforms![`ambientLights[${idx}]`] = light;
  });

  const NUM_DIR = 'NUM_DIR_LIGHTS';
  const numDirs = directionalLights.length;
  drawCfg.uniforms![NUM_DIR] = numDirs;
  directionalLights.forEach((light, idx) => {
    const { dir, color } = light;
    drawCfg.uniforms![`directionalLights[${idx}].dir`] = dir;
    drawCfg.uniforms![`directionalLights[${idx}].color`] = color;
  });

  const NUM_POINT = 'NUM_POINT_LIGHTS';
  const numPoints = pointLights.length;
  drawCfg.uniforms![NUM_POINT] = numPoints;
  pointLights.forEach((light, idx) => {
    const { pos, color } = light;
    drawCfg.uniforms![`pointLights[${idx}].pos`] = pos;
    drawCfg.uniforms![`pointLights[${idx}].color`] = color;
  });

  const replaceSymbol = (name: string, value: string) => {
    drawCfg.vs.source = drawCfg.vs.source.replaceAll(name, value);
    drawCfg.fs.source = drawCfg.fs.source.replaceAll(name, value);
  };
  
  replaceSymbol(NUM_AMB, String(numAmbs));
  replaceSymbol(NUM_DIR, String(numDirs));
  replaceSymbol(NUM_POINT, String(numPoints));

  draw(canvas, drawCfg);
}

export function render(canvas: HTMLCanvasElement, scene: Scene, camera: Camera) {
  init(canvas);
  for (const primitive of scene.primitives) {
    renderPrimitive(canvas, primitive, scene, camera);
  }
}
