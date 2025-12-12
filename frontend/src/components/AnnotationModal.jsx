import React from "react";
import { Modal, Form, Input, Select, ColorPicker, Radio, Space } from "antd";
import {
  InfoCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  EditOutlined,
  PlusCircleOutlined,
  TagOutlined,
} from "@ant-design/icons";

const { Option } = Select;

export default function AnnotationModal({
  editingAnnotation,
  visible,
  setVisible,
  annotationForm,
  handleSaveAnnotation,
}) {
  return (
    <Modal
      title={
        <div className="flex items-center gap-2 py-1">
          <span className={`text-xl ${editingAnnotation ? "text-blue-600" : "text-green-600"}`}>
            {editingAnnotation ? <EditOutlined /> : <PlusCircleOutlined />}
          </span>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-gray-800 leading-tight">
              {editingAnnotation ? "编辑标注" : "添加标注"}
            </span>
            <span className="text-xs text-gray-400 font-normal">
              {editingAnnotation ? "修改已有的数据标注信息" : "为选中的数据区域添加描述"}
            </span>
          </div>
        </div>
      }
      open={visible}
      onCancel={() => setVisible(false)}
      onOk={() => annotationForm.submit()}
      okText={editingAnnotation ? "保存更改" : "立即创建"}
      cancelText="取消"
      centered
      width={520}
      maskClosable={false}
      className="rounded-2xl overflow-hidden"
      styles={{ mask: { backdropFilter: "blur(4px)" } }}
    >
      <Form
        form={annotationForm}
        onFinish={handleSaveAnnotation}
        layout="vertical"
        className="pt-6"
        requiredMark={false}
      >
        <Form.Item
          name="content"
          label={
            <span className="font-semibold text-gray-700 flex items-center gap-2">
              <EditOutlined /> 标注内容
            </span>
          }
          rules={[{ required: true, message: "请输入标注内容" }]}
        >
          <Input.TextArea
            rows={4}
            placeholder="请输入详细的备注信息，例如：数据异常波动、设备故障记录等..."
            className="rounded-xl border-gray-200 focus:border-blue-500 hover:border-blue-400 transition-colors text-base p-3"
            showCount
            maxLength={200}
          />
        </Form.Item>

        <div className="bg-gray-50/80 rounded-xl p-5 border border-gray-100 mt-2">
          <Form.Item
            name="status"
            label={
              <span className="font-semibold text-gray-700 flex items-center gap-2">
                <TagOutlined /> 状态类型
              </span>
            }
            initialValue="Info"
            className="mb-5"
          >
            <Radio.Group className="w-full grid grid-cols-3 gap-3">
              <Radio.Button
                value="Info"
                className="flex items-center justify-center border-0 shadow-sm rounded-lg hover:text-blue-600 bg-white h-10 peer-checked:bg-blue-50 peer-checked:border-blue-200"
              >
                <Space>
                  <InfoCircleOutlined className="text-blue-500" /> 信息
                </Space>
              </Radio.Button>
              <Radio.Button
                value="Warning"
                className="flex items-center justify-center border-0 shadow-sm rounded-lg hover:text-yellow-600 bg-white h-10"
              >
                <Space>
                  <WarningOutlined className="text-yellow-500" /> 警告
                </Space>
              </Radio.Button>
              <Radio.Button
                value="Critical"
                className="flex items-center justify-center border-0 shadow-sm rounded-lg hover:text-red-600 bg-white h-10"
              >
                <Space>
                  <CloseCircleOutlined className="text-red-500" /> 严重
                </Space>
              </Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            name="color"
            label={<span className="font-semibold text-gray-700">标记颜色</span>}
            initialValue="#1890ff"
            className="mb-0"
          >
            <div className="flex items-center gap-4">
              <ColorPicker
                format="hex"
                showText
                className="shadow-sm"
                presets={[
                  {
                    label: "推荐颜色",
                    colors: [
                      "#1890ff",
                      "#52c41a",
                      "#faad14",
                      "#f5222d",
                      "#722ed1",
                      "#eb2f96",
                      "#13c2c2",
                      "#fa8c16",
                    ],
                  },
                ]}
              />
              <span className="text-xs text-gray-400">选择一个醒目的颜色以便在图表中快速识别</span>
            </div>
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
}
