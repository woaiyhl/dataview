import React from "react";
import { Card, Row, Col, Skeleton } from "antd";
import ChartAreaSkeleton from "./ChartAreaSkeleton";

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

export default FullPageSkeleton;
