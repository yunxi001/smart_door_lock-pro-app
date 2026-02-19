import { useState, useEffect, useRef } from "react";
import { Loader2, AlertCircle } from "lucide-react";

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
}

/**
 * 懒加载图片组件
 * 使用IntersectionObserver API实现图片懒加载
 * 支持占位符、加载动画和错误处理
 */
export default function LazyImage({
  src,
  alt,
  className = "",
}: LazyImageProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 检查IntersectionObserver是否可用
    if (typeof IntersectionObserver === "undefined") {
      // 测试环境或不支持的浏览器，直接加载图片
      setIsLoading(true);
      setImageSrc(src);
      return;
    }

    // 创建IntersectionObserver
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !imageSrc && !hasError) {
            // 进入视口，延迟200ms后开始加载
            setTimeout(() => {
              setIsLoading(true);
              setImageSrc(src);
            }, 200);
            // 停止观察
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: "50px", // 提前50px开始加载
        threshold: 0.01,
      },
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [src, imageSrc, hasError]);

  // 图片加载成功
  const handleLoad = () => {
    setIsLoading(false);
  };

  // 图片加载失败
  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  // 重试加载
  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
    setImageSrc(null);
    // 重新触发加载
    setTimeout(() => {
      setImageSrc(src);
    }, 100);
  };

  return (
    <div
      ref={imgRef}
      className={`relative bg-gray-200 overflow-hidden ${className}`}
    >
      {/* 占位符 - 未开始加载时显示 */}
      {!imageSrc && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-2 bg-gray-300 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <span className="text-sm text-gray-400">等待加载...</span>
          </div>
        </div>
      )}

      {/* 加载动画 - 加载中显示 */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <Loader2 className="w-8 h-8 mx-auto mb-2 text-blue-500 animate-spin" />
            <span className="text-sm text-gray-600">加载中...</span>
          </div>
        </div>
      )}

      {/* 实际图片 */}
      {imageSrc && !hasError && (
        <img
          src={imageSrc}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoading ? "opacity-0" : "opacity-100"
          }`}
        />
      )}

      {/* 错误占位符 - 加载失败时显示 */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center px-4">
            <AlertCircle className="w-12 h-12 mx-auto mb-2 text-red-500" />
            <p className="text-sm text-red-600 mb-3">图片加载失败</p>
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
            >
              重试
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
