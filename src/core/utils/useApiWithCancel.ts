/**
 * Simplified API hook with request cancellation
 * Prevents race conditions by canceling previous requests
 */
import { useRef, useCallback, useEffect } from 'react';
import axios, { AxiosRequestConfig, CancelTokenSource } from 'axios';
import { getAuthHeaders } from './apiHelpers';

export const useApiWithCancel = () => {
  const cancelTokenRef = useRef<CancelTokenSource | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cancelTokenRef.current) {
        cancelTokenRef.current.cancel('Component unmounted');
      }
    };
  }, []);

  const createCancelToken = useCallback(() => {
    // Cancel previous request if exists
    if (cancelTokenRef.current) {
      cancelTokenRef.current.cancel('New request initiated');
    }
    // Create new cancel token
    cancelTokenRef.current = axios.CancelToken.source();
    return cancelTokenRef.current.token;
  }, []);

  const get = useCallback(async (url: string, config?: AxiosRequestConfig) => {
    try {
      const response = await axios.get(url, {
        ...getAuthHeaders(),
        ...config,
        cancelToken: createCancelToken(),
      });
      return response.data;
    } catch (error: any) {
      if (axios.isCancel && axios.isCancel(error)) {
        // Request was cancelled, don't throw error
        return null;
      }
      throw error;
    }
  }, [createCancelToken]);

  const post = useCallback(async (url: string, data?: any, config?: AxiosRequestConfig) => {
    try {
      const response = await axios.post(url, data, {
        ...getAuthHeaders(),
        ...config,
        cancelToken: createCancelToken(),
      });
      return response.data;
    } catch (error: any) {
      if (axios.isCancel && axios.isCancel(error)) {
        return null;
      }
      throw error;
    }
  }, [createCancelToken]);

  const put = useCallback(async (url: string, data?: any, config?: AxiosRequestConfig) => {
    try {
      const response = await axios.put(url, data, {
        ...getAuthHeaders(),
        ...config,
        cancelToken: createCancelToken(),
      });
      return response.data;
    } catch (error: any) {
      if (axios.isCancel && axios.isCancel(error)) {
        return null;
      }
      throw error;
    }
  }, [createCancelToken]);

  const del = useCallback(async (url: string, config?: AxiosRequestConfig) => {
    try {
      const response = await axios.delete(url, {
        ...getAuthHeaders(),
        ...config,
        cancelToken: createCancelToken(),
      });
      return response.data;
    } catch (error: any) {
      if (axios.isCancel && axios.isCancel(error)) {
        return null;
      }
      throw error;
    }
  }, [createCancelToken]);

  return { get, post, put, delete: del };
};

