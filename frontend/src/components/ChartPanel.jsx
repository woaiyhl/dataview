import React from "react";
import {
  Card,
  Select,
  Space,
  Button,
  Popover,
  InputNumber,
  Segmented,
  Tooltip,
  Divider,
} from "antd";
import {
  FullscreenOutlined,
  FullscreenExitOutlined,
  DownloadOutlined,
  ReloadOutlined,
  TableOutlined,
  SettingOutlined,
  EyeOutlined,
  EditOutlined,
  LineChartOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import ReactECharts from "echarts-for-react";

const { Option } = Select;

export default function ChartPanel({
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

            <Tooltip title="Y轴设置">
              <Popover
                title="设置Y轴范围"
                trigger="click"
                placement="bottomRight"
                content={
                  <div className="flex flex-col gap-3 w-56">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">最小值</span>
                      <InputNumber
                        className="w-32"
                        value={yMin}
                        onChange={setYMin}
                        placeholder="自动"
                        size="small"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">最大值</span>
                      <InputNumber
                        className="w-32"
                        value={yMax}
                        onChange={setYMax}
                        placeholder="自动"
                        size="small"
                      />
                    </div>
                    <div className="flex justify-end pt-2 border-t border-gray-100">
                      <Button size="small" onClick={handleResetYAxis} type="link" danger>
                        重置
                      </Button>
                    </div>
                  </div>
                }
              >
                <Button
                  type="text"
                  icon={<SettingOutlined />}
                  className="text-gray-500 hover:text-gray-700"
                />
              </Popover>
            </Tooltip>

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
        <ReactECharts
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
      </div>
    </Card>
  );
}
