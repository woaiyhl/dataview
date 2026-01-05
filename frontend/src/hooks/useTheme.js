import { useState, useEffect } from "react";

/**
 * 主题管理 Hook
 * 处理主题颜色的持久化和应用
 */
export const useTheme = () => {
  const [themeColor, setThemeColor] = useState(() => {
    try {
      const stored = localStorage.getItem("app_theme_color");
      return stored || "#3E513E";
    } catch (e) {
      return "#3E513E";
    }
  });

  // 持久化主题颜色并更新 CSS 变量
  useEffect(() => {
    try {
      localStorage.setItem("app_theme_color", themeColor);
      document.documentElement.style.setProperty("--primary-color", themeColor);
    } catch (e) {
      console.error("Failed to persist theme color:", e);
    }
  }, [themeColor]);

  return { themeColor, setThemeColor };
};
