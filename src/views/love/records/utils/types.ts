interface LocationItem {
  name: string;
  latitude: number;
  longitude: number;
}

interface FormItemProps {
  id?: string | number;
  recordDate: string;
  text: string;
  mood: string;
  location: LocationItem;
  media: string[];
}

interface FormProps {
  formInline: FormItemProps;
}

export type { LocationItem, FormItemProps, FormProps };
