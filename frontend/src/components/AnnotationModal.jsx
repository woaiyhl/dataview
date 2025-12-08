import React from "react";
import { Modal, Form, Input, Select, ColorPicker } from "antd";
const { Option } = Select;

export default function AnnotationModal({ editingAnnotation, visible, setVisible, annotationForm, handleSaveAnnotation }) {
  return (
    <Modal title={editingAnnotation ? "编辑标注" : "添加标注"} open={visible} onCancel={() => setVisible(false)} onOk={() => annotationForm.submit()} okText={editingAnnotation ? "保存" : "创建"} cancelText="取消">
      <Form form={annotationForm} onFinish={handleSaveAnnotation} layout="vertical">
        <Form.Item name="content" label="标注内容" rules={[{ required: true, message: "请输入标注内容" }]}>
          <Input.TextArea />
        </Form.Item>
        <Form.Item name="status" label="状态" initialValue="Info">
          <Select>
            <Option value="Info">信息 (Info)</Option>
            <Option value="Warning">警告 (Warning)</Option>
            <Option value="Critical">严重 (Critical)</Option>
          </Select>
        </Form.Item>
        <Form.Item name="color" label="颜色" initialValue="#1890ff">
          <ColorPicker format="hex" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

