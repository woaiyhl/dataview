import axios from "axios";
import { message } from "antd";

// 创建 axios 实例
const request = axios.create({
  baseURL: "", // 使用当前域名，因为配置了 proxy 或 nginx 转发
  timeout: 30000, // 请求超时时间
  headers: {
    "Content-Type": "application/json",
  },
});

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 从 localStorage 获取 token
    try {
      const userJson = localStorage.getItem("user");
      if (userJson) {
        const user = JSON.parse(userJson);
        // 假设 token 字段名为 token，如果后端返回字段不同需调整
        if (user?.token) {
          config.headers.Authorization = `Bearer ${user.token}`;
        }
      }
    } catch (error) {
      console.error("获取用户凭证失败", error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    // 如果后端统一封装了响应结构（例如 { code: 200, data: ..., message: ... }）
    // 可以在这里进行解包，或者根据 code 判断业务逻辑是否成功
    // 目前根据现有代码，直接返回 response
    return response;
  },
  (error) => {
    // 处理取消请求的情况
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

    const { response } = error;

    if (response) {
      // 根据状态码做不同的错误处理
      switch (response.status) {
        case 401:
          // 未授权，清除用户信息并跳转登录
          message.error("登录已过期，请重新登录");
          localStorage.removeItem("user");
          // 可以在这里触发重定向，或者依赖 AuthContext 的状态变化
          if (window.location.pathname !== "/login") {
            window.location.href = "/login";
          }
          break;
        case 403:
          message.error("没有权限访问该资源");
          break;
        case 404:
          message.error("请求的资源不存在");
          break;
        case 500:
          message.error("服务器内部错误，请稍后重试");
          break;
        default:
          message.error(response.data?.message || response.data?.error || "请求发生错误");
      }
    } else if (error.message.includes("timeout")) {
      message.error("请求超时，请检查网络");
    } else {
      message.error("网络连接异常，请检查网络");
    }

    return Promise.reject(error);
  },
);

export default request;
