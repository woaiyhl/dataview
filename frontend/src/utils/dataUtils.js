/**
 * 数据降采样函数
 * 当数据量超过阈值时，对数据进行均匀采样
 * @param {Array} data - 原始数据数组
 * @param {number} threshold - 采样阈值，默认为 5000
 * @returns {Array} 采样后的数据
 */
export const downsampleData = (data, threshold = 5000) => {
  if (!data || data.length <= threshold) return data;

  const step = Math.ceil(data.length / threshold);
  const sampled = [];
  for (let i = 0; i < data.length; i += step) {
    sampled.push(data[i]);
  }
  // 确保最后一个点被包含，保证时间范围完整
  if (sampled[sampled.length - 1] !== data[data.length - 1]) {
    sampled.push(data[data.length - 1]);
  }
  return sampled;
};

/**
 * 将十六进制颜色转换为 RGBA 格式
 * @param {string} hex - 十六进制颜色值 (e.g., "#ffffff" or "fff")
 * @param {number} alpha - 透明度 (0-1)，默认为 1
 * @returns {string} RGBA 颜色字符串
 */
export const hexToRgba = (hex, alpha = 1) => {
  const h = hex.replace("#", "");
  const bigint = parseInt(
    h.length === 3
      ? h
          .split("")
          .map((x) => x + x)
          .join("")
      : h,
    16,
  );
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
