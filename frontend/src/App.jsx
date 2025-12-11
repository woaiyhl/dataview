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
  Table,
  Space,
  Popover,
  InputNumber,
  Skeleton,
} from "antd";
import "./styles/index.css";
import {
  UploadOutlined,
  DeleteOutlined,
  FullscreenOutlined,
  CompressOutlined,
  PictureOutlined,
  EyeOutlined,
  ReloadOutlined,
  TableOutlined,
  EditOutlined,
} from "@ant-design/icons";
import ReactECharts from "echarts-for-react";
import axios from "axios";
import dayjs from "dayjs";
import HeaderBar from "./components/HeaderBar";
import ChartPanel from "./components/ChartPanel";
import AnnotationTable from "./components/AnnotationTable";
import AnnotationModal from "./components/AnnotationModal";
import ContextMenu from "./components/ContextMenu";

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
  const [isInitLoading, setIsInitLoading] = useState(true);
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

  const [browseMode, setBrowseMode] = useState(false);
  const [annotateMode, setAnnotateMode] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [yMin, setYMin] = useState(null);
  const [yMax, setYMax] = useState(null);

  const chartRef = useRef(null);
  const tableRef = useRef(null);
  const dragStartRef = useRef(null);
  const draggingRef = useRef(false);
  const [selectionRanges, setSelectionRanges] = useState([]);

  useEffect(() => {
    const inst = chartRef.current?.getEchartsInstance();
    if (!inst) return;
    const zr = inst.getZr();
    const onDown = (e) => {
      if (!annotateMode) return;
      const p = [e.offsetX, e.offsetY];
      if (!inst.containPixel("grid", p)) return;
      const t = inst.convertFromPixel({ seriesIndex: 0 }, p)[0];
      dragStartRef.current = t;
      draggingRef.current = true;
    };
    const onMove = (e) => {
      if (!annotateMode) return;
      if (annotateMode) {
        zr.setCursorStyle("crosshair");
      }
      if (!draggingRef.current || !dragStartRef.current) return;
      const p = [e.offsetX, e.offsetY];
      if (!inst.containPixel("grid", p)) return;
      const t2 = inst.convertFromPixel({ seriesIndex: 0 }, p)[0];
      const t1 = dragStartRef.current;
      const start = new Date(Math.min(t1, t2)).toISOString();
      const end = new Date(Math.max(t1, t2)).toISOString();
      setCurrentBrushRange([start, end]);
    };
    const onUp = (e) => {
      if (!annotateMode) return;
      const p = [e.offsetX, e.offsetY];
      if (!inst.containPixel("grid", p)) return;
      const t2 = inst.convertFromPixel({ seriesIndex: 0 }, p)[0];
      const t1 = dragStartRef.current;
      dragStartRef.current = null;
      draggingRef.current = false;
      if (!t1 || !t2) return;
      const start = new Date(Math.min(t1, t2)).toISOString();
      const end = new Date(Math.max(t1, t2)).toISOString();
      setCurrentBrushRange([start, end]);
      setSelectionRanges((prev) => [...prev, { start_time: start, end_time: end }]);
      setEditingAnnotation(null);
      annotationForm.resetFields();
    };
    if (annotateMode) {
      zr.setCursorStyle("crosshair");
      zr.on("mousedown", onDown);
      zr.on("mousemove", onMove);
      zr.on("mouseup", onUp);
    } else {
      zr.setCursorStyle("default");
      zr.off("mousedown");
      zr.off("mousemove");
      zr.off("mouseup");
    }
    return () => {
      zr.off("mousedown");
      zr.off("mousemove");
      zr.off("mouseup");
    };
  }, [annotateMode, chartData]); // Add chartData dependency to re-apply cursor style on data update

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
    } finally {
      setIsInitLoading(false);
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
      console.error("Save annotation failed:", error);
      const errorMsg = error.response?.data?.message || error.message || "保存标注失败";
      message.error(`保存标注失败: ${errorMsg}`);
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

  const handleSaveImage = () => {
    const inst = chartRef.current?.getEchartsInstance();
    if (!inst) return;
    const url = inst.getDataURL({ type: "png", pixelRatio: 2, backgroundColor: "#fff" });
    const a = document.createElement("a");
    a.href = url;
    a.download = `chart_${Date.now()}.png`;
    a.click();
  };

  const handleToggleFullscreen = () => {
    setFullscreen(!fullscreen);
  };

  const handleResetYAxis = () => {
    const inst = chartRef.current?.getEchartsInstance();
    if (!inst) return;
    inst.dispatchAction({ type: "dataZoom", start: 0, end: 100 });
    setYMin(null);
    setYMax(null);
    inst.setOption(getOption(), true);
  };

  const scrollToTable = () => {
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const zoomToRange = (start, end) => {
    const inst = chartRef.current?.getEchartsInstance();
    if (!inst) return;
    inst.dispatchAction({ type: "dataZoom", startValue: start, endValue: end });
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
        itemStyle: { color: ann.color || themeColor, opacity: 0.3 },
        label: { show: true, formatter: `${ann.content} (${ann.status})`, color: "#333" },
      },
      {
        xAxis: ann.end_time,
      },
    ]);

    const selectionArea = selectionRanges.map((r) => [
      {
        xAxis: r.start_time,
        name: "选区",
        itemStyle: { color: themeColor, opacity: 0.45 },
        label: { show: false },
      },
      { xAxis: r.end_time },
    ]);

    const yAxisObj = {
      type: "value",
      scale: true,
      min: (value) => {
        if (yMin !== null) return yMin;
        // 智能处理微小负值：如果最小值很小（绝对值 < 范围的 5%）且是负数，
        // 强制使用 dataMin，避免 ECharts 为了整齐刻度扩展出巨大的负空间（如 -20）
        const range = value.max - value.min;
        if (range > 0 && value.min < 0 && Math.abs(value.min) / range < 0.05) {
          return value.min;
        }
        return null; // 默认行为
      },
    };
    if (yMax !== null) yAxisObj.max = yMax;

    return {
      tooltip: {
        trigger: "axis",
        enterable: false,
        extraCssText: "pointer-events: none;",
      },
      // 移除 ECharts 顶部右侧工具栏（框内按钮）
      grid: {
        top: 30,
        left: 50,
        right: 20,
        bottom: 80,
      },
      xAxis: {
        type: "time",
        boundaryGap: false,
      },
      yAxis: yAxisObj,
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
          data: [...selectionArea, ...flatMarkAreaData],
          label: { position: "insideTopLeft" },
        },
      })),
    };
  };

  const onChartEvents = {
    brushEnd: (params) => {
      if (annotateMode) return;
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
      // 1. Safe Event Handling
      const nativeEvent = params.event?.event;
      if (nativeEvent) {
        nativeEvent.preventDefault();
      }
      if (params.event) {
        params.event.stop();
      }

      if (!nativeEvent) return;

      let targetAnnotation = null;

      // 2. Direct component check (点击到 markArea 本身)
      if (params.componentType === "markArea") {
        targetAnnotation = annotations.find((a) => a.content === params.name);
      }

      // 3. Fallback: Coordinate check
      if (!targetAnnotation) {
        const chartInstance = chartRef.current?.getEchartsInstance();
        if (chartInstance) {
          const point = [nativeEvent.offsetX, nativeEvent.offsetY];

          if (chartInstance.containPixel("grid", point)) {
            const pointInGrid = chartInstance.convertFromPixel({ seriesIndex: 0 }, point);
            if (pointInGrid) {
              const dateVal = pointInGrid[0];
              const time = new Date(dateVal).getTime();

              targetAnnotation = annotations.find((ann) => {
                const start = new Date(ann.start_time).getTime();
                const end = new Date(ann.end_time).getTime();
                return time >= start && time <= end;
              });
            }
          }
        }
      }

      setContextMenu({
        visible: true,
        x: nativeEvent.clientX,
        y: nativeEvent.clientY,
        annotation: targetAnnotation || null,
      });
    },
  };

  const handleMouseEnter = (e) => {
    e.target.style.background = hexToRgba(themeColor, 0.12);
  };
  const handleMouseLeave = (e) => {
    e.target.style.background = "white";
  };

  const ChartAreaSkeleton = () => (
    <div
      style={{
        height: 450,
        background: "#fafafa",
        borderRadius: 8,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        border: "1px dashed #e0e0e0",
        marginBottom: 20,
      }}
    >
      <Spin size="large" />
      <div style={{ marginTop: 24, textAlign: "center", color: "#666" }}>
        <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>
          {currentDataset?.status === "processing" ? "正在处理数据..." : "正在加载图表资源..."}
        </div>
        {currentDataset?.status === "processing" && (
          <div style={{ fontSize: 13, color: "#999" }}>
            大文件可能需要几分钟进行预处理和降采样，请耐心等待
          </div>
        )}
      </div>
    </div>
  );

  const FullPageSkeleton = () => (
    <Card style={{ borderRadius: 8, minHeight: 600 }}>
      {/* 模拟头部日期选择栏 */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={12}>
          <Skeleton.Input active size="large" block style={{ borderRadius: 6 }} />
        </Col>
        <Col span={12} style={{ textAlign: "right" }}>
          <Skeleton.Input active size="small" style={{ width: 100, borderRadius: 6 }} />
        </Col>
      </Row>

      <ChartAreaSkeleton />

      {/* 模拟底部表格 */}
      <Skeleton active paragraph={{ rows: 3 }} />
    </Card>
  );

  return (
    <Layout style={{ minHeight: "100vh", background: "#f0f2f5" }}>
      <HeaderBar
        themeColor={themeColor}
        setThemeColor={setThemeColor}
        datasets={datasets}
        currentDatasetId={currentDatasetId}
        setCurrentDatasetId={setCurrentDatasetId}
        handleDeleteDataset={handleDeleteDataset}
        handleUpload={handleUpload}
        uploading={uploading}
        uploadProgress={uploadProgress}
      />
      <Content style={{ padding: "20px" }}>
        {isInitLoading ? (
          <FullPageSkeleton />
        ) : currentDatasetId ? (
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

            {currentDataset && currentDataset.status === "failed" ? (
              <Empty
                description={<span style={{ color: "red" }}>数据处理失败，请检查文件格式。</span>}
              />
            ) : loading ||
              (currentDataset &&
                (currentDataset.status === "pending" || currentDataset.status === "processing")) ? (
              <ChartAreaSkeleton />
            ) : (
              <ChartPanel
                option={getOption()}
                chartRef={chartRef}
                onChartEvents={onChartEvents}
                stats={stats}
                selectedMetric={selectedMetric}
                setSelectedMetric={setSelectedMetric}
                annotateMode={annotateMode}
                setAnnotateMode={setAnnotateMode}
                fullscreen={fullscreen}
                setFullscreen={setFullscreen}
                handleSaveImage={handleSaveImage}
                handleToggleFullscreen={handleToggleFullscreen}
                yMin={yMin}
                yMax={yMax}
                setYMin={setYMin}
                setYMax={setYMax}
                handleResetYAxis={handleResetYAxis}
                scrollToTable={scrollToTable}
                themeColor={themeColor}
              />
            )}

            <AnnotationTable
              annotations={annotations}
              selections={selectionRanges}
              zoomToRange={zoomToRange}
              setEditingAnnotation={setEditingAnnotation}
              annotationForm={annotationForm}
              setAnnotationModalVisible={setAnnotationModalVisible}
              handleDeleteAnnotation={handleDeleteAnnotation}
              tableRef={tableRef}
              onCreateFromSelection={(sel) => {
                setCurrentBrushRange([sel.start_time, sel.end_time]);
                setAnnotationModalVisible(true);
              }}
              onRemoveSelection={(sel) => {
                setSelectionRanges((prev) =>
                  prev.filter(
                    (s) => !(s.start_time === sel.start_time && s.end_time === sel.end_time),
                  ),
                );
              }}
            />

            <Row gutter={16} style={{ marginBottom: "20px", marginTop: "20px" }}>
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
          </>
        ) : (
          <div
            style={{
              marginTop: "40px",
              padding: "80px 20px",
              textAlign: "center",
              background: "#fff",
              borderRadius: 16,
              boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
              border: "1px solid #f0f0f0",
            }}
          >
            <Empty
              image="https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg"
              imageStyle={{ height: 160, marginBottom: 20 }}
              description={
                <div style={{ color: "#666" }}>
                  <h2
                    style={{
                      fontSize: 20,
                      fontWeight: 600,
                      color: "#333",
                      marginBottom: 12,
                    }}
                  >
                    暂无数据可视化
                  </h2>
                  <p style={{ fontSize: 14, color: "#999", maxWidth: 400, margin: "0 auto 24px" }}>
                    请从顶部工具栏选择已有的数据集，或上传新的 CSV 文件以开始分析。
                    支持时间序列数据的自动解析与交互式图表展示。
                  </p>
                </div>
              }
            >
              <Space size="middle">
                <Button
                  type="primary"
                  size="large"
                  icon={<UploadOutlined />}
                  onClick={() => document.querySelector(".ant-upload input").click()}
                  style={{
                    height: 48,
                    padding: "0 32px",
                    borderRadius: 24,
                    fontSize: 16,
                    boxShadow: "0 4px 10px rgba(24, 144, 255, 0.3)",
                  }}
                >
                  上传 CSV 数据
                </Button>
                {datasets.length > 0 && (
                  <Button
                    size="large"
                    onClick={() => setCurrentDatasetId(datasets[0].id)}
                    style={{
                      height: 48,
                      padding: "0 32px",
                      borderRadius: 24,
                      fontSize: 16,
                    }}
                  >
                    查看最新数据
                  </Button>
                )}
              </Space>
            </Empty>
          </div>
        )}

        <ContextMenu
          contextMenu={{ ...contextMenu, currentBrushRange: currentBrushRange }}
          handleDownloadRange={handleDownloadRange}
          setContextMenu={setContextMenu}
          handleDeleteAnnotation={handleDeleteAnnotation}
          handleMouseEnter={handleMouseEnter}
          handleMouseLeave={handleMouseLeave}
          setEditingAnnotation={setEditingAnnotation}
          annotationForm={annotationForm}
          setAnnotationModalVisible={setAnnotationModalVisible}
        />

        <AnnotationModal
          editingAnnotation={editingAnnotation}
          visible={annotationModalVisible}
          setVisible={setAnnotationModalVisible}
          annotationForm={annotationForm}
          handleSaveAnnotation={handleSaveAnnotation}
        />
      </Content>
    </Layout>
  );
};

export default App;
const hexToRgba = (hex, alpha = 1) => {
  const h = hex.replace("#", "");
  const bigint = parseInt(
    h.length === 3
      ? h
          .split("")
          .map((x) => x + x)
          .join("")
      : h,
    16,
  );
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
