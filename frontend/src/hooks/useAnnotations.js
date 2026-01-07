import { useState, useEffect } from "react";
import request from "../utils/request";
import { message } from "antd";

/**
 * 标注管理 Hook
 * 处理标注的获取、保存、删除以及选区管理
 * @param {number} currentDatasetId - 当前数据集 ID
 */
export const useAnnotations = (currentDatasetId) => {
  const [annotations, setAnnotations] = useState([]);
  const [annotationModalVisible, setAnnotationModalVisible] = useState(false);
  const [currentBrushRange, setCurrentBrushRange] = useState(null);
  const [editingAnnotation, setEditingAnnotation] = useState(null);
  const [selectionRanges, setSelectionRanges] = useState([]);

  /**
   * 获取标注列表
   * @param {number} id - 数据集 ID
   */
  const fetchAnnotations = async (id) => {
    try {
      const res = await axios.get(`/api/annotations/${id}`);
      setAnnotations(res.data);
    } catch (error) {
      console.error("Failed to fetch annotations", error);
    }
  };

  /**
   * 保存标注（新建或更新）
   * @param {Object} values - 表单数据
   */
  const handleSaveAnnotation = async (values) => {
    try {
      const color = typeof values.color === "string" ? values.color : values.color.toHexString();
      const payload = {
        content: values.content,
        color: color,
        status: values.status,
      };

      if (editingAnnotation) {
        await request.put(`/api/annotations/${editingAnnotation.id}`, payload);
        message.success("标注已更新");
      } else {
        await request.post("/api/annotations", {
          ...payload,
          dataset_id: currentDatasetId,
          start_time: currentBrushRange[0],
          end_time: currentBrushRange[1],
        });
        message.success("标注已创建");
      }

      setAnnotationModalVisible(false);
      setEditingAnnotation(null);
      setCurrentBrushRange(null);
      fetchAnnotations(currentDatasetId);
      return true;
    } catch (error) {
      console.error("Save annotation failed:", error);
      const errorMsg = error.response?.data?.message || error.message || "保存标注失败";
      message.error(`保存标注失败: ${errorMsg}`);
      return false;
    }
  };

  /**
   * 删除标注
   * @param {number} id - 标注 ID
   */
  const handleDeleteAnnotation = async (id) => {
    try {
      await axios.delete(`/api/annotations/${id}`);
      message.success("标注已删除");
      fetchAnnotations(currentDatasetId);
    } catch (error) {
      message.error("删除标注失败");
    }
  };

  // 当数据集变化时重新获取标注
  useEffect(() => {
    if (currentDatasetId) {
      fetchAnnotations(currentDatasetId);
    }
  }, [currentDatasetId]);

  return {
    annotations,
    setAnnotations,
    annotationModalVisible,
    setAnnotationModalVisible,
    currentBrushRange,
    setCurrentBrushRange,
    editingAnnotation,
    setEditingAnnotation,
    selectionRanges,
    setSelectionRanges,
    handleSaveAnnotation,
    handleDeleteAnnotation,
    fetchAnnotations,
  };
};
