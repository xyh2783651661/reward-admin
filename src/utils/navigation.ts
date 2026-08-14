import type { Router } from "vue-router";

export function isExternalUrl(target?: string) {
  return Boolean(target && /^(https?:|mailto:|tel:)/i.test(target.trim()));
}

export function navigateTo(router: Router, target?: string) {
  if (!target) return;
  if (isExternalUrl(target)) {
    window.open(target, "_blank", "noopener,noreferrer");
    return;
  }
  void router.push(target);
}
