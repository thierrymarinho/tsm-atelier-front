export type SectionState = 'error' | 'done' | 'empty';

export interface FormSectionSpec {
  id: string;
  number: number;
  title: string;
  hint: string;
}
