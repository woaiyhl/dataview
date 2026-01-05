import React from "react";
import { Empty, Button, Space } from "antd";
import { UploadOutlined } from "@ant-design/icons";

const EmptyState = ({ datasets, onSelectLatest, onUploadClick }) => {
  return (
    <div className="flex flex-col justify-center min-h-[calc(100vh-120px)]">
      <div className="py-20 px-6 text-center bg-white rounded-xl shadow-md border-none flex flex-col items-center justify-center min-h-[500px]">
        <Empty
          image="https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg"
          imageStyle={{
            height: 200,
            marginBottom: 24,
            display: "flex",
            justifyContent: "center",
          }}
          description={
            <div className="max-w-md mx-auto">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">暂无数据可视化</h2>
              <p className="text-gray-500 mb-8 leading-relaxed">
                请从顶部工具栏选择已有的数据集，或上传新的 CSV 文件以开始分析。
                <br />
                支持时间序列数据的自动解析与交互式图表展示。
              </p>
            </div>
          }
        >
          <Space size="middle">
            <Button
              type="primary"
              size="large"
              icon={<UploadOutlined />}
              onClick={onUploadClick}
              className="h-12 px-8 rounded-full text-base shadow-lg shadow-blue-500/30"
            >
              上传 CSV 数据
            </Button>
            {datasets.length > 0 && (
              <Button
                size="large"
                onClick={onSelectLatest}
                className="h-12 px-8 rounded-full text-base"
              >
                查看最新数据
              </Button>
            )}
          </Space>
        </Empty>
      </div>
    </div>
  );
};

export default EmptyState;
