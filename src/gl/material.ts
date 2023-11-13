import { Camera } from "./camera";
import { Point } from "./geometry";
import { DirectionalLight } from "./light";
import { DrawConfig } from "./renderer";
import { Scene } from "./scene";
import { Shape } from "./shape";
import { Texture } from "./texture";
import { Transform } from "./transform";

export interface IMaterial {
  map: Texture;
  compile: (shape: Shape, scene: Scene, camera: Camera) => DrawConfig;
}

// 反射分类: diffuse, glossy(光滑的, 有光泽的) specular, perfact specular, retro-reflective(向后反射, 如天鹅绒 velvet)
// bsdf = brdf(reflection) + btdf(transimission)
// bssrdf(bidirectional scattering surface reflectance distribution function, 一个地方进, 另一个地方出)
// bxdf = bsdf + bssrdf
enum BxDFType {
    BSDF_REFLECTION   = 1 << 0,
    // 透射
    BSDF_TRANSMISSION = 1 << 1,
    BSDF_DIFFUSE      = 1 << 2,
    BSDF_GLOSSY       = 1 << 3,
    BSDF_SPECULAR     = 1 << 4,
    BSDF_ALL          = BSDF_DIFFUSE | BSDF_GLOSSY | BSDF_SPECULAR |
                        BSDF_REFLECTION | BSDF_TRANSMISSION,
};

// matte(磨砂 or 哑光) material, plastic material, glass, metal, mirror, ...

const phongVsTemplate = `
uniform mat4 uMatModelView;
uniform mat4 uMatProjection;
uniform mat4 uMatNormal;
uniform mat4 uMatLightMvp;

attribute vec3 aPos;
attribute vec3 aNor;
attribute vec2 aTex;

varying vec3 vPos;
varying vec3 vNor;
varying vec2 vTex;
varying vec3 vPosFromLight;

void main() {
  gl_Position = uMatProjection * uMatModelView * vec4(aPos, 1);
  gl_Position = gl_Position / gl_Position.w;

  vPos = vec3(gl_Position.x, gl_Position.y, gl_Position.z);
  // 注意, normalize 时 w 值也会影响 normalize, 所以应该用 vec3 做 normalize
  vec4 t = uMatNormal * vec4(aNor, 0);
  vNor = normalize(vec3(t.x, t.y, t.z));
  vTex = aTex;

  vec4 tt = uMatLightMvp * vec4(aPos, 1);
  tt = tt / tt.w;
  vPosFromLight = vec3(tt.x, tt.y, tt.z);
}
`;

// 传 lights ? 设置 uniform int NUM_LIGHTS
// 然后 Light lights[NUM_LIGHTS]
// 不能 std::vector<Light>, 不能变长
// TODO: 可以控制渲染为 normal, wireframe, texture, or phong
const phongFsTemplate = `
#ifdef GL_ES
  precision highp float;
#endif

uniform mat4 uMatProjection;
uniform vec3 uAmbientLights[NUM_AMB_LIGHTS > 0 ? NUM_AMB_LIGHTS : 1];
uniform struct DirectionalLight {
  vec3 dir;
  vec3 color;
} uDirectionalLights[NUM_DIR_LIGHTS > 0 ? NUM_DIR_LIGHTS : 1];
uniform struct PointLight {
  vec3 pos;
  vec3 color;
} uPointLights[NUM_POINT_LIGHTS > 0 ? NUM_POINT_LIGHTS : 1];

uniform vec3 uEyePos;
uniform sampler2D uMap;
uniform sampler2D uShadowMap;

varying vec3 vPos;
varying vec3 vNor;
varying vec2 vTex;
varying vec3 vPosFromLight;

float useShadowMap(sampler2D shadowMap, vec3 pos) {
  vec4 t = texture2D(shadowMap, pos.xy);
  if (pos.z > t.z) {
    return 1.0;
  }
  return 0.0;
}

void main() {
  vec4 t = texture2D(uMap, vTex);
  vec3 texColor = vec3(t.x, t.y, t.z);
  vec3 kd = texColor;

  // 计算 pling-phong 反射模型 ambient + diffuse + specular
  vec3 color = vec3(0, 0, 0);

  vec3 ka = vec3(0.1, 0.05, 0.1);
  for (int i = 0; i < NUM_AMB_LIGHTS; i++) {
    color += ka * uAmbientLights[i];
  }

  vec3 eye_dir = normalize(uEyePos - vPos);
  vec3 ks = vec3(0.5, 0.5, 0.5);
  // 控制高光大小(值越大, pow 值越小, 高光越小)
  float p = 10.0;
  for (int i = 0; i < NUM_DIR_LIGHTS; i++) {
    vec3 light_intensity = uDirectionalLights[i].color;
    vec3 light_dir = -normalize(uDirectionalLights[i].dir);

    vec3 diffuse = kd * light_intensity * max(dot(vNor, light_dir), 0.0);
    vec3 specular = ks * light_intensity * pow(max(0.0, dot(vNor, normalize(light_dir + eye_dir))), p);

    color += diffuse + specular;
  }

  for (int i = 0; i < NUM_POINT_LIGHTS; i++) {
    // 球的表面积 A = 4*pi*r^2
    // 假设点光源在 r = 1 处能量为 I, 则总能量为 I * 4pi
    // 则在 r 处的能量为 I * 4pi / r^2 * 4pi
    // 即 I / r^2
    vec4 t = uMatProjection * vec4(uPointLights[i].pos, 1);
    t /= t.w;
    vec3 lightPos = vec3(t.x, t.y, t.z);
    vec3 lightColor = uPointLights[i].color;

    float rSquare = pow(length(lightPos - vPos), 2.0);
    vec3 light_intensity = lightColor / (rSquare < 1.0 ? 1.0 : rSquare);
    light_intensity = lightColor;
    vec3 light_dir = normalize(lightPos - vPos);

    vec3 diffuse = kd * light_intensity * max(dot(vNor, light_dir), 0.0);
    vec3 specular = ks * light_intensity * pow(max(0.0, dot(vNor, normalize(light_dir + eye_dir))), p);

    color += diffuse + specular;
  }

  vec3 shadowCoord = (vPosFromLight + 1.0) / 2.0;
  float visibility = useShadowMap(uShadowMap, shadowCoord);
  color = color * visibility;

  // gl_FragColor = vec4(visibility, 0, 0, 1);
  gl_FragColor = vec4(color.xyz, 1);
}
`;

export class PhongMaterial implements IMaterial {
  // 普通贴图, 作为 kd 项
  map = new Texture();
  normalMap?: Texture;
  // 凹凸贴图
  bumpMap?: Texture;
  // 位移贴图
  displacementMap?: Texture;
  interactWithLight = false;
  compile(shape: Shape, scene: Scene, camera: Camera) {
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

    const modelViewTransform = camera.viewTranform.multi(shape.obj2world);
    const uMatModelView = modelViewTransform.transpose().m.m;

    const clipTransform = camera.clipTransform;
    const uMatProjection = clipTransform.transpose().m.m;

    // 法线不用经过 clipTransform
    const transform = modelViewTransform;
    const uMatNormal = Transform.normalTransform(transform).transpose().m.m;

    const orthoTransform = camera.orthoTransform;
    const eyePosPoint = orthoTransform.transformPoint(new Point(0, 0, 0));
    const uEyePos = [eyePosPoint.x, eyePosPoint.y, eyePosPoint.z];

    const uniforms: DrawConfig['uniforms'] = {
      uMatModelView,
      uMatProjection,
      uMatNormal,
      uEyePos,
      uMatLightMvp: scene.directionalLights[0].getLightMVP(shape).transpose().m.m,
    };

    const { ambientLights, directionalLights, pointLights } = scene;

    const NUM_AMB = 'NUM_AMB_LIGHTS';
    const numAmbs = ambientLights.length;
    uniforms![NUM_AMB] = numAmbs;
    ambientLights.forEach((light, idx) => {
      uniforms![`uAmbientLights[${idx}]`] = light;
    });

    const NUM_DIR = 'NUM_DIR_LIGHTS';
    const numDirs = directionalLights.length;
    uniforms![NUM_DIR] = numDirs;
    directionalLights.forEach((light, idx) => {
      const { dir, color } = light;
      uniforms![`uDirectionalLights[${idx}].dir`] = dir;
      uniforms![`uDirectionalLights[${idx}].color`] = color;
    });

    const NUM_POINT = 'NUM_POINT_LIGHTS';
    const numPoints = pointLights.length;
    uniforms![NUM_POINT] = numPoints;
    pointLights.forEach((light, idx) => {
      const { pos, color } = light;
      uniforms![`uPointLights[${idx}].pos`] = pos;
      uniforms![`uPointLights[${idx}].color`] = color;
    });
 
    const textures: DrawConfig['textures'] = {
      uMap: this.map,
      uShadowMap: { ...new Texture(), fbo: scene.directionalLights[0].fbo },
    };

    const getSourceByTemplate = (src: string) => {
      return src
      .replaceAll(NUM_AMB, String(numAmbs))
      .replaceAll(NUM_DIR, String(numDirs))
      .replaceAll(NUM_POINT, String(numPoints));
    };
    const vsSource = getSourceByTemplate(phongVsTemplate);
    const vs: DrawConfig['vs'] = {
      source: vsSource,
      attributes: {
        aPos: shape.positions,
        aNor: shape.normals,
        aTex: shape.texCoors,
      }
    };

    const fsSource = getSourceByTemplate(phongFsTemplate);
    const fs: DrawConfig['fs'] = { source: fsSource };

    const cfg: DrawConfig = {
      drawMethod: WebGLRenderingContext.TRIANGLES,
      drawVertexCnt: shape.indices.flat().length,
      drawVertexIndexes: shape.indices,
      uniforms,
      textures,
      vs,
      fs,
    };

    return cfg;
  }
}

const dirLightSmVsTemplate = `
attribute vec3 aPos;

uniform mat4 uMatLightMvp;

void main() {
  gl_Position = uMatLightMvp * vec4(aPos, 1);
  // ndc space
  gl_Position = gl_Position / gl_Position.w;
}
`;
const dirLightSmFsTemplate = `
void main() {
  gl_FragColor = vec4(gl_FragCoord.xyz, 1);
}
`;

export class DirLightShadowMaterial {
  compile(shape: Shape, light: DirectionalLight) {
    const cfg: DrawConfig = {
      drawMethod: WebGLRenderingContext.TRIANGLES,
      drawVertexCnt: shape.indices.flat().length,
      drawVertexIndexes: shape.indices,
      fbo: light.fbo,
      vs: {
        source: dirLightSmVsTemplate,
        attributes: { aPos: shape.positions }
      },
      fs: { source: dirLightSmFsTemplate },
      uniforms: { uMatLightMvp: light.getLightMVP(shape).transpose().m.m }
    };

    return cfg;
  }
}

// export class NormalMaterial implements IMaterial {
//   complile: (shape: Shape, scene: Scene) => DrawConfig;
//   map: Texture;
//   vsSource = '';
//   fsSource = '';
// }