import React from "react";
import { Card, Row, Col, DatePicker } from "antd";

const { RangePicker } = DatePicker;

const DatasetControl = ({ currentDatasetId, setDateRange }) => {
  return (
    <Card
      className="shadow-sm hover:shadow-md transition-shadow duration-300 rounded-2xl border border-gray-100"
      bordered={false}
    >
      <Row gutter={24} align="middle">
        <Col span={12}>
          <RangePicker
            showTime
            onChange={(dates) => setDateRange(dates)}
            className="w-full"
            placeholder={["开始日期", "结束日期"]}
          />
        </Col>
        <Col span={12} className="text-right">
          <span className="text-gray-400 text-sm font-mono bg-gray-50 px-2 py-1 rounded-full border border-gray-100">
            ID: {currentDatasetId}
          </span>
        </Col>
      </Row>
    </Card>
  );
};

export default DatasetControl;
