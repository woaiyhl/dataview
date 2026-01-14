import axios from "axios";

// 创建 axios 实例
const request = axios.create({
  baseURL: "", // 使用当前域名，因为配置了 proxy 或 nginx 转发
  timeout: 30000, // 请求超时时间
});

const getMessageApi = () => {
  if (typeof window === "undefined") return undefined;
  return window.__DATAVIEW_MESSAGE__;
};

const isCanceled = (error) => {
  return (
    axios.isCancel(error) ||
    error?.code === "ERR_CANCELED" ||
    error?.name === "CanceledError" ||
    error?.message === "canceled"
  );
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableStatus = (status) => {
  return (
    status === 408 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
};

const getRetryDelay = (attempt, baseDelayMs) => {
  const maxDelay = 2000;
  const delay = Math.min(maxDelay, baseDelayMs * Math.pow(2, attempt));
  const jitter = Math.floor(Math.random() * 100);
  return delay + jitter;
};

const tryParseFilename = (contentDisposition) => {
  if (typeof contentDisposition !== "string" || !contentDisposition) return undefined;

  const utf8Match = contentDisposition.match(/filename\*=(?:UTF-8''|utf-8'')([^;]+)/);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim().replace(/^"|"$/g, ""));
    } catch {
      return utf8Match[1].trim().replace(/^"|"$/g, "");
    }
  }

  const asciiMatch = contentDisposition.match(/filename=([^;]+)/);
  if (asciiMatch?.[1]) {
    return asciiMatch[1].trim().replace(/^"|"$/g, "");
  }

  return undefined;
};

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    const isFormData = typeof FormData !== "undefined" && config?.data instanceof FormData;

    if (isFormData && config?.headers) {
      delete config.headers["Content-Type"];
      delete config.headers["content-type"];
    }

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
    if (isCanceled(error)) {
      return Promise.reject(error);
    }

    const { response } = error;
    const reqUrl = error?.config?.url || "";
    const isAuthRequest = reqUrl.includes("/api/auth/");
    const messageApi = getMessageApi();

    if (response) {
      // 根据状态码做不同的错误处理
      switch (response.status) {
        case 401:
          if (!isAuthRequest) {
            messageApi?.error?.("登录已过期，请重新登录");
            localStorage.removeItem("user");
            if (window.location.pathname !== "/login") {
              window.location.href = "/login";
            }
          }
          break;
        case 403:
          messageApi?.error?.("没有权限访问该资源");
          break;
        case 404:
          messageApi?.error?.("请求的资源不存在");
          break;
        case 500:
          messageApi?.error?.("服务器内部错误，请稍后重试");
          break;
        default:
          messageApi?.error?.(response.data?.message || response.data?.error || "请求发生错误");
      }
    } else if (error.message.includes("timeout")) {
      messageApi?.error?.("请求超时，请检查网络");
    } else {
      messageApi?.error?.("网络连接异常，请检查网络");
    }

    return Promise.reject(error);
  },
);

request.isCanceled = isCanceled;

request.getData = async (url, config) => {
  const res = await request.get(url, config);
  return res?.data;
};

request.postData = async (url, data, config) => {
  const res = await request.post(url, data, config);
  return res?.data;
};

request.putData = async (url, data, config) => {
  const res = await request.put(url, data, config);
  return res?.data;
};

request.deleteData = async (url, config) => {
  const res = await request.delete(url, config);
  return res?.data;
};

request.withRetry = async (config, options) => {
  const retries = Math.max(0, Number(options?.retries ?? 2));
  const baseDelayMs = Math.max(0, Number(options?.baseDelayMs ?? 250));
  const methods = Array.isArray(options?.methods) ? options.methods : ["GET", "HEAD", "OPTIONS"];
  const method = String(config?.method || "GET").toUpperCase();
  const shouldRetryMethod = methods.includes(method);

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await request({ ...config, method });
    } catch (err) {
      lastError = err;
      if (!shouldRetryMethod) break;
      if (isCanceled(err)) break;

      const status = err?.response?.status;
      const retryable = status ? isRetryableStatus(status) : true;
      if (!retryable) break;
      if (attempt >= retries) break;

      const delay = getRetryDelay(attempt, baseDelayMs);
      await sleep(delay);
    }
  }
  throw lastError;
};

request.getDataWithRetry = async (url, config, options) => {
  const res = await request.withRetry({ ...config, url, method: "GET" }, options);
  return res?.data;
};

request.download = async (url, options) => {
  const params = options?.params;
  const filename = options?.filename;
  const signal = options?.signal;

  const res = await request.get(url, {
    params,
    signal,
    responseType: "blob",
  });

  const blob = res?.data;
  const headerName = res?.headers?.["content-disposition"] || res?.headers?.["Content-Disposition"];
  const resolvedName = filename || tryParseFilename(headerName) || "download";

  const href = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = resolvedName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(href);

  return res;
};

export default request;
