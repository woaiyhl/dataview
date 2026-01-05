import React from "react";
import { Spin } from "antd";

const ChartAreaSkeleton = ({ status }) => (
  <div
    style={{
      height: 450,
      background: "#fafafa",
      borderRadius: 8,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      border: "1px dashed #e0e0e0",
      marginBottom: 20,
    }}
  >
    <Spin size="large" />
    <div style={{ marginTop: 24, textAlign: "center", color: "#666" }}>
      <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>
        {status === "processing" ? "正在处理数据..." : "正在加载图表资源..."}
      </div>
      {status === "processing" && (
        <div style={{ fontSize: 13, color: "#999" }}>
          大文件可能需要几分钟进行预处理和降采样，请耐心等待
        </div>
      )}
    </div>
  </div>
);

export default ChartAreaSkeleton;
