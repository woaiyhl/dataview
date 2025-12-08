import React from "react";
import { Card, Select, Space, Button, Popover, InputNumber } from "antd";
import {
  FullscreenOutlined,
  CompressOutlined,
  PictureOutlined,
  ReloadOutlined,
  TableOutlined,
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
}) {
  const hexToRgba = (hex, alpha = 1) => {
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
  const filledBtn = {
    background: themeColor,
    borderColor: themeColor,
    color: "#fff",
    borderRadius: 8,
  };
  const outlineBtn = {
    background: "transparent",
    borderColor: themeColor,
    color: themeColor,
    borderRadius: 8,
  };
  return (
    <Card
      title="数据可视化"
      bordered={false}
      style={{
        borderRadius: 8,
        position: fullscreen ? "fixed" : "static",
        inset: fullscreen ? 0 : "auto",
        zIndex: fullscreen ? 1000 : "auto",
      }}
      hoverable
      extra={
        <Space>
          <Select
            value={selectedMetric}
            onChange={setSelectedMetric}
            style={{ width: 200 }}
            placeholder="选择指标"
          >
            {stats.map((s) => (
              <Option key={s.metric} value={s.metric}>
                {s.metric}
              </Option>
            ))}
          </Select>
          <Button
            style={annotateMode ? outlineBtn : filledBtn}
            onClick={() => setAnnotateMode(!annotateMode)}
          >
            {annotateMode ? "浏览模式" : "标注模式"}
          </Button>
          <Button icon={<PictureOutlined />} onClick={handleSaveImage} style={filledBtn}>
            保存为图片
          </Button>
          <Button
            icon={fullscreen ? <CompressOutlined /> : <FullscreenOutlined />}
            onClick={handleToggleFullscreen}
            style={filledBtn}
          >
            {fullscreen ? "退出全屏" : "全屏显示"}
          </Button>
          <Popover
            title="设置Y轴范围"
            content={
              <Space direction="vertical" style={{ width: 220 }}>
                <Space>
                  <span>最小值</span>
                  <InputNumber
                    style={{ width: 140 }}
                    value={yMin}
                    onChange={setYMin}
                    placeholder="自动"
                  />
                </Space>
                <Space>
                  <span>最大值</span>
                  <InputNumber
                    style={{ width: 140 }}
                    value={yMax}
                    onChange={setYMax}
                    placeholder="自动"
                  />
                </Space>
                <Space>
                  <Button type="primary">应用</Button>
                  <Button onClick={handleResetYAxis}>重置</Button>
                </Space>
              </Space>
            }
          >
            <Button style={filledBtn}>Y轴设置</Button>
          </Popover>
          <Button icon={<ReloadOutlined />} onClick={handleResetYAxis} style={filledBtn}>
            Y轴重置
          </Button>
          <Button icon={<TableOutlined />} onClick={scrollToTable} style={filledBtn}>
            定位到表格
          </Button>
        </Space>
      }
    >
      <ReactECharts
        ref={chartRef}
        option={option}
        style={{ height: "500px", width: "100%", cursor: annotateMode ? "crosshair" : "default" }}
        notMerge={true}
        lazyUpdate={true}
        onEvents={onChartEvents}
      />
    </Card>
  );
}
