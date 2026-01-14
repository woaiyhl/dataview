import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import { Spin, App as AntdApp, ConfigProvider } from "antd";
import { themeConfig } from "./theme";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#F9F8F4]">
        <Spin size="large" tip="正在加载用户信息..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const App = () => {
  return (
    <ConfigProvider theme={themeConfig}>
      <AntdApp>
        <MessageBridge />
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </AuthProvider>
      </AntdApp>
    </ConfigProvider>
  );
};

const MessageBridge = () => {
  const { message } = AntdApp.useApp();

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.__DATAVIEW_MESSAGE__ = message;
    return () => {
      if (window.__DATAVIEW_MESSAGE__ === message) {
        delete window.__DATAVIEW_MESSAGE__;
      }
    };
  }, [message]);

  return null;
};

export default App;
