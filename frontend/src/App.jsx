import React, { useState, useEffect, useRef } from "react";
import {
  Layout,
  Upload,
  Button,
  Select,
  Card,
  DatePicker,
  message,
  Row,
  Col,
  Statistic,
  Empty,
  Spin,
  Progress,
  Modal,
  Form,
  Input,
  ColorPicker,
} from "antd";
import { UploadOutlined, DeleteOutlined } from "@ant-design/icons";
import ReactECharts from "echarts-for-react";
import axios from "axios";
import dayjs from "dayjs";

const { Header, Content } = Layout;
const { Option } = Select;
const { RangePicker } = DatePicker;

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

const App = () => {
  const [datasets, setDatasets] = useState([]);
  const [currentDatasetId, setCurrentDatasetId] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState([]);

  // New State for Chart Display
  const [selectedMetric, setSelectedMetric] = useState(null);

  // New State for Upload
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // New State for Annotations
  const [annotations, setAnnotations] = useState([]);
  const [annotationModalVisible, setAnnotationModalVisible] = useState(false);
  const [currentBrushRange, setCurrentBrushRange] = useState(null);
  const [editingAnnotation, setEditingAnnotation] = useState(null);
  const [annotationForm] = Form.useForm();

  // Context Menu State
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, annotation: null });

  // Theme State
  const [themeColor, setThemeColor] = useState("#001529");

  const chartRef = useRef(null);

  // Load datasets on mount
  useEffect(() => {
    fetchDatasets();
    // Close context menu on click elsewhere
    const handleClick = () => setContextMenu({ ...contextMenu, visible: false });
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  // Fetch annotations when dataset changes
  useEffect(() => {
    if (currentDatasetId) {
      fetchAnnotations(currentDatasetId);
    }
  }, [currentDatasetId]);

  const fetchAnnotations = async (id) => {
    try {
      const res = await axios.get(`/api/annotations/${id}`);
      setAnnotations(res.data);
    } catch (error) {
      console.error("Failed to fetch annotations", error);
    }
  };

  // Find current dataset object to check status
  const currentDataset = datasets.find((d) => d.id === currentDatasetId);

  // Poll for status updates if processing
  useEffect(() => {
    let pollTimer;
    if (
      currentDataset &&
      (currentDataset.status === "pending" || currentDataset.status === "processing")
    ) {
      pollTimer = setInterval(() => {
        fetchDatasets();
        // Also try fetching data in case it just finished
        if (currentDatasetId) {
          fetchStats(currentDatasetId);
          if (selectedMetric) {
            fetchData(currentDatasetId, dateRange, selectedMetric);
          }
        }
      }, 2000);
    }
    return () => {
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [currentDataset, currentDatasetId, selectedMetric]);

  // Fetch data when dataset or range changes
  useEffect(() => {
    if (currentDatasetId) {
      // Clear previous data
      setChartData(null);
      setSelectedMetric(null);
      fetchStats(currentDatasetId);
    }
  }, [currentDatasetId, dateRange]);

  const handleDeleteDataset = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("确定要删除该数据集吗？")) return;

    try {
      await axios.delete(`/api/datasets/${id}`);
      message.success("数据集删除成功");

      const newDatasets = datasets.filter((d) => d.id !== id);
      setDatasets(newDatasets);

      if (currentDatasetId === id) {
        setCurrentDatasetId(newDatasets.length > 0 ? newDatasets[0].id : null);
        if (newDatasets.length === 0) {
          setChartData(null);
          setStats([]);
        }
      }
    } catch (error) {
      console.error(error);
      message.error("删除数据集失败");
    }
  };

  const fetchDatasets = async () => {
    try {
      const res = await axios.get("/api/datasets");
      setDatasets(res.data);
      if (res.data.length > 0 && !currentDatasetId) {
        setCurrentDatasetId(res.data[0].id);
      }
    } catch (error) {
      // Quiet fail if no backend or empty
    }
  };

  const fetchData = async (id, range, metric) => {
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

      const res = await axios.get(url, { params });
      setChartData(res.data);
    } catch (error) {
      message.error("加载图表数据失败");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (id) => {
    try {
      const res = await axios.get(`/api/stats/${id}`);
      setStats(res.data);

      // Initialize selectedMetric if not set
      if (res.data.length > 0 && !selectedMetric) {
        setSelectedMetric(res.data[0].metric);
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Effect to trigger data fetch when metric changes
  useEffect(() => {
    if (currentDatasetId && selectedMetric) {
      fetchData(currentDatasetId, dateRange, selectedMetric);
    }
  }, [selectedMetric, currentDatasetId, dateRange]);

  const generateUploadId = (file) => {
    return `${file.name}-${file.size}-${file.lastModified}`;
  };

  const handleUpload = async ({ file, onSuccess, onError }) => {
    setUploading(true);
    setUploadProgress(0);

    const uploadId = generateUploadId(file);
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    try {
      // 1. Check uploaded chunks
      const checkRes = await axios.get(`/api/upload/check?uploadId=${uploadId}`);
      const uploadedChunks = new Set(checkRes.data.uploadedChunks);

      // 2. Upload missing chunks
      for (let i = 0; i < totalChunks; i++) {
        if (uploadedChunks.has(i)) {
          setUploadProgress(Math.round(((i + 1) / totalChunks) * 100));
          continue;
        }

        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append("uploadId", uploadId);
        formData.append("chunkIndex", i);
        formData.append("file", chunk);

        await axios.post("/api/upload/chunk", formData);
        setUploadProgress(Math.round(((i + 1) / totalChunks) * 100));
      }

      // 3. Merge chunks
      const mergeRes = await axios.post("/api/upload/merge", {
        uploadId,
        filename: file.name,
      });

      message.success("上传成功，后台处理中...");
      setUploading(false);
      onSuccess(mergeRes.data);

      fetchDatasets(); // Refresh list
      setCurrentDatasetId(mergeRes.data.id); // Switch to new
    } catch (error) {
      console.error(error);
      message.error("上传失败");
      setUploading(false);
      onError(error);
    }
  };

  const handleSaveAnnotation = async (values) => {
    try {
      const color = typeof values.color === "string" ? values.color : values.color.toHexString();
      const payload = {
        content: values.content,
        color: color,
        status: values.status,
      };

      if (editingAnnotation) {
        await axios.put(`/api/annotations/${editingAnnotation.id}`, payload);
        message.success("标注已更新");
      } else {
        await axios.post("/api/annotations", {
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
    } catch (error) {
      message.error("保存标注失败");
    }
  };

  const handleDeleteAnnotation = async (id) => {
    if (!window.confirm("确定删除该标注？")) return;
    try {
      await axios.delete(`/api/annotations/${id}`);
      message.success("标注已删除");
      fetchAnnotations(currentDatasetId);
    } catch (error) {
      message.error("删除标注失败");
    }
  };

  const handleDownloadRange = async (start, end) => {
    try {
      const params = {
        start: start,
        end: end,
        metric: selectedMetric,
      };
      const response = await axios.get(`/api/download/${currentDatasetId}`, {
        params,
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `data_${start}_${end}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error(error);
      message.error("下载数据失败");
    }
  };

  const getOption = () => {
    if (!chartData || !Array.isArray(chartData)) return {};

    const visibleSeries = [];
    if (selectedMetric && chartData.length > 0) {
      visibleSeries.push({
        name: selectedMetric,
        data: chartData.map((d) => [d.timestamp, d.value]),
        type: "line",
      });
    }

    const isLargeData = visibleSeries.length > 0 && visibleSeries[0].data.length > 2000;

    const flatMarkAreaData = annotations.map((ann) => [
      {
        xAxis: ann.start_time,
        name: ann.content,
        itemStyle: { color: ann.color, opacity: 0.2 },
        label: { show: true, formatter: `${ann.content} (${ann.status})`, color: "#333" },
      },
      {
        xAxis: ann.end_time,
      },
    ]);

    return {
      tooltip: {
        trigger: "axis",
      },
      brush: {
        toolbox: ["rect", "clear"],
        xAxisIndex: 0,
        throttleType: "debounce",
        throttleDelay: 300,
      },
      toolbox: {
        feature: {
          dataZoom: {
            yAxisIndex: "none",
          },
          restore: {},
          saveAsImage: {},
          brush: {
            type: ["lineX", "clear"],
          },
        },
      },
      xAxis: {
        type: "time",
        boundaryGap: false,
      },
      yAxis: {
        type: "value",
        scale: true,
      },
      dataZoom: [
        {
          type: "slider",
          start: 0,
          end: 100,
        },
        {
          type: "inside",
        },
      ],
      series: visibleSeries.map((s) => ({
        ...s,
        smooth: !isLargeData,
        showSymbol: !isLargeData,
        sampling: "lttb",
        type: "line",
        markArea: {
          data: flatMarkAreaData,
          label: { position: "insideTopLeft" },
        },
      })),
    };
  };

  const onChartEvents = {
    brushEnd: (params) => {
      if (params.areas && params.areas.length > 0) {
        const area = params.areas[0];
        const coordRange = area.coordRange;
        const start = new Date(coordRange[0]).toISOString();
        const end = new Date(coordRange[1]).toISOString();

        setCurrentBrushRange([start, end]);
        setEditingAnnotation(null);
        annotationForm.resetFields();
      } else {
        setCurrentBrushRange(null);
      }
    },
    contextmenu: (params) => {
      params.event.stop();

      let targetAnnotation = null;

      // 1. Direct component check
      if (params.componentType === "markArea") {
        targetAnnotation = annotations.find((a) => a.content === params.name);
      }

      // 2. Fallback: Coordinate check
      if (!targetAnnotation) {
        const chartInstance = chartRef.current?.getEchartsInstance();
        if (chartInstance) {
          const point = [params.event.event.offsetX, params.event.event.offsetY];
          if (chartInstance.containPixel("grid", point)) {
            const dateVal = chartInstance.convertFromPixel({ seriesIndex: 0 }, point)[0];
            const time = new Date(dateVal).getTime();

            // Find annotation containing this time
            targetAnnotation = annotations.find((ann) => {
              const start = new Date(ann.start_time).getTime();
              const end = new Date(ann.end_time).getTime();
              return time >= start && time <= end;
            });
          }
        }
      }

      if (targetAnnotation) {
        setContextMenu({
          visible: true,
          x: params.event.event.clientX,
          y: params.event.event.clientY,
          annotation: targetAnnotation,
        });
      } else {
        setContextMenu({
          visible: true,
          x: params.event.event.clientX,
          y: params.event.event.clientY,
          annotation: null,
        });
      }
    },
  };

  const handleMouseEnter = (e) => {
    e.target.style.background = "#f5f5f5";
  };
  const handleMouseLeave = (e) => {
    e.target.style.background = "white";
  };

  return (
    <Layout style={{ minHeight: "100vh", background: "#f0f2f5" }}>
      <Header
        style={{ display: "flex", alignItems: "center", background: themeColor, padding: "0 20px" }}
      >
        <div
          className="logo"
          style={{ fontSize: "1.2rem", fontWeight: "bold", marginRight: "2rem", color: "#fff" }}
        >
          时间序列可视化
        </div>
        <div style={{ marginRight: "1rem", display: "flex", alignItems: "center" }}>
          <span style={{ color: "#fff", marginRight: "8px" }}>主题色:</span>
          <ColorPicker
            value={themeColor}
            onChange={(c) => setThemeColor(c.toHexString())}
            format="hex"
          />
        </div>
        <Select
          style={{ width: 300, marginRight: "1rem" }}
          placeholder="选择数据集"
          value={currentDatasetId}
          onChange={setCurrentDatasetId}
          notFoundContent="暂无数据集"
          optionLabelProp="label"
        >
          {datasets.map((d) => (
            <Option key={d.id} value={d.id} label={d.filename}>
              <div
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <span
                  style={{
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                    marginRight: "8px",
                  }}
                  title={d.filename}
                >
                  {d.filename}
                </span>
                <DeleteOutlined
                  onClick={(e) => handleDeleteDataset(e, d.id)}
                  style={{ color: "red", cursor: "pointer", flexShrink: 0 }}
                />
              </div>
            </Option>
          ))}
        </Select>
        <Upload customRequest={handleUpload} showUploadList={false} disabled={uploading}>
          <Button icon={<UploadOutlined />} loading={uploading}>
            {uploading ? "上传中..." : "上传 CSV"}
          </Button>
        </Upload>
        {uploading && (
          <Progress
            percent={uploadProgress}
            size="small"
            status="active"
            style={{ width: 100, marginLeft: 10 }}
            format={(percent) => `${percent}%`}
          />
        )}
      </Header>
      <Content style={{ padding: "20px" }}>
        {currentDatasetId ? (
          <>
            <Card style={{ marginBottom: "20px", borderRadius: 8 }} hoverable>
              <Row gutter={16}>
                <Col span={12}>
                  <RangePicker
                    showTime
                    onChange={(dates) => setDateRange(dates)}
                    style={{ width: "100%" }}
                    placeholder={["开始日期", "结束日期"]}
                  />
                </Col>
                <Col span={12} style={{ textAlign: "right" }}>
                  <span style={{ color: "#888" }}>数据集 ID: {currentDatasetId}</span>
                </Col>
              </Row>
            </Card>

            <Row gutter={16} style={{ marginBottom: "20px" }}>
              {stats.map((s, idx) => (
                <Col span={6} key={idx} style={{ marginBottom: 10 }}>
                  <Card size="small" title={s.metric} hoverable style={{ borderRadius: 8 }}>
                    <Statistic title="平均值" value={s.avg} precision={2} />
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginTop: 10,
                        fontSize: "0.8em",
                        color: "#666",
                      }}
                    >
                      <span>最小值: {s.min}</span>
                      <span>最大值: {s.max}</span>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>

            <Card
              title="数据可视化"
              bordered={false}
              style={{ borderRadius: 8 }}
              hoverable
              extra={
                <Select
                  value={selectedMetric}
                  onChange={setSelectedMetric}
                  style={{ width: 200 }}
                  placeholder="选择指标"
                >
                  {stats.map((s) => (
                    <Option key={s.metric} value={s.metric}>
                      {s.metric}
                    </Option>
                  ))}
                </Select>
              }
            >
              {currentDataset && currentDataset.status === "failed" ? (
                <Empty
                  description={<span style={{ color: "red" }}>数据处理失败，请检查文件格式。</span>}
                />
              ) : loading ||
                (currentDataset &&
                  (currentDataset.status === "pending" ||
                    currentDataset.status === "processing")) ? (
                <div style={{ textAlign: "center", padding: "50px" }}>
                  <Spin
                    tip={
                      currentDataset?.status === "processing" ? "正在处理 CSV 数据..." : "加载中..."
                    }
                    size="large"
                  />
                  {currentDataset?.status === "processing" && (
                    <div style={{ marginTop: 20, color: "#888" }}>
                      大文件可能需要几分钟处理，图表将自动更新。
                    </div>
                  )}
                </div>
              ) : (
                <ReactECharts
                  ref={chartRef}
                  option={getOption()}
                  style={{ height: "500px", width: "100%" }}
                  notMerge={true}
                  lazyUpdate={true}
                  onEvents={onChartEvents}
                />
              )}
            </Card>
          </>
        ) : (
          <Empty
            description={
              <span>
                请{" "}
                <Button
                  type="link"
                  onClick={() => document.querySelector(".ant-upload input").click()}
                >
                  上传 CSV 文件
                </Button>{" "}
                以开始
              </span>
            }
            style={{ marginTop: "100px" }}
          />
        )}

        {/* Annotation Context Menu */}
        {contextMenu.visible && (
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
                  style={{
                    padding: "8px 16px",
                    cursor: "pointer",
                    transition: "all 0.3s",
                  }}
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
                  style={{
                    padding: "8px 16px",
                    cursor: "pointer",
                    color: "red",
                    transition: "all 0.3s",
                  }}
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
                {currentBrushRange && (
                  <div
                    style={{ padding: "8px 16px", cursor: "pointer", transition: "all 0.3s" }}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => {
                      handleDownloadRange(currentBrushRange[0], currentBrushRange[1]);
                      setContextMenu({ ...contextMenu, visible: false });
                    }}
                  >
                    下载选中区域数据
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Annotation Modal */}
        <Modal
          title={editingAnnotation ? "编辑标注" : "添加标注"}
          open={annotationModalVisible}
          onCancel={() => setAnnotationModalVisible(false)}
          onOk={() => annotationForm.submit()}
          okText={editingAnnotation ? "保存" : "创建"}
          cancelText="取消"
        >
          <Form form={annotationForm} onFinish={handleSaveAnnotation} layout="vertical">
            <Form.Item
              name="content"
              label="标注内容"
              rules={[{ required: true, message: "请输入标注内容" }]}
            >
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
      </Content>
    </Layout>
  );
};

export default App;
