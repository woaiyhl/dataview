import React from "react";
import { Layout, Select, Upload, Button, Progress, ColorPicker } from "antd";
import { UploadOutlined, DeleteOutlined } from "@ant-design/icons";

const { Header } = Layout;
const { Option } = Select;

export default function HeaderBar({ themeColor, setThemeColor, datasets, currentDatasetId, setCurrentDatasetId, handleDeleteDataset, handleUpload, uploading, uploadProgress }) {
  return (
    <Header style={{ display: "flex", alignItems: "center", background: themeColor, padding: "0 20px" }}>
      <div className="logo" style={{ fontSize: "1.2rem", fontWeight: "bold", marginRight: "2rem", color: "#fff" }}>时间序列可视化</div>
      <div style={{ marginRight: "1rem", display: "flex", alignItems: "center" }}>
        <span style={{ color: "#fff", marginRight: "8px" }}>主题色:</span>
        <ColorPicker value={themeColor} onChange={(c) => setThemeColor(c.toHexString())} format="hex" />
      </div>
      <Select style={{ width: 300, marginRight: "1rem" }} placeholder="选择数据集" value={currentDatasetId} onChange={setCurrentDatasetId} notFoundContent="暂无数据集" optionLabelProp="label">
        {datasets.map((d) => (
          <Option key={d.id} value={d.id} label={d.filename}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", marginRight: "8px" }} title={d.filename}>{d.filename}</span>
              <DeleteOutlined onClick={(e) => handleDeleteDataset(e, d.id)} style={{ color: "red", cursor: "pointer", flexShrink: 0 }} />
            </div>
          </Option>
        ))}
      </Select>
      <Upload customRequest={handleUpload} showUploadList={false} disabled={uploading}>
        <Button icon={<UploadOutlined />} loading={uploading}>{uploading ? "上传中..." : "上传 CSV"}</Button>
      </Upload>
      {uploading && (
        <Progress percent={uploadProgress} size="small" status="active" style={{ width: 100, marginLeft: 10 }} format={(percent) => `${percent}%`} />
      )}
    </Header>
  );
}

