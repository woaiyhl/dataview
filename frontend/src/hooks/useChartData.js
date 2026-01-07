import { useState, useEffect } from "react";
import axios from "axios";
import request from "../utils/request";
import { message } from "antd";

/**
 * 图表数据管理 Hook
 * 处理图表数据的获取、统计信息、时间范围筛选等
 * @param {number} currentDatasetId - 当前数据集 ID
 * @param {string} currentDatasetStatus - 当前数据集状态
 */
export const useChartData = (currentDatasetId, currentDatasetStatus) => {
  const [chartData, setChartData] = useState(null);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState(null);

  /**
   * 获取统计信息
   * @param {number} id - 数据集 ID
   * @param {AbortSignal} signal - 取消信号
   */
  const fetchStats = async (id, signal) => {
    try {
      const res = await axios.get(`/api/stats/${id}`, { signal });
      setStats(res.data);
      if (res.data.length > 0) {
        const metrics = res.data.map((s) => s.metric);
        // 如果当前没有选中的指标，或者选中的指标不在新的列表中，默认选中第一个
        if (!selectedMetric || !metrics.includes(selectedMetric)) {
          setSelectedMetric(res.data[0].metric);
        }
      } else {
        // 如果没有指标，手动结束 loading，因为不会触发 fetchData
        setLoading(false);
      }
      return true;
    } catch (error) {
      if (!axios.isCancel(error)) {
        console.error(error);
        setLoading(false);
      }
      return false;
    }
  };

  /**
   * 获取具体图表数据
   * @param {number} id - 数据集 ID
   * @param {Array} range - 时间范围
   * @param {string} metric - 指标名称
   * @param {AbortSignal} signal - 取消信号
   */
  const fetchData = async (id, range, metric, signal) => {
    setLoading(true);
    try {
      let url = `/api/data/${id}`;
      const params = {};
      if (range && range.length === 2 && range[0] && range[1]) {
        params.start = range[0].toISOString();
        params.end = range[1].toISOString();
      }
      if (metric) {
        params.metric = metric;
      }

      const res = await axios.get(url, { params, signal });
      setChartData(res.data);
      return true;
    } catch (error) {
      if (!axios.isCancel(error)) {
        message.error("加载图表数据失败");
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 当数据集或时间范围变化时，重置状态并获取统计信息
  useEffect(() => {
    if (!currentDatasetId) return;

    setChartData(null);
    setStats([]);
    setSelectedMetric(null);

    if (currentDatasetStatus === "ready") {
      setLoading(true);
      fetchStats(currentDatasetId);
      return;
    }

    setLoading(false);
  }, [currentDatasetId, dateRange, currentDatasetStatus]);

  // 当选中的指标变化时，获取图表数据
  useEffect(() => {
    if (currentDatasetId && selectedMetric) {
      setLoading(true);
      fetchData(currentDatasetId, dateRange, selectedMetric);
    }
  }, [selectedMetric, currentDatasetId, dateRange]);

  return {
    chartData,
    setChartData,
    stats,
    loading,
    dateRange,
    setDateRange,
    selectedMetric,
    setSelectedMetric,
  };
};
