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
  // 森林绿主题下，强制使用白色文字
  if (hexColor === "#3E513E") return "#ffffff";
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
  user,
  onLogout,
}) {
  const textColor = getContrastColor(themeColor);
  const isLight = textColor === "#000000";

  const currentDataset = datasets.find((d) => d.id === currentDatasetId);

  // 用户菜单项
  const userMenuItems = [
    {
      key: "logout",
      label: (
        <span className="text-red-500" onClick={onLogout}>
          退出登录
        </span>
      ),
      icon: <DeleteOutlined className="text-red-500" />,
    },
  ];

  // 构建下拉菜单项
  const items =
    datasets.length > 0
      ? datasets.map((d) => ({
          key: d.id,
          label: (
            <div
              className="flex items-center justify-between min-w-[240px] py-2 px-1 group"
              onClick={() => setCurrentDatasetId(d.id)}
            >
              <div className="flex items-center gap-3 overflow-hidden mr-4">
                <div
                  className={`p-1.5 rounded-lg ${
                    d.id === currentDatasetId ? "bg-blue-50" : "bg-gray-50 group-hover:bg-gray-100"
                  }`}
                >
                  <DatabaseOutlined
                    className={`${d.id === currentDatasetId ? "text-blue-500" : "text-gray-400"}`}
                  />
                </div>
                <div className="flex flex-col">
                  <span
                    className={`truncate font-medium text-sm ${
                      d.id === currentDatasetId ? "text-gray-900" : "text-gray-700"
                    }`}
                  >
                    {d.filename}
                  </span>
                  <span className="text-xs text-gray-400">ID: {d.id}</span>
                </div>
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
                  className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-50 hover:bg-red-100 text-red-500"
                  onClick={(e) => {
                    e.stopPropagation();
                    Modal.confirm({
                      title: "确定要删除该数据集吗？",
                      icon: <ExclamationCircleOutlined />,
                      content: "删除后无法恢复，包括所有关联的数据点和标注。",
                      okText: "确定删除",
                      okType: "danger",
                      cancelText: "取消",
                      centered: true,
                      onOk() {
                        handleDeleteDataset(null, d.id);
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
            label: <span className="text-gray-400 px-2">暂无数据集</span>,
            disabled: true,
          },
        ];

  return (
    <Header
      className="z-50 w-full backdrop-blur-md bg-white/80 border-b border-gray-100/50"
      style={{
        padding: "0 24px",
        height: "64px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.03)",
      }}
    >
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
            style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)` }}
          >
            <BarChartOutlined className="text-white text-lg" />
          </div>
          <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-800 to-gray-600 tracking-tight">
            DataView Pro
          </span>
        </div>

        <div className="h-6 w-px bg-gray-200 mx-2" />

        <Dropdown
          menu={{
            items,
            style: {
              maxHeight: "400px",
              overflowY: "auto",
              padding: "8px",
              borderRadius: "12px",
              boxShadow: "0 10px 30px -10px rgba(0,0,0,0.1)",
            },
          }}
          trigger={["click"]}
          placement="bottomLeft"
        >
          <Button
            type="text"
            className="flex items-center gap-2 px-3 py-1.5 h-auto hover:bg-gray-100/50 rounded-lg transition-all"
          >
            <span className="text-gray-500 text-xs uppercase font-semibold tracking-wider">
              数据集
            </span>
            <span className="font-medium text-gray-700 max-w-[200px] truncate">
              {currentDataset ? currentDataset.filename : "选择数据..."}
            </span>
            <DownOutlined className="text-xs text-gray-400" />
          </Button>
        </Dropdown>
      </div>

      <div className="flex items-center gap-4">
        {datasets.length > 0 && (
          <div className="hidden md:flex items-center text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
            <DatabaseOutlined className="mr-2" />
            <span>{datasets.length} 个文件</span>
          </div>
        )}

        <div className="flex items-center gap-2 pl-4 border-l border-gray-100">
          <Tooltip title="切换主题色">
            <div className="hover:scale-110 transition-transform">
              <ColorPicker
                value={themeColor}
                onChange={(c) => setThemeColor(c.toHexString())}
                size="small"
                trigger="hover"
              />
            </div>
          </Tooltip>

          <Upload
            accept=".csv"
            showUploadList={false}
            beforeUpload={() => false}
            onChange={handleUpload}
            maxCount={1}
            disabled={uploading}
          >
            <Button
              type="primary"
              icon={uploading ? <span className="animate-spin">⟳</span> : <CloudUploadOutlined />}
              loading={uploading}
              className="h-9 px-5 rounded-lg shadow-sm hover:shadow-md transition-all font-medium"
              style={{
                backgroundColor: themeColor,
                borderColor: themeColor,
              }}
            >
              {uploading ? <span className="ml-1">{Math.round(uploadProgress)}%</span> : "上传数据"}
            </Button>
          </Upload>

          {user && (
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Button
                type="text"
                className="flex items-center gap-2 ml-2 pl-4 border-l border-gray-100"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold shadow-sm">
                  {user.username?.[0]?.toUpperCase()}
                </div>
                <span className="hidden md:inline text-gray-700 font-medium">{user.username}</span>
                <DownOutlined className="text-xs text-gray-400" />
              </Button>
            </Dropdown>
          )}
        </div>
      </div>
    </Header>
  );
}
