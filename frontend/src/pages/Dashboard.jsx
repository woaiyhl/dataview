import React, { useRef, useMemo, useState, useEffect } from "react";
import { Layout, ConfigProvider, Empty, Form, message } from "antd";
import zhCN from "antd/locale/zh_CN";
import request from "../utils/request";
import "../styles/index.css";
import { themeConfig } from "../theme";

// Hooks
import { useDatasets } from "../hooks/useDatasets";
import { useChartData } from "../hooks/useChartData";
import { useAnnotations } from "../hooks/useAnnotations";
import { useUpload } from "../hooks/useUpload";
import { useTheme } from "../hooks/useTheme";
import { useChartInteraction } from "../hooks/useChartInteraction";
import { useChartOption } from "../hooks/useChartOption";
import { useAuth } from "../context/AuthContext";

// Components
import HeaderBar from "../components/HeaderBar";
import ChartPanel from "../components/ChartPanel";
import AnnotationTable from "../components/AnnotationTable";
import AnnotationModal from "../components/AnnotationModal";
import ContextMenu from "../components/ContextMenu";
import FullPageSkeleton from "../components/Skeleton/FullPageSkeleton";
import ChartAreaSkeleton from "../components/Skeleton/ChartAreaSkeleton";
import EmptyState from "../components/EmptyState";
import StatsCards from "../components/StatsCards";
import DatasetControl from "../components/DatasetControl";
import { hexToRgba } from "../utils/dataUtils";

const { Content } = Layout;

const Dashboard = () => {
  // Auth
  const { user, logout } = useAuth();

  // 1. Theme
  const { themeColor, setThemeColor } = useTheme();

  // 2. Datasets & Upload
  const {
    datasets,
    currentDatasetId,
    setCurrentDatasetId,
    isInitLoading,
    currentDataset,
    fetchDatasets,
    handleDeleteDataset,
  } = useDatasets();

  const { uploading, uploadProgress, handleUpload } = useUpload(
    (newDataset) => {
      fetchDatasets();
      setCurrentDatasetId(newDataset.id);
    },
    () => {}, // Error handled in hook
  );

  const currentDatasetStatus = currentDataset?.status;

  // 3. Chart Data
  const { chartData, stats, loading, dateRange, setDateRange, selectedMetric, setSelectedMetric } =
    useChartData(currentDatasetId, currentDatasetStatus);

  // 4. Annotations
  const {
    annotations,
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
  } = useAnnotations(currentDatasetId);

  // 5. Interaction & UI State
  const chartRef = useRef(null);
  const tableRef = useRef(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [yMin, setYMin] = useState(null);
  const [yMax, setYMax] = useState(null);
  const [chartType, setChartType] = useState("line");
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    annotation: null,
  });

  const [annotationForm] = Form.useForm();

  const { annotateMode, setAnnotateMode } = useChartInteraction(
    chartRef,
    chartData,
    (start, end) => {
      setCurrentBrushRange([start, end]);
      setSelectionRanges((prev) => [...prev, { start_time: start, end_time: end }]);
      setEditingAnnotation(null);
      annotationForm.resetFields();
    },
  );

  // 6. Chart Options
  const chartOption = useChartOption({
    chartData,
    selectedMetric,
    chartType,
    annotations,
    themeColor,
    selectionRanges,
    yMin,
    yMax,
  });

  // Event Handlers
  const handleSaveImage = () => {
    const inst = chartRef.current?.getEchartsInstance();
    if (!inst) return;
    const url = inst.getDataURL({ type: "png", pixelRatio: 2, backgroundColor: "#fff" });
    const a = document.createElement("a");
    a.href = url;
    a.download = `chart_${Date.now()}.png`;
    a.click();
    a.remove();
  };

  const handleToggleFullscreen = () => setFullscreen(!fullscreen);

  const handleResetYAxis = () => {
    const inst = chartRef.current?.getEchartsInstance();
    if (!inst) return;
    inst.dispatchAction({ type: "dataZoom", start: 0, end: 100 });
    setYMin(null);
    setYMax(null);
  };

  const scrollToTable = () => {
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const zoomToRange = (start, end) => {
    const inst = chartRef.current?.getEchartsInstance();
    if (!inst) return;
    inst.dispatchAction({ type: "dataZoom", startValue: start, endValue: end });
  };

  const handleDownloadRange = async (start, end) => {
    try {
      const params = {
        start: start,
        end: end,
        metric: selectedMetric,
      };
      await request.download(`/api/download/${currentDatasetId}`, {
        params,
        filename: `data_${start}_${end}.csv`,
      });
    } catch (error) {
      console.error(error);
      message.error("下载数据失败");
    }
  };

  // Close context menu on click
  useEffect(() => {
    const handleClick = () => setContextMenu({ ...contextMenu, visible: false });
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [contextMenu]);

  const onChartEvents = useMemo(
    () => ({
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
        const nativeEvent = params.event?.event;
        if (nativeEvent) nativeEvent.preventDefault();
        if (params.event) params.event.stop();

        if (!nativeEvent) return;

        let targetAnnotation = null;
        if (params.componentType === "markArea") {
          targetAnnotation = annotations.find((a) => a.content === params.name);
        }

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
    }),
    [annotateMode, annotations, annotationForm],
  );

  const handleMouseEnter = (e) => {
    e.target.style.background = hexToRgba(themeColor, 0.12);
  };
  const handleMouseLeave = (e) => {
    e.target.style.background = "white";
  };

  const renderChartArea = () => {
    if (!currentDataset) return null;

    if (currentDataset.status === "failed") {
      return (
        <Empty description={<span style={{ color: "red" }}>数据处理失败，请检查文件格式。</span>} />
      );
    }

    if (currentDataset.status === "pending" || currentDataset.status === "processing") {
      return <ChartAreaSkeleton status={currentDataset.status} />;
    }

    return (
      <ChartPanel
        loading={loading}
        option={chartOption}
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
        chartType={chartType}
        setChartType={setChartType}
      />
    );
  };

  const renderContent = () => {
    if (isInitLoading) {
      return <FullPageSkeleton />;
    }

    if (!currentDatasetId) {
      return (
        <EmptyState
          datasets={datasets}
          onSelectLatest={() => datasets.length > 0 && setCurrentDatasetId(datasets[0].id)}
          onUploadClick={() => document.querySelector(".ant-upload input")?.click()}
        />
      );
    }

    return (
      <div className="space-y-6">
        <DatasetControl currentDatasetId={currentDatasetId} setDateRange={setDateRange} />

        {renderChartArea()}

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
              prev.filter((s) => !(s.start_time === sel.start_time && s.end_time === sel.end_time)),
            );
          }}
        />

        <StatsCards stats={stats} themeColor={themeColor} />
      </div>
    );
  };

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        ...themeConfig,
        token: {
          ...themeConfig.token,
          colorPrimary: themeColor,
        },
      }}
    >
      <Layout className="h-screen overflow-hidden bg-[#F9F8F4]">
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
          user={user}
          onLogout={logout}
        />
        <Content className="overflow-y-auto">
          <div className="p-6 max-w-[1440px] mx-auto w-full transition-all duration-300">
            {renderContent()}

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
          </div>
        </Content>
      </Layout>
    </ConfigProvider>
  );
};

export default Dashboard;
