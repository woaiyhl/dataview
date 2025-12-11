import React from "react";
import { Layout, Select, Upload, Button, Progress, ColorPicker } from "antd";
import { UploadOutlined, DeleteOutlined } from "@ant-design/icons";

const { Header } = Layout;
const { Option } = Select;

// 辅助函数：根据背景色计算文本颜色（黑/白）以保证对比度
const getContrastColor = (hexColor) => {
  if (!hexColor || !hexColor.startsWith("#")) return "#ffffff";
  const r = parseInt(hexColor.substr(1, 2), 16);
  const g = parseInt(hexColor.substr(3, 2), 16);
  const b = parseInt(hexColor.substr(5, 2), 16);
  // 计算亮度 (YIQ 公式)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? "#000000" : "#ffffff";
};

export default function HeaderBar({
  themeColor,
  setThemeColor,
  datasets,
  currentDatasetId,
  setCurrentDatasetId,
  handleDeleteDataset,
  handleUpload,
  uploading,
  uploadProgress,
}) {
  const textColor = getContrastColor(themeColor);

  return (
    <Header
      className="flex items-center px-5 sticky top-0 z-[1000] w-full shadow-md"
      style={{
        display: "flex", // 兜底：防止 Tailwind 未加载时布局错乱
        alignItems: "center", // 兜底
        background: themeColor,
        padding: "0 20px", // 兜底
        position: "sticky", // 兜底
        top: 0, // 兜底
        zIndex: 1000, // 兜底
        width: "100%", // 兜底
      }}
    >
      <div className="logo text-lg font-bold mr-8" style={{ color: textColor }}>
        时间序列可视化
      </div>
      <div style={{ marginRight: "1rem", display: "flex", alignItems: "center" }}>
        <span style={{ color: textColor, marginRight: "8px" }}>主题色:</span>
        <ColorPicker
          value={themeColor}
          onChange={(c) => setThemeColor(c.toHexString())}
          format="hex"
        />
      </div>
      <Select
        style={{ width: 300, marginRight: "1rem" }}
        placeholder="选择数据集"
        value={currentDatasetId}
        onChange={setCurrentDatasetId}
        notFoundContent="暂无数据集"
        optionLabelProp="label"
      >
        {datasets.map((d) => (
          <Option key={d.id} value={d.id} label={d.filename}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span
                style={{
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                  marginRight: "8px",
                }}
                title={d.filename}
              >
                {d.filename}
              </span>
              <DeleteOutlined
                onClick={(e) => handleDeleteDataset(e, d.id)}
                style={{ color: "red", cursor: "pointer", flexShrink: 0 }}
              />
            </div>
          </Option>
        ))}
      </Select>
      <Upload customRequest={handleUpload} showUploadList={false} disabled={uploading}>
        <Button icon={<UploadOutlined />} loading={uploading}>
          {uploading ? "上传中..." : "上传 CSV"}
        </Button>
      </Upload>
      {uploading && (
        <Progress
          percent={uploadProgress}
          size="small"
          status="active"
          style={{ width: 100, marginLeft: 10 }}
          format={(percent) => `${percent}%`}
        />
      )}
    </Header>
  );
}
