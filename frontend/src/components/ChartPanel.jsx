import React, { useMemo } from "react";
import { Card, Select, Space, Button, Segmented, Tooltip, Divider, Empty, Spin } from "antd";
import {
  FullscreenOutlined,
  FullscreenExitOutlined,
  DownloadOutlined,
  ReloadOutlined,
  TableOutlined,
  EyeOutlined,
  EditOutlined,
  LineChartOutlined,
  BarChartOutlined,
} from "@ant-design/icons";

// ECharts 按需引入
import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { LineChart, BarChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  MarkAreaComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

// 注册必须的组件
echarts.use([
  LineChart,
  BarChart,
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  MarkAreaComponent,
  CanvasRenderer,
]);

const { Option } = Select;

export default function ChartPanel({
  loading,
  option,
  chartRef,
  onChartEvents,
  stats,
  selectedMetric,
  setSelectedMetric,
  annotateMode,
  setAnnotateMode,
  fullscreen,
  setFullscreen,
  handleSaveImage,
  handleToggleFullscreen,
  yMin,
  yMax,
  setYMin,
  setYMax,
  handleResetYAxis,
  scrollToTable,
  themeColor,
  chartType,
  setChartType,
}) {
  // 检查是否有数据
  const hasData = useMemo(() => {
    if (!option?.series) return false;
    return option.series.some((s) => s.data && s.data.length > 0);
  }, [option]);

  return (
    <Card
      title={
        <div className="flex items-center gap-4">
          <span className="font-bold text-gray-800">数据可视化</span>
          <Segmented
            options={[
              { label: "浏览模式", value: false, icon: <EyeOutlined /> },
              { label: "标注模式", value: true, icon: <EditOutlined /> },
            ]}
            value={annotateMode}
            onChange={setAnnotateMode}
            className="shadow-sm bg-gray-100"
          />
        </div>
      }
      bordered={false}
      className={`shadow-sm transition-all duration-300 ${
        fullscreen ? "fixed inset-0 z-[1000] rounded-none h-screen" : "rounded-lg hover:shadow-md"
      }`}
      bodyStyle={{
        padding: "10px 24px 24px 24px",
        height: fullscreen ? "calc(100vh - 60px)" : "auto",
        display: "flex",
        flexDirection: "column",
      }}
      extra={
        <div className="flex items-center gap-2">
          <Select
            value={selectedMetric}
            onChange={setSelectedMetric}
            className="w-48"
            placeholder="选择指标"
            bordered={false}
            style={{ backgroundColor: "#f9fafb", borderRadius: "6px" }}
          >
            {stats.map((s) => (
              <Option key={s.metric} value={s.metric}>
                {s.metric}
              </Option>
            ))}
          </Select>

          <Divider type="vertical" className="h-6 mx-2" />

          <Space size={2}>
            <Segmented
              options={[
                { label: "折线图", value: "line", icon: <LineChartOutlined /> },
                { label: "柱状图", value: "bar", icon: <BarChartOutlined /> },
              ]}
              size="small"
              value={chartType}
              onChange={setChartType}
              className="bg-gray-100"
            />

            <Tooltip title="重置视图">
              <Button
                type="text"
                icon={<ReloadOutlined />}
                onClick={handleResetYAxis}
                className="text-gray-500 hover:text-gray-700"
              />
            </Tooltip>

            <Tooltip title="保存图片">
              <Button
                type="text"
                icon={<DownloadOutlined />}
                onClick={handleSaveImage}
                className="text-gray-500 hover:text-gray-700"
              />
            </Tooltip>

            <Tooltip title="定位到表格">
              <Button
                type="text"
                icon={<TableOutlined />}
                onClick={scrollToTable}
                className="text-gray-500 hover:text-gray-700"
              />
            </Tooltip>

            <Tooltip title={fullscreen ? "退出全屏" : "全屏"}>
              <Button
                type={fullscreen ? "primary" : "text"}
                ghost={fullscreen}
                icon={fullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                onClick={handleToggleFullscreen}
                className={fullscreen ? "" : "text-gray-500 hover:text-gray-700"}
              />
            </Tooltip>
          </Space>
        </div>
      }
    >
      <div onContextMenu={(e) => e.preventDefault()} className="relative flex-1 w-full h-full">
        {loading ? (
          <div
            className="flex items-center justify-center w-full bg-gray-50 rounded-lg border border-dashed border-gray-200"
            style={{ height: fullscreen ? "100%" : "500px" }}
          >
            <Spin tip="加载图表资源..." size="large" />
          </div>
        ) : hasData ? (
          <>
            <ReactEChartsCore
              echarts={echarts}
              ref={chartRef}
              option={option}
              style={{
                height: fullscreen ? "100%" : "500px",
                width: "100%",
                cursor: annotateMode ? "crosshair" : "default",
              }}
              notMerge={true}
              lazyUpdate={true}
              onEvents={onChartEvents}
            />
            {annotateMode && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-50 text-blue-600 px-4 py-1 rounded-full text-xs font-medium border border-blue-100 shadow-sm pointer-events-none opacity-80 z-10">
                提示：在图表上拖拽即可创建标注
              </div>
            )}
          </>
        ) : (
          <div
            className="flex items-center justify-center w-full bg-gray-50 rounded-lg border border-dashed border-gray-200"
            style={{ height: fullscreen ? "100%" : "500px" }}
          >
            <Empty description="暂无数据" />
          </div>
        )}
      </div>
    </Card>
  );
}
