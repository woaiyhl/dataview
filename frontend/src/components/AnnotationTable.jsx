import React from "react";
import { Card, Table, Space, Button } from "antd";
import { EditOutlined } from "@ant-design/icons";

export default function AnnotationTable({
  annotations,
  selections = [],
  zoomToRange,
  setEditingAnnotation,
  annotationForm,
  setAnnotationModalVisible,
  handleDeleteAnnotation,
  tableRef,
  onCreateFromSelection,
  onRemoveSelection,
}) {
  const selectionRows = selections.map((s) => ({
    ...s,
    id: `sel_${s.start_time}_${s.end_time}`,
    status: "待标注",
    content: "",
    _isSelection: true,
  }));
  const rows = [...selectionRows, ...annotations.map((a) => ({ ...a, _isSelection: false }))];
  return (
    <Card title="标注列表" style={{ marginTop: 16 }} hoverable ref={tableRef}>
      <Table
        rowKey={(r) => r.id}
        dataSource={rows}
        pagination={{ pageSize: 8 }}
        columns={[
          { title: "开始时间", dataIndex: "start_time" },
          { title: "结束时间", dataIndex: "end_time" },
          { title: "状态", dataIndex: "status" },
          { title: "备注", dataIndex: "content" },
          {
            title: "颜色",
            dataIndex: "color",
            render: (c, r) => (
              <span
                style={{
                  display: "inline-block",
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  background: c || "#999",
                }}
              />
            ),
          },
          {
            title: "操作",
            render: (_, r) => (
              <Space>
                {r._isSelection ? (
                  <>
                    <Button size="small" type="primary" onClick={() => onCreateFromSelection(r)}>
                      添加标注
                    </Button>
                    <Button size="small" danger onClick={() => onRemoveSelection(r)}>
                      删除选区
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="small"
                      type="primary"
                      onClick={() => {
                        setEditingAnnotation(r);
                        annotationForm.setFieldsValue({
                          content: r.content,
                          status: r.status,
                          color: r.color,
                        });
                        setAnnotationModalVisible(true);
                      }}
                    >
                      编辑
                    </Button>
                    <Button size="small" danger onClick={() => handleDeleteAnnotation(r.id)}>
                      删除
                    </Button>
                  </>
                )}
              </Space>
            ),
          },
        ]}
      />
    </Card>
  );
}
