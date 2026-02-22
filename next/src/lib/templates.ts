export interface TemplateTask {
  title: string;
  forChildren: string[];
}

export interface TaskTemplate {
  id: string;
  name: string;
  emoji: string;
  tasks: TemplateTask[];
}

export const BUILT_IN_TEMPLATES: TaskTemplate[] = [
  {
    id: "teeth",
    name: "양치 3종",
    emoji: "🪥",
    tasks: [
      { title: "🪥 아침 양치하기", forChildren: ["sihyun", "misong"] },
      { title: "🪥 점심 양치하기", forChildren: ["sihyun", "misong"] },
      { title: "🪥 저녁 양치하기", forChildren: ["sihyun", "misong"] },
    ],
  },
  {
    id: "study",
    name: "공부 세트",
    emoji: "📚",
    tasks: [
      { title: "국어", forChildren: ["sihyun", "misong"] },
      { title: "수학", forChildren: ["sihyun", "misong"] },
      { title: "영어", forChildren: ["sihyun", "misong"] },
    ],
  },
  {
    id: "weekday",
    name: "평일 기본",
    emoji: "🏠",
    tasks: [
      { title: "🪥 아침 양치하기", forChildren: ["sihyun", "misong"] },
      { title: "🪥 점심 양치하기", forChildren: ["sihyun", "misong"] },
      { title: "🪥 저녁 양치하기", forChildren: ["sihyun", "misong"] },
      { title: "국어", forChildren: ["sihyun", "misong"] },
      { title: "수학", forChildren: ["sihyun", "misong"] },
      { title: "영어", forChildren: ["sihyun", "misong"] },
      { title: "이챕터스 영어 단어 외우기", forChildren: ["sihyun", "misong"] },
    ],
  },
];
