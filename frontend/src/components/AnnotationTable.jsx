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
                onClick={() => onCreateFromSelection(r)}
              >
                添加
              </Button>
              <Button
                size="small"
                type="text"
                danger
                icon={<CloseOutlined />}
                onClick={() => onRemoveSelection(r)}
              >
                丢弃
              </Button>
            </>
          ) : (
            <>
              <Button
                size="small"
                type="text"
                icon={<EditOutlined />}
                className="text-blue-600 hover:bg-blue-50"
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
              <Popconfirm
                title="确定删除该标注？"
                onConfirm={() => handleDeleteAnnotation(r.id)}
                okText="删除"
                cancelText="取消"
                okType="danger"
              >
                <Button
                  size="small"
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  className="hover:bg-red-50"
                >
                  删除
                </Button>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card
      title={
        <span className="font-bold text-gray-800">
          标注列表 <span className="text-gray-400 text-sm font-normal ml-2">{rows.length} 项</span>
        </span>
      }
      className="mt-6 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
      bordered={false}
      ref={tableRef}
      bodyStyle={{ padding: 0 }}
    >
      <Table
        rowKey={(r) => r.id}
        dataSource={rows}
        pagination={{ pageSize: 8, hideOnSinglePage: true, className: "px-6 py-4" }}
        columns={columns}
        onRow={(record) => ({
          onClick: () => {
            if (zoomToRange) zoomToRange(record.start_time, record.end_time);
          },
          className: "cursor-pointer hover:bg-blue-50/30 transition-colors group",
        })}
      />
    </Card>
  );
}
