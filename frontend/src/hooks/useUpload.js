import { useState } from "react";
import request from "../utils/request";
import { message } from "antd";

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * 文件上传 Hook
 * 处理大文件分片上传逻辑
 * @param {Function} onSuccess - 上传成功回调
 * @param {Function} onError - 上传失败回调
 */
export const useUpload = (onSuccess, onError) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const generateUploadId = (file) => {
    return `${file.name}-${file.size}-${file.lastModified}`;
  };

  const handleUpload = async ({ file }) => {
    setUploading(true);
    setUploadProgress(0);

    const uploadId = generateUploadId(file);
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    // Concurrency limit
    const MAX_CONCURRENCY = 6;

    try {
      // 1. Check uploaded chunks
      const checkRes = await request.get("/api/upload/check", {
        params: { uploadId },
      });
      const uploadedChunks = new Set(checkRes.data.uploadedChunks);

      // Update initial progress
      if (uploadedChunks.size > 0) {
        setUploadProgress(Math.round((uploadedChunks.size / totalChunks) * 100));
      }

      // Identify missing chunks
      const chunksToUpload = [];
      for (let i = 0; i < totalChunks; i++) {
        if (!uploadedChunks.has(i)) {
          chunksToUpload.push(i);
        }
      }

      // Function to upload a single chunk
      const uploadChunk = async (chunkIndex) => {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append("uploadId", uploadId);
        formData.append("chunkIndex", chunkIndex);
        formData.append("file", chunk);

        await request.post("/api/upload/chunk", formData, {
          timeout: 60000, // 60s timeout for each chunk
        });

        // Update progress
        uploadedChunks.add(chunkIndex);
        setUploadProgress(Math.round((uploadedChunks.size / totalChunks) * 100));
      };

      // Process chunks with concurrency limit
      for (let i = 0; i < chunksToUpload.length; i += MAX_CONCURRENCY) {
        const batch = chunksToUpload.slice(i, i + MAX_CONCURRENCY);
        await Promise.all(batch.map((index) => uploadChunk(index)));
      }

      // 3. Merge chunks
      const mergeData = await request.postData("/api/upload/merge", {
        uploadId,
        filename: file.name,
      });

      message.success("上传成功，后台处理中...");
      setUploading(false);
      if (onSuccess) onSuccess(mergeData);
    } catch (error) {
      console.error(error);
      message.error("上传失败");
      setUploading(false);
      if (onError) onError(error);
    }
  };

  return { uploading, uploadProgress, handleUpload };
};
