import React, { useEffect, useRef } from "react";
import { Modal } from "antd";
import {
  DownloadOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";

export default function ContextMenu({
  contextMenu,
  handleDownloadRange,
  setContextMenu,
  handleDeleteAnnotation,
  setEditingAnnotation,
  annotationForm,
  setAnnotationModalVisible,
}) {
  const menuRef = useRef(null);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setContextMenu((prev) => ({ ...prev, visible: false }));
      }
    };
    if (contextMenu.visible) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [contextMenu.visible, setContextMenu]);

  if (!contextMenu.visible) return null;

  const MenuItem = ({ icon, text, onClick, danger }) => (
    <div
      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer text-sm font-medium transition-all duration-200 group ${
        danger
          ? "text-red-500 hover:bg-red-50 hover:text-red-600"
          : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
      }`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <span
        className={`text-lg transition-transform duration-200 group-hover:scale-110 ${
          danger ? "text-red-400" : "text-gray-400 group-hover:text-blue-500"
        }`}
      >
        {icon}
      </span>
      <span>{text}</span>
    </div>
  );

  return (
    <div
      ref={menuRef}
      className="fixed bg-white/95 backdrop-blur-sm shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-xl border border-gray-100 py-2 z-[1100] min-w-[180px] animate-in fade-in zoom-in-95 duration-100"
      style={{
        top: contextMenu.y,
        left: contextMenu.x,
      }}
    >
      {contextMenu.annotation ? (
        <>
          <div className="px-4 py-1 text-xs text-gray-400 font-medium select-none">标注操作</div>
          <MenuItem
            icon={<EditOutlined />}
            text="编辑标注"
            onClick={() => {
              setEditingAnnotation(contextMenu.annotation);
              annotationForm.setFieldsValue({
                content: contextMenu.annotation.content,
                status: contextMenu.annotation.status,
                color: contextMenu.annotation.color,
              });
              setAnnotationModalVisible(true);
              setContextMenu({ ...contextMenu, visible: false });
            }}
          />
          <MenuItem
            icon={<DownloadOutlined />}
            text="导出数据"
            onClick={() => {
              handleDownloadRange(
                contextMenu.annotation.start_time,
                contextMenu.annotation.end_time,
              );
              setContextMenu({ ...contextMenu, visible: false });
            }}
          />
          <div className="h-px bg-gray-100 my-1 mx-2" />
          <MenuItem
            icon={<DeleteOutlined />}
            text="删除标注"
            danger
            onClick={() => {
              setContextMenu({ ...contextMenu, visible: false });
              Modal.confirm({
                title: "确定删除该标注？",
                icon: <ExclamationCircleOutlined />,
                content: "此操作不可恢复。",
                okText: "删除",
                okType: "danger",
                cancelText: "取消",
                onOk() {
                  return handleDeleteAnnotation(contextMenu.annotation.id);
                },
              });
            }}
          />
        </>
      ) : (
        <>
          <div className="px-4 py-1 text-xs text-gray-400 font-medium select-none">区域操作</div>
          <MenuItem
            icon={<PlusOutlined />}
            text="添加新标注"
            onClick={() => {
              setAnnotationModalVisible(true);
              setContextMenu({ ...contextMenu, visible: false });
            }}
          />
          {contextMenu.currentBrushRange && (
            <MenuItem
              icon={<DownloadOutlined />}
              text="下载选中区域数据"
              onClick={() => {
                handleDownloadRange(
                  contextMenu.currentBrushRange[0],
                  contextMenu.currentBrushRange[1],
                );
                setContextMenu({ ...contextMenu, visible: false });
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
