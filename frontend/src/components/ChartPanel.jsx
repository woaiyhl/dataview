import React, { useMemo, useState } from "react";
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
  CloseOutlined,
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
  const [showTip, setShowTip] = useState(true);

  // 检查是否有数据
  const hasData = useMemo(() => {
    if (!option?.series) return false;
    return option.series.some((s) => s.data && s.data.length > 0);
  }, [option]);

  return (
    <Card
      title={
        <div className="flex items-center gap-4 py-1">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 bg-[#3E513E] rounded-full"></div>
            <span className="font-serif font-bold text-[#2C3E2C] text-xl">数据可视化</span>
          </div>
          <Segmented
            options={[
              { label: "浏览", value: false, icon: <EyeOutlined /> },
              { label: "标注", value: true, icon: <EditOutlined /> },
            ]}
            value={annotateMode}
            onChange={setAnnotateMode}
            className="bg-[#F9F8F4] p-0.5 custom-segmented border border-[#D4C5A9]/30"
          />
        </div>
      }
      bordered={false}
      className={`shadow-[0_4px_20px_0_rgba(62,81,62,0.05)] hover:shadow-[0_8px_30px_0_rgba(62,81,62,0.1)] transition-all duration-300 border border-[#A8BFA8]/20 ${
        fullscreen ? "fixed inset-0 z-[1000] rounded-none h-screen" : "rounded-2xl"
      }`}
      bodyStyle={{
        padding: "20px 24px 24px 24px",
        height: fullscreen ? "calc(100vh - 80px)" : "auto",
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
            {annotateMode && showTip && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-50 text-blue-600 px-4 py-1 rounded-full text-xs font-medium border border-blue-100 shadow-sm opacity-80 z-10 flex items-center gap-2">
                <span>提示：在图表上拖拽即可创建标注</span>
                <CloseOutlined
                  className="cursor-pointer hover:text-blue-800"
                  onClick={() => setShowTip(false)}
                />
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
