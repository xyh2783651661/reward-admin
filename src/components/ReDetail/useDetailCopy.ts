import { useCopyToClipboard } from "@pureadmin/utils";
import { message } from "@/utils/message";

/** 详情页统一复制行为：空值提示、成功/失败反馈 */
export function useDetailCopy() {
  const { copied, update } = useCopyToClipboard();

  async function copyText(value: unknown, label = "内容") {
    const text = value == null ? "" : String(value);
    if (!text.trim()) {
      message(`${label}暂无可复制内容`, { type: "warning" });
      return;
    }

    try {
      await update(text);
      if (copied.value) {
        message(`${label}已复制`, { type: "success" });
        return;
      }
    } catch {
      // 落到下方统一的失败提示
    }

    message(`${label}复制失败`, { type: "error" });
  }

  return { copyText };
}
