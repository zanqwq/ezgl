export const checkIsPowerOf2 = (x: number) => {
  // 4(100), 4 - 1 = 3(011), 4 & 3 = 0
  return (x & (x - 1)) === 0;
}