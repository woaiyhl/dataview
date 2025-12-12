import React from "react";
import {
  Layout,
  Dropdown,
  Button,
  Progress,
  ColorPicker,
  Tooltip,
  Empty,
  Upload,
  Modal,
} from "antd";
import {
  CloudUploadOutlined,
  DeleteOutlined,
  BarChartOutlined,
  DownOutlined,
  DatabaseOutlined,
  CheckOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";

const { Header } = Layout;

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
  const isLight = textColor === "#000000";

  const currentDataset = datasets.find((d) => d.id === currentDatasetId);

  // 构建下拉菜单项
  const items =
    datasets.length > 0
      ? datasets.map((d) => ({
          key: d.id,
          label: (
            <div
              className="flex items-center justify-between min-w-[240px] py-1 group"
              onClick={() => setCurrentDatasetId(d.id)}
            >
              <div className="flex items-center gap-2 overflow-hidden mr-4">
                <DatabaseOutlined
                  className={`${d.id === currentDatasetId ? "text-blue-500" : "text-gray-400"}`}
                />
                <span
                  className={`truncate font-medium ${
                    d.id === currentDatasetId ? "text-blue-600" : "text-gray-700"
                  }`}
                >
                  {d.filename}
                </span>
              </div>

              <div className="flex items-center">
                {d.id === currentDatasetId && (
                  <CheckOutlined className="text-blue-500 mr-2 text-xs" />
                )}
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    Modal.confirm({
                      title: "确定要删除该数据集吗？",
                      icon: <ExclamationCircleOutlined />,
                      content: "删除后无法恢复，包括所有关联的数据点和标注。",
                      okText: "确定删除",
                      okType: "danger",
                      cancelText: "取消",
                      onOk() {
                        return handleDeleteDataset(null, d.id);
                      },
                    });
                  }}
                />
              </div>
            </div>
          ),
        }))
      : [
          {
            key: "empty",
            label: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无数据集"
                className="py-2"
              />
            ),
            disabled: true,
          },
        ];

  return (
    <Header
      className="flex items-center justify-between px-6 sticky top-0 z-[1000] w-full shadow-md transition-all duration-300 backdrop-blur-md"
      style={{
        background: themeColor,
        height: "64px",
        borderBottom: `1px solid ${isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.1)"}`,
      }}
    >
      {/* Left: Logo & Theme */}
      <div className="flex items-center gap-6">
        <div
          className="flex items-center gap-3 text-xl font-bold tracking-tight cursor-default select-none"
          style={{ color: textColor }}
        >
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-lg ${
              isLight ? "bg-black/5" : "bg-white/10"
            }`}
          >
            <BarChartOutlined className="" />
          </div>
          <span className="font-sans">DataView</span>
        </div>

        <div className="h-6 w-px bg-current opacity-10" style={{ color: textColor }} />

        {/* Dataset Switcher - Redesigned */}
        <Dropdown
          menu={{ items, className: "max-h-[400px] overflow-y-auto rounded-xl p-2 shadow-xl" }}
          trigger={["click"]}
          placement="bottomLeft"
        >
          <Button
            type="text"
            className={`flex items-center gap-2 px-3 h-9 transition-all duration-200 hover:bg-black/5 ${
              !isLight && "hover:bg-white/10"
            }`}
            style={{ color: textColor }}
          >
            <DatabaseOutlined className="opacity-70" />
            <span className="font-medium max-w-[200px] truncate">
              {currentDataset ? currentDataset.filename : "选择数据集"}
            </span>
            <DownOutlined className="text-xs opacity-50 ml-1" />
          </Button>
        </Dropdown>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-4">
        {/* Upload Progress */}
        {uploading && (
          <div className="flex flex-col items-end gap-0.5 w-40 animate-pulse">
            <div
              className="flex justify-between w-full text-[10px] font-medium opacity-80"
              style={{ color: textColor }}
            >
              <span>上传中...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress
              percent={uploadProgress}
              size="small"
              showInfo={false}
              strokeColor={isLight ? themeColor : "#fff"}
              trailColor={isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.2)"}
              className="m-0 leading-none"
            />
          </div>
        )}

        {/* Upload Button */}
        <Upload customRequest={handleUpload} showUploadList={false} disabled={uploading}>
          <Tooltip title="上传新的 CSV 数据文件">
            <Button
              type="primary"
              icon={uploading ? null : <CloudUploadOutlined />}
              loading={uploading}
              className={`
                border-none shadow-none font-medium h-9 px-4 rounded-full flex items-center gap-2
                ${
                  isLight
                    ? "bg-black text-white hover:bg-gray-800"
                    : "bg-white text-gray-900 hover:bg-gray-100"
                }
              `}
            >
              {uploading ? "处理中..." : "上传数据"}
            </Button>
          </Tooltip>
        </Upload>

        {/* Theme Picker */}
        <div className="flex items-center">
          <ColorPicker
            value={themeColor}
            onChange={(c) => setThemeColor(c.toHexString())}
            format="hex"
            size="small"
          />
        </div>
      </div>
    </Header>
  );
}
