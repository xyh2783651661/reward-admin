interface LocationItem {
  name: string;
  latitude: number;
  longitude: number;
}

interface FormItemProps {
  id?: string | number;
  date: string;
  text: string;
  mood: string;
  location: LocationItem;
  mediaIds: string[];
}

interface FormProps {
  formInline: FormItemProps;
}

export type { LocationItem, FormItemProps, FormProps };
