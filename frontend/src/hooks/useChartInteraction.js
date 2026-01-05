import { useState, useRef, useEffect } from "react";

/**
 * 图表交互 Hook
 * 处理图表的画笔（Brush）和拖拽交互
 * @param {Object} chartRef - ECharts 实例引用
 * @param {Array} chartData - 图表数据
 * @param {Function} onBrushComplete - 选区完成回调
 */
export const useChartInteraction = (chartRef, chartData, onBrushComplete) => {
  const [annotateMode, setAnnotateMode] = useState(false);
  const dragStartRef = useRef(null);
  const draggingRef = useRef(false);

  useEffect(() => {
    const inst = chartRef.current?.getEchartsInstance();
    if (!inst) return;
    const zr = inst.getZr();

    const onDown = (e) => {
      if (!annotateMode) return;
      const p = [e.offsetX, e.offsetY];
      if (!inst.containPixel("grid", p)) return;
      const t = inst.convertFromPixel({ seriesIndex: 0 }, p)[0];
      dragStartRef.current = t;
      draggingRef.current = true;
    };

    const onMove = (e) => {
      if (!annotateMode) return;
      if (annotateMode) {
        zr.setCursorStyle("crosshair");
      }
      if (!draggingRef.current || !dragStartRef.current) return;
      
      // 这里可以添加实时选区预览逻辑，如果需要的话
      // 目前只在 onUp 时处理最终选区
    };

    const onUp = (e) => {
      if (!annotateMode) return;
      const p = [e.offsetX, e.offsetY];
      if (!inst.containPixel("grid", p)) return;
      const t2 = inst.convertFromPixel({ seriesIndex: 0 }, p)[0];
      const t1 = dragStartRef.current;
      dragStartRef.current = null;
      draggingRef.current = false;
      if (!t1 || !t2) return;
      const start = new Date(Math.min(t1, t2)).toISOString();
      const end = new Date(Math.max(t1, t2)).toISOString();
      
      if (onBrushComplete) {
        onBrushComplete(start, end);
      }
    };

    if (annotateMode) {
      zr.setCursorStyle("crosshair");
      zr.on("mousedown", onDown);
      zr.on("mousemove", onMove);
      zr.on("mouseup", onUp);
    } else {
      zr.setCursorStyle("default");
      zr.off("mousedown");
      zr.off("mousemove");
      zr.off("mouseup");
    }
    return () => {
      zr.off("mousedown");
      zr.off("mousemove");
      zr.off("mouseup");
    };
  }, [annotateMode, chartData, chartRef, onBrushComplete]);

  return { annotateMode, setAnnotateMode };
};
