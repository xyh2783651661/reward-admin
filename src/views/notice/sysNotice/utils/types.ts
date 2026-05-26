interface FormItemProps {
  id?: string | number;
  title: string;
  content: string;
  noticeType: number | string; // 1=功能更新, 2=系统公告
  priority: number | string; // 4=信息, 5=普通, 7=警告, 9=紧急
  platformMask: number | string | Array<number>; // 1=Web, 2=Android, 4=iOS (can be combined)
  minVersion: string;
  publishTime: string;
  offlineTime: string;
  operator: string;
  status: number | string; // 0=草稿, 1=已发布, 2=已撤回
}

interface FormProps {
  formInline: FormItemProps;
}

export type { FormItemProps, FormProps };
