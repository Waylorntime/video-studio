/** 由字符串得到确定性随机数，同一个 id 每次渲染都长一样。 */
export const seeded = (seed: string) => {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** 撕纸边：生成一条沿边的锯齿 clip-path 多边形 */
export const tornClip = (seed: string, edges: { top?: boolean; bottom?: boolean; right?: boolean } = { bottom: true }) => {
  const r = seeded(seed);
  const pts: string[] = [];
  const steps = 26;
  const jag = () => (r() * 1.6 + 0.2).toFixed(2);

  // 上边（左→右）
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * 100;
    pts.push(`${x.toFixed(2)}% ${edges.top ? jag() : 0}%`);
  }
  // 右边（上→下）
  for (let i = 1; i < steps; i++) {
    const y = (i / steps) * 100;
    pts.push(`${edges.right ? (100 - Number(jag())).toFixed(2) : 100}% ${y.toFixed(2)}%`);
  }
  // 下边（右→左）
  for (let i = steps; i >= 0; i--) {
    const x = (i / steps) * 100;
    pts.push(`${x.toFixed(2)}% ${edges.bottom ? (100 - Number(jag())).toFixed(2) : 100}%`);
  }
  return `polygon(${pts.join(",")})`;
};
