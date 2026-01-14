import { useState, useEffect } from "react";
import request from "../utils/request";
import { message } from "antd";

/**
 * 数据集管理 Hook
 * 处理数据集的获取、删除、轮询状态等逻辑
 */
export const useDatasets = () => {
  const [datasets, setDatasets] = useState([]);
  const [currentDatasetId, setCurrentDatasetId] = useState(null);
  const [isInitLoading, setIsInitLoading] = useState(true);

  // 获取当前选中的数据集对象
  const currentDataset = datasets.find((d) => d.id === currentDatasetId);
  const currentDatasetStatus = currentDataset?.status;

  /**
   * 获取数据集列表
   * @param {AbortSignal} signal - 用于取消请求的信号
   * @returns {Promise<boolean|null>} 成功返回 true，失败返回 false，取消返回 null
   */
  const fetchDatasets = async (signal) => {
    try {
      const list = await request.getDataWithRetry("/api/datasets", { signal }, { retries: 2 });
      const normalizedList = Array.isArray(list) ? list : [];
      const normalized = normalizedList
        .map((d) => {
          const rawId = d?.id;
          const idNum = typeof rawId === "string" ? Number(rawId) : rawId;
          return {
            ...d,
            id: idNum,
          };
        })
        .filter((d) => d?.id !== null && d?.id !== undefined && !Number.isNaN(d.id));

      setDatasets(normalized);

      if (normalized.length === 0) {
        if (currentDatasetId !== null) setCurrentDatasetId(null);
        return true;
      }

      // 确保 currentDatasetId 有效
      const currentIdNum =
        typeof currentDatasetId === "string" ? Number(currentDatasetId) : currentDatasetId;
      const hasCurrent =
        currentIdNum !== null &&
        currentIdNum !== undefined &&
        !Number.isNaN(currentIdNum) &&
        normalized.some((d) => d.id === currentIdNum);

      if (!hasCurrent) {
        setCurrentDatasetId(normalized[0].id);
      }
      return true;
    } catch (error) {
      if (request.isCanceled?.(error)) return null;
      console.error("Fetch datasets failed", error);
      return false;
    } finally {
      setIsInitLoading(false);
    }
  };

  /**
   * 删除数据集
   * @param {Event} e - 事件对象
   * @param {number|string} id - 数据集 ID
   */
  const handleDeleteDataset = async (e, id) => {
    if (e && e.stopPropagation) e.stopPropagation();

    const datasetId = typeof id === "string" ? Number(id) : id;
    if (datasetId === null || datasetId === undefined || Number.isNaN(datasetId)) {
      message.error("删除数据集失败：无效的数据集 ID");
      return;
    }

    const msgKey = `delete-dataset-${datasetId}`;

    // 快照用于回滚
    const prevDatasets = [...datasets];
    const prevCurrentId = currentDatasetId;

    // 乐观更新
    const newDatasets = datasets.filter((d) => d.id !== datasetId);
    setDatasets(newDatasets);

    if (currentDatasetId === datasetId) {
      setCurrentDatasetId(newDatasets.length > 0 ? newDatasets[0].id : null);
    }

    try {
      message.loading({ content: "正在删除数据集...", key: msgKey, duration: 0 });
      const res = await request.delete(`/api/datasets/${datasetId}`, { timeout: 15000 });
      if (res?.status === 202) {
        message.success({ content: "已开始删除，后台处理中", key: msgKey, duration: 2 });
      } else {
        message.success({ content: "数据集删除成功", key: msgKey, duration: 2 });
      }
      fetchDatasets();
    } catch (error) {
      console.error(error);
      message.error({ content: "删除数据集失败", key: msgKey, duration: 2 });
      // 回滚
      setDatasets(prevDatasets);
      setCurrentDatasetId(prevCurrentId);
    }
  };

  // 初始加载
  useEffect(() => {
    fetchDatasets();
  }, []);

  // 轮询状态更新
  useEffect(() => {
    let pollTimer;
    const controller = new AbortController();
    let consecutiveErrors = 0;

    if (
      currentDataset &&
      (currentDataset.status === "pending" || currentDataset.status === "processing")
    ) {
      pollTimer = setInterval(async () => {
        if (consecutiveErrors >= 5) {
          clearInterval(pollTimer);
          message.error("连接服务器失败，已停止自动刷新");
          return;
        }

        const datasetsSuccess = await fetchDatasets(controller.signal);
        if (datasetsSuccess === null) return;
        if (datasetsSuccess === false) {
          consecutiveErrors++;
          return;
        }
        consecutiveErrors = 0;
      }, 2000);
    }
    return () => {
      if (pollTimer) clearInterval(pollTimer);
      controller.abort();
    };
  }, [currentDatasetId, currentDatasetStatus]);

  return {
    datasets,
    setDatasets,
    currentDatasetId,
    setCurrentDatasetId,
    isInitLoading,
    currentDataset,
    fetchDatasets,
    handleDeleteDataset,
  };
};
