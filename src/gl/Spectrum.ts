// 光谱上采样 n 个点
// spd (spectrum power distribution)
export class CoefficientSpectrum<N extends number = 10> {
  // 存储在采样点波长(wave length, 记 lambda) 的 power
  c: number[] = []
  // add, sub, mul, div
}

export class SampleSpectrum extends CoefficientSpectrum {
}

export class RGBSpectrum extends CoefficientSpectrum {
}
export const Specturm = RGBSpectrum;
