import React from "react";

export default function ContextMenu({
  contextMenu,
  handleDownloadRange,
  setContextMenu,
  handleDeleteAnnotation,
  handleMouseEnter,
  handleMouseLeave,
  setEditingAnnotation,
  annotationForm,
  setAnnotationModalVisible,
}) {
  if (!contextMenu.visible) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: contextMenu.y,
        left: contextMenu.x,
        background: "white",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        zIndex: 1000,
        borderRadius: 4,
        padding: "4px 0",
        minWidth: 120,
      }}
    >
      {contextMenu.annotation ? (
        <>
          <div
            style={{ padding: "8px 16px", cursor: "pointer", transition: "all 0.3s" }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={() => {
              handleDownloadRange(
                contextMenu.annotation.start_time,
                contextMenu.annotation.end_time,
              );
              setContextMenu({ ...contextMenu, visible: false });
            }}
          >
            下载该时间段数据
          </div>
          <div
            style={{ padding: "8px 16px", cursor: "pointer", transition: "all 0.3s" }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
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
          >
            编辑
          </div>
          <div
            style={{ padding: "8px 16px", cursor: "pointer", color: "red", transition: "all 0.3s" }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={() => {
              handleDeleteAnnotation(contextMenu.annotation.id);
              setContextMenu({ ...contextMenu, visible: false });
            }}
          >
            删除
          </div>
        </>
      ) : (
        <>
          <div
            style={{ padding: "8px 16px", cursor: "pointer", transition: "all 0.3s" }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={() => {
              setAnnotationModalVisible(true);
              setContextMenu({ ...contextMenu, visible: false });
            }}
          >
            添加标注
          </div>
          {contextMenu.currentBrushRange && (
            <div
              style={{ padding: "8px 16px", cursor: "pointer", transition: "all 0.3s" }}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onClick={() => {
                handleDownloadRange(
                  contextMenu.currentBrushRange[0],
                  contextMenu.currentBrushRange[1],
                );
                setContextMenu({ ...contextMenu, visible: false });
              }}
            >
              下载选中区域数据
            </div>
          )}
        </>
      )}
    </div>
  );
}
