import { createVNode, render } from "vue";
import ElImageViewer from "element-plus/es/components/image-viewer/src/image-viewer2.mjs";

export interface ImageViewerOptions {
  /** 图片URL列表 */
  urlList: string[];
  /** 初始索引 */
  initialIndex?: number;
  /** 是否无限循环 */
  infinite?: boolean;
  /** 是否挂载到body */
  teleported?: boolean;
  /** 关闭回调 */
  onClose?: () => void;
  /** 切换回调 */
  onSwitch?: (index: number) => void;
}

let container: HTMLElement | null = null;

/**
 * 命令式打开图片预览
 * @param options 预览配置
 * @returns 关闭函数
 */
export function openImageViewer(options: ImageViewerOptions): () => void {
  const {
    urlList,
    initialIndex = 0,
    infinite = true,
    teleported = true,
    onClose,
    onSwitch
  } = options;

  // 清理之前的容器
  closeImageViewer();

  // 创建容器
  container = document.createElement("div");
  container.className = "re-image-viewer-container";

  if (teleported) {
    document.body.appendChild(container);
  }

  // 关闭处理
  function handleClose() {
    closeImageViewer();
    onClose?.();
  }

  // 切换处理
  function handleSwitch(index: number) {
    onSwitch?.(index);
  }

  // 创建VNode
  const vnode = createVNode(ElImageViewer, {
    urlList,
    initialIndex,
    infinite,
    teleported,
    onClose: handleClose,
    onSwitch: handleSwitch
  });

  // 渲染
  render(vnode, container);

  return closeImageViewer;
}

/**
 * 关闭图片预览
 */
export function closeImageViewer() {
  if (container) {
    render(null, container);
    container.remove();
    container = null;
  }
}
