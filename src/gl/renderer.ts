import { Camera } from "./camera";
import { Scene } from "./scene";
import { Texture } from "./texture";
import { FBO, resolution } from "./FBO";
import { DirLightShadowMaterial } from "./material";
import { ProgramInfo } from "../types";
import { Pane } from "./shape";

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

const init = (canvas: HTMLCanvasElement) => {
  const gl = canvas.getContext("webgl");
  if (!gl) return;
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.clearColor(0, 0, 0, 1);
  gl.clearDepth(1);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
}

export function draw(canvas: HTMLCanvasElement, programInfo: ProgramInfo | null, shouldInit = false) {
  if (!programInfo) return;

  const gl = canvas.getContext("webgl");
  if (!gl) return;

  gl.useProgram(programInfo.program);

  if (programInfo.frameBuffer) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, programInfo.frameBuffer);
    gl.viewport(0, 0, resolution, resolution);
  } else {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  if (shouldInit) {
    init(canvas);
  }

  programInfo.attributes.forEach(attr => {
    gl.bindBuffer(gl.ARRAY_BUFFER, attr.buffer);
    gl.vertexAttribPointer(attr.location, attr.size, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(attr.location);
  });

  let texIdx = 0;
  programInfo.uniforms.forEach(uni => {
    if (uni.type === 'texture') {
      gl.uniform1i(uni.location, texIdx);
      gl.activeTexture(gl.TEXTURE0 + texIdx);
      gl.bindTexture(gl.TEXTURE_2D, uni.tex);
      texIdx++;
    } else {
      (gl[`uniform${uni.type}`] as any)(...uni.args);
    }
  });

  // final draw cmd
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, programInfo.indices.buffer);
  gl.drawElements(gl.TRIANGLES, programInfo.indices.vertexCnt, gl.UNSIGNED_SHORT, 0);
}

export function render(canvas: HTMLCanvasElement, scene: Scene, camera: Camera) {
  init(canvas);
  // for each light, create frameBuffer
  //  for each primitive, render the depth graph
  for (const light of scene.directionalLights) {
    light.initFBO(canvas);
    for (const primitive of scene.primitives) {
      const dirLightShadowMaterial = new DirLightShadowMaterial();
      dirLightShadowMaterial.compile(canvas, primitive.shape, light);
      draw(canvas, dirLightShadowMaterial.programInfo);
    }
  }

  // frame buffer object: consist of color attachment(texture), depth attachment + stencil attachment(render buffer)
  for (const primitive of scene.primitives) {
    primitive.material.compile(canvas, primitive.shape, scene, camera);
    // draw(canvas, primitive.material.programInfo);
    if (primitive.shape instanceof Pane) {
      draw(canvas, primitive.material.programInfo);
    }
  }
}
