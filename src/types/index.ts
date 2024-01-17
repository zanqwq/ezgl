import { Texture } from "../gl/texture";

export type ArrayOfLen<E, T extends number> = [E, ...E[]] & { length: T };

export type Attribute = {
  buffer: WebGLBuffer | null;
  location: number;
  size: number;
}
export type Attributes = Array<Attribute>;

export type UniformType  = Extract<keyof WebGLRenderingContext, `uniform${string}`> extends `uniform${infer R}` ? R : never;
export type Uniform<T extends UniformType> = {
  type: T;
  args: Parameters<WebGLRenderingContext[`uniform${T}`]>;
};

export type Indices = {
  buffer: WebGLBuffer | null;
  vertexCnt: number;
}

export type Uniforms = Array<
  Uniform<'1i'> |
  Uniform<'1iv'> |
  Uniform<'2i'> |
  Uniform<'2iv'> |
  Uniform<'3i'> |
  Uniform<'3iv'> |
  Uniform<'4i'> |
  Uniform<'4iv'> |
  Uniform<'1f'> |
  Uniform<'1fv'> |
  Uniform<'2f'> |
  Uniform<'2fv'> |
  Uniform<'3f'> |
  Uniform<'3fv'> |
  Uniform<'4f'> |
  Uniform<'4fv'> |
  Uniform<'Matrix2fv'> |
  Uniform<'Matrix3fv'> |
  Uniform<'Matrix4fv'> |
  { type: 'texture', location: WebGLUniformLocation | null; tex: WebGLTexture }
>;

export type ProgramInfo = {
  program: WebGLProgram;
  attributes: Attributes;
  uniforms: Uniforms;
  indices: Indices;
  frameBuffer?: WebGLFramebuffer;
}