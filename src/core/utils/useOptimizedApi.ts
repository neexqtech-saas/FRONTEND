/**
 * Optimized API Hook with Request Cancellation, Caching, and Deduplication
 * Prevents duplicate API calls and cancels in-flight requests
 */
import React, { useRef, useCallback, useEffect, useState } from 'react';
import axios, { AxiosRequestConfig, CancelTokenSource } from 'axios';

interface CacheEntry {
  data: any;
  timestamp: number;
  expiresIn: number; // milliseconds
}

interface RequestCache {
  [key: string]: CacheEntry;
}

// Global request cache (shared across components)
const requestCache: RequestCache = {};
const activeRequests: Map<string, CancelTokenSource> = new Map();

// Default cache TTL: 30 seconds
const DEFAULT_CACHE_TTL = 30 * 1000;

/**
 * Generate cache key from URL and params
 */
const generateCacheKey = (url: string, params?: any): string => {
  const paramsStr = params ? JSON.stringify(params) : '';
  return `${url}${paramsStr}`;
};

/**
 * Check if cache entry is still valid
 */
const isCacheValid = (entry: CacheEntry): boolean => {
  return Date.now() - entry.timestamp < entry.expiresIn;
};

/**
 * Clear expired cache entries
 */
const clearExpiredCache = () => {
  const now = Date.now();
  Object.keys(requestCache).forEach(key => {
    if (now - requestCache[key].timestamp >= requestCache[key].expiresIn) {
      delete requestCache[key];
    }
  });
};

/**
 * Optimized API Hook
 * Features:
 * - Request cancellation (cancels previous request if new one is made)
 * - Request deduplication (prevents duplicate simultaneous requests)
 * - Response caching (caches responses for specified TTL)
 * - Automatic cleanup on unmount
 */
export const useOptimizedApi = () => {
  const cancelTokensRef = useRef<Map<string, CancelTokenSource>>(new Map());

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cancel all active requests for this component
      cancelTokensRef.current.forEach(source => {
        source.cancel('Component unmounted');
      });
      cancelTokensRef.current.clear();
    };
  }, []);

  /**
   * Optimized GET request
   */
  const get = useCallback(async (
    url: string,
    config?: AxiosRequestConfig & {
      cache?: boolean;
      cacheTTL?: number;
      skipDeduplication?: boolean;
    }
  ): Promise<any> => {
    const {
      cache = true,
      cacheTTL = DEFAULT_CACHE_TTL,
      skipDeduplication = false,
      ...axiosConfig
    } = config || {};

    const cacheKey = generateCacheKey(url, axiosConfig.params);

    // Check cache first
    if (cache && requestCache[cacheKey] && isCacheValid(requestCache[cacheKey])) {
      return Promise.resolve(requestCache[cacheKey].data);
    }

    // Check if same request is already in progress (deduplication)
    if (!skipDeduplication && activeRequests.has(cacheKey)) {
      // Wait for existing request to complete
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          if (requestCache[cacheKey] && isCacheValid(requestCache[cacheKey])) {
            clearInterval(checkInterval);
            resolve(requestCache[cacheKey].data);
          } else if (!activeRequests.has(cacheKey)) {
            clearInterval(checkInterval);
            // Request completed but not cached, retry
            get(url, config).then(resolve).catch(reject);
          }
        }, 50);
      });
    }

    // Cancel previous request for same URL if exists
    const existingSource = cancelTokensRef.current.get(cacheKey);
    if (existingSource) {
      existingSource.cancel('New request initiated');
    }

    // Create new cancel token
    const source = axios.CancelToken.source();
    cancelTokensRef.current.set(cacheKey, source);
    activeRequests.set(cacheKey, source);

    try {
      const response = await axios.get(url, {
        ...axiosConfig,
        cancelToken: source.token,
      });

      // Cache the response
      if (cache) {
        requestCache[cacheKey] = {
          data: response.data,
          timestamp: Date.now(),
          expiresIn: cacheTTL,
        };
        // Clean expired cache periodically
        clearExpiredCache();
      }

      return response.data;
    } catch (error: any) {
      if (axios.isCancel(error)) {
        console.log('Request cancelled:', error.message);
        throw new Error('Request cancelled');
      }
      throw error;
    } finally {
      // Cleanup
      cancelTokensRef.current.delete(cacheKey);
      activeRequests.delete(cacheKey);
    }
  }, []);

  /**
   * Optimized POST request (no caching, but with cancellation)
   */
  const post = useCallback(async (
    url: string,
    data?: any,
    config?: AxiosRequestConfig & { skipDeduplication?: boolean }
  ): Promise<any> => {
    const { skipDeduplication = false, ...axiosConfig } = config || {};
    const cacheKey = generateCacheKey(url, { method: 'POST', data });

    // Check if same request is already in progress
    if (!skipDeduplication && activeRequests.has(cacheKey)) {
      // Wait for existing request
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          if (!activeRequests.has(cacheKey)) {
            clearInterval(checkInterval);
            post(url, data, { ...config, skipDeduplication: true })
              .then(resolve)
              .catch(reject);
          }
        }, 50);
      });
    }

    const source = axios.CancelToken.source();
    cancelTokensRef.current.set(cacheKey, source);
    activeRequests.set(cacheKey, source);

    try {
      const response = await axios.post(url, data, {
        ...axiosConfig,
        cancelToken: source.token,
      });
      return response.data;
    } catch (error: any) {
      if (axios.isCancel(error)) {
        throw new Error('Request cancelled');
      }
      throw error;
    } finally {
      cancelTokensRef.current.delete(cacheKey);
      activeRequests.delete(cacheKey);
    }
  }, []);

  /**
   * Optimized PUT request
   */
  const put = useCallback(async (
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<any> => {
    const source = axios.CancelToken.source();
    const cacheKey = generateCacheKey(url, { method: 'PUT' });
    cancelTokensRef.current.set(cacheKey, source);

    try {
      const response = await axios.put(url, data, {
        ...config,
        cancelToken: source.token,
      });
      return response.data;
    } catch (error: any) {
      if (axios.isCancel(error)) {
        throw new Error('Request cancelled');
      }
      throw error;
    } finally {
      cancelTokensRef.current.delete(cacheKey);
    }
  }, []);

  /**
   * Optimized DELETE request
   */
  const del = useCallback(async (
    url: string,
    config?: AxiosRequestConfig
  ): Promise<any> => {
    const source = axios.CancelToken.source();
    const cacheKey = generateCacheKey(url, { method: 'DELETE' });
    cancelTokensRef.current.set(cacheKey, source);

    try {
      const response = await axios.delete(url, {
        ...config,
        cancelToken: source.token,
      });
      return response.data;
    } catch (error: any) {
      if (axios.isCancel(error)) {
        throw new Error('Request cancelled');
      }
      throw error;
    } finally {
      cancelTokensRef.current.delete(cacheKey);
    }
  }, []);

  /**
   * Clear cache for specific URL or all cache
   */
  const clearCache = useCallback((url?: string) => {
    if (url) {
      Object.keys(requestCache).forEach(key => {
        if (key.startsWith(url)) {
          delete requestCache[key];
        }
      });
    } else {
      Object.keys(requestCache).forEach(key => {
        delete requestCache[key];
      });
    }
  }, []);

  return {
    get,
    post,
    put,
    delete: del,
    clearCache,
  };
};

/**
 * Debounce utility for search inputs
 */
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

