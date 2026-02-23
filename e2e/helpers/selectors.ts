/** Shared selectors — text-based, no data-testid */

export const SEL = {
  // Home
  homeTitle: "text=🍡 뭉치",
  userButton: (name: string) => `button:has-text("${name}")`,

  // PIN modal
  pinModal: ".fixed", // modal overlay
  pinError: "text=비밀번호가 틀렸어요",
  pinCancel: "text=취소",
  pinDot: "div.rounded-full",

  // Dashboard
  headerName: (name: string) => `text=${name}`,
  coinBadge: (amount: number) => `text=🍪 ${amount}`,
  todoSection: "text=할 일",
  doneSection: "text=완료",
  addButton: "text=추가",
  emptyMessage: "text=오늘 할일이 없어요",
  allDoneMessage: "text=모두 완료!",

  // Task form
  taskInput: 'input[placeholder="할일을 입력하세요"]',
  taskAddButton: 'button:has-text("추가")',
  taskCancelButton: 'button:has-text("취소")',

  // Confirm modals
  deleteConfirmTitle: "text=정말 지울까요?",
  deleteConfirmYes: 'button:has-text("지울래요")',
  deleteConfirmNo: 'button:has-text("아니요")',
  untoggleConfirmTitle: "text=아직 안 했어요?",
  untoggleConfirmYes: 'button:has-text("아직 안했어요")',
} as const;
