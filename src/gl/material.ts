import { Texture } from "./texture";

interface IMaterial {
  map?: Texture;
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

export enum MaterialType {
  NORMAL,
  TEX,
  COLOR,
}

// matte(磨砂 or 哑光) material, plastic material, glass, metal, mirror, ...
export class Material implements IMaterial {
  color = [1, 1, 1];
  // 普通贴图, 作为 kd 项
  map?: Texture;
  normalMap?: Texture;
  // 凹凸贴图
  bumpMap?: Texture;
  // 位移贴图
  displacementMap?: Texture;
  materialType: MaterialType = MaterialType.NORMAL;
  interactWithLight = false;
  wireFrame = false;
  shadingFrequency?: 'flat' | 'vertex' | 'pixel';
}
