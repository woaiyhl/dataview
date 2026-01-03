import React from "react";
import { Card, Table, Space, Button, Tag, Tooltip, Popconfirm } from "antd";
import { EditOutlined, DeleteOutlined, PlusOutlined, CloseOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

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
    content: "未保存的选区",
    _isSelection: true,
  }));
  const rows = [...selectionRows, ...annotations.map((a) => ({ ...a, _isSelection: false }))];

  const columns = [
    {
      title: "时间范围",
      key: "range",
      width: 250,
      render: (_, r) => (
        <div className="flex flex-col">
          <span className="font-mono text-gray-600 text-xs">
            {dayjs(r.start_time).format("YYYY-MM-DD HH:mm:ss")}
          </span>
          <span className="font-mono text-gray-300 text-xs pl-2">⬇</span>
          <span className="font-mono text-gray-600 text-xs">
            {dayjs(r.end_time).format("YYYY-MM-DD HH:mm:ss")}
          </span>
        </div>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 120,
      render: (status, r) => (
        <Tag
          color={r._isSelection ? "warning" : "blue"}
          bordered={false}
          className="rounded-full px-3"
        >
          {status || "无状态"}
        </Tag>
      ),
    },
    {
      title: "备注",
      dataIndex: "content",
      render: (text, r) => (
        <span
          className={`line-clamp-2 ${r._isSelection ? "text-gray-400 italic" : "text-gray-700"}`}
        >
          {text || "-"}
        </span>
      ),
    },
    {
      title: "标记色",
      dataIndex: "color",
      width: 80,
      align: "center",
      render: (c, r) => (
        <Tooltip title={c}>
          <div
            className="w-4 h-4 rounded-full shadow-sm mx-auto ring-2 ring-white"
            style={{ background: c || "#999" }}
          />
        </Tooltip>
      ),
    },
    {
      title: "操作",
      key: "action",
      width: 180,
      render: (_, r) => (
        <Space size="small" onClick={(e) => e.stopPropagation()}>
          {r._isSelection ? (
            <>
              <Button
                size="small"
                type="primary"
                icon={<PlusOutlined />}
                className="rounded-lg text-xs"
                onClick={() => onCreateFromSelection(r)}
              >
                添加
              </Button>
              <Button
                size="small"
                danger
                type="text"
                icon={<CloseOutlined />}
                className="rounded-lg text-xs hover:bg-red-50"
                onClick={() => onRemoveSelection(r)}
              >
                忽略
              </Button>
            </>
          ) : (
            <>
              <Tooltip title="定位">
                <Button
                  size="small"
                  type="text"
                  icon={<div className="text-blue-500">⌖</div>}
                  className="rounded-lg hover:bg-blue-50"
                  onClick={() => zoomToRange(r.start_time, r.end_time)}
                />
              </Tooltip>
              <Tooltip title="编辑">
                <Button
                  size="small"
                  type="text"
                  icon={<EditOutlined className="text-gray-500" />}
                  className="rounded-lg hover:bg-gray-100"
                  onClick={() => {
                    setEditingAnnotation(r);
                    annotationForm.setFieldsValue({
                      ...r,
                      range: [dayjs(r.start_time), dayjs(r.end_time)],
                    });
                    setAnnotationModalVisible(true);
                  }}
                />
              </Tooltip>
              <Popconfirm
                title="删除标注"
                description="确定要删除这条标注记录吗？"
                onConfirm={() => handleDeleteAnnotation(r.id)}
                okText="删除"
                cancelText="取消"
                okButtonProps={{ danger: true }}
              >
                <Button
                  size="small"
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  className="rounded-lg hover:bg-red-50"
                />
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card
      ref={tableRef}
      title={
        <div className="flex items-center gap-2 py-1">
          <div className="w-1 h-5 bg-purple-500 rounded-full"></div>
          <span className="font-bold text-gray-800 text-lg">标注记录</span>
          <Tag className="ml-2 bg-gray-100 border-none text-gray-500 rounded-full px-3">
            {annotations.length}
          </Tag>
        </div>
      }
      bordered={false}
      className="shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl border border-gray-100"
      bodyStyle={{ padding: 0 }}
    >
      <Table
        dataSource={rows}
        columns={columns}
        rowKey="id"
        pagination={{
          pageSize: 5,
          showTotal: (total) => `共 ${total} 条`,
          className: "px-6 pb-4",
        }}
        onRow={(record) => ({
          onClick: () => {
            if (!record._isSelection) {
              zoomToRange(record.start_time, record.end_time);
            }
          },
          className: "cursor-pointer hover:bg-gray-50/80 transition-colors",
        })}
      />
    </Card>
  );
}
