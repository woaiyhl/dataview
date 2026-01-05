import { useMemo } from "react";
import { downsampleData } from "../utils/dataUtils";

/**
 * 生成 ECharts 配置项 Hook
 * @param {Object} params - 配置参数
 * @returns {Object} ECharts option 对象
 */
export const useChartOption = ({
  chartData,
  selectedMetric,
  chartType,
  annotations,
  themeColor,
  selectionRanges,
  yMin,
  yMax,
}) => {
  return useMemo(() => {
    if (!chartData || !Array.isArray(chartData)) return {};

    const visibleSeries = [];
    let isLargeData = false;

    if (selectedMetric && chartData.length > 0) {
      // 预处理：如果数据量过大，进行前端降采样
      const rawData = chartData;
      const sampledData = downsampleData(rawData);

      visibleSeries.push({
        name: selectedMetric,
        data: sampledData.map((d) => [d.timestamp, d.value]),
        type: chartType,
        // 大数据量优化配置
        large: true,
        largeThreshold: 2000,
        animation: sampledData.length < 1000, // 数据量大时关闭动画
      });

      isLargeData = visibleSeries.length > 0 && visibleSeries[0].data.length > 2000;
    }

    const flatMarkAreaData = annotations.map((ann) => [
      {
        xAxis: ann.start_time,
        name: ann.content,
        itemStyle: { color: ann.color || themeColor, opacity: 0.3 },
        label: { show: true, formatter: `${ann.content} (${ann.status})`, color: "#333" },
      },
      {
        xAxis: ann.end_time,
      },
    ]);

    const selectionArea = selectionRanges.map((r) => [
      {
        xAxis: r.start_time,
        name: "选区",
        itemStyle: { color: themeColor, opacity: 0.45 },
        label: { show: false },
      },
      { xAxis: r.end_time },
    ]);

    const yAxisObj = {
      type: "value",
      scale: true,
      min: (value) => {
        if (yMin !== null) return yMin;
        // 智能处理微小负值：如果最小值很小（绝对值 < 范围的 5%）且是负数，
        // 强制使用 dataMin，避免 ECharts 为了整齐刻度扩展出巨大的负空间（如 -20）
        const range = value.max - value.min;
        if (range > 0 && value.min < 0 && Math.abs(value.min) / range < 0.05) {
          return value.min;
        }
        return null; // 默认行为
      },
    };
    if (yMax !== null) yAxisObj.max = yMax;

    return {
      tooltip: {
        trigger: "axis",
        enterable: false,
        extraCssText: "pointer-events: none;",
      },
      // 移除 ECharts 顶部右侧工具栏（框内按钮）
      grid: {
        top: 30,
        left: 50,
        right: 20,
        bottom: 80,
      },
      xAxis: {
        type: "time",
        boundaryGap: false,
      },
      yAxis: yAxisObj,
      dataZoom: [
        {
          type: "slider",
          start: 0,
          end: 100,
        },
        {
          type: "inside",
        },
      ],
      series: visibleSeries.map((s) => ({
        ...s,
        smooth: chartType === "line" && !isLargeData,
        showSymbol: chartType === "line" && !isLargeData,
        sampling: "lttb",
        type: chartType,
        markArea: {
          data: [...selectionArea, ...flatMarkAreaData],
          label: { position: "insideTopLeft" },
        },
      })),
    };
  }, [
    chartData,
    selectedMetric,
    chartType,
    annotations,
    themeColor,
    selectionRanges,
    yMin,
    yMax,
  ]);
};
