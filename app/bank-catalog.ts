export type BankCardPattern = "minimal" | "rings" | "grid" | "wave" | "diagonal" | "halo";

export type BankDefinition = {
  id: string;
  name: string;
  aliases: readonly string[];
  mark: string;
  markKind: "wordmark" | "monogram" | "icon";
  primary: string;
  secondary: string;
  accent: string;
  text: "light" | "dark";
  pattern: BankCardPattern;
  currencies: readonly string[];
  description: string;
};

export const OTHER_BANK_ID = "other";

export const BANK_CATALOG: readonly BankDefinition[] = [
  {
    id: "monobank",
    name: "monobank",
    aliases: ["mono", "монобанк"],
    mark: "mono",
    markKind: "wordmark",
    primary: "#151519",
    secondary: "#34343b",
    accent: "#ffffff",
    text: "light",
    pattern: "minimal",
    currencies: ["UAH", "USD", "EUR"],
    description: "Темна мінімалістична картка",
  },
  {
    id: "privatbank",
    name: "ПриватБанк",
    aliases: ["privatbank", "приват", "privat"],
    mark: "П",
    markKind: "monogram",
    primary: "#2f8f45",
    secondary: "#74b84a",
    accent: "#dff4d5",
    text: "light",
    pattern: "wave",
    currencies: ["UAH", "USD", "EUR"],
    description: "Зелена картка з м’якою хвилею",
  },
  {
    id: "pumb",
    name: "ПУМБ",
    aliases: ["pumb", "перший український міжнародний банк"],
    mark: "ПУМБ",
    markKind: "wordmark",
    primary: "#c92f3c",
    secondary: "#7e1724",
    accent: "#ffd9dc",
    text: "light",
    pattern: "diagonal",
    currencies: ["UAH", "USD", "EUR"],
    description: "Червона контрастна картка",
  },
  {
    id: "oschadbank",
    name: "Ощадбанк",
    aliases: ["ощад", "oschad", "oschadbank"],
    mark: "О",
    markKind: "monogram",
    primary: "#15744b",
    secondary: "#26a76c",
    accent: "#b9f0d2",
    text: "light",
    pattern: "rings",
    currencies: ["UAH", "USD", "EUR"],
    description: "Зелена картка з концентричними формами",
  },
  {
    id: "raiffeisen",
    name: "Райффайзен Банк",
    aliases: ["raiffeisen", "райффайзен", "аваль", "aval"],
    mark: "R",
    markKind: "monogram",
    primary: "#f6d900",
    secondary: "#e2bd00",
    accent: "#171717",
    text: "dark",
    pattern: "grid",
    currencies: ["UAH", "USD", "EUR"],
    description: "Жовта картка з чорною графікою",
  },
  {
    id: "payoneer",
    name: "Payoneer",
    aliases: ["payoneer", "пейонір", "пайонір"],
    mark: "payoneer",
    markKind: "wordmark",
    primary: "#171717",
    secondary: "#343434",
    accent: "#ff4800",
    text: "light",
    pattern: "halo",
    currencies: ["USD", "EUR", "GBP", "CAD", "AUD", "JPY"],
    description: "Темна мультивалютна картка з помаранчевим акцентом",
  },
  {
    id: "cash",
    name: "Готівка",
    aliases: ["cash", "готівкові"],
    mark: "₴",
    markKind: "icon",
    primary: "#584bc6",
    secondary: "#8d7df0",
    accent: "#e9e3ff",
    text: "light",
    pattern: "rings",
    currencies: ["UAH", "USD", "EUR", "GBP", "PLN"],
    description: "Універсальна картка для готівки",
  },
  {
    id: OTHER_BANK_ID,
    name: "Інший банк",
    aliases: ["інший", "другой банк", "other"],
    mark: "•",
    markKind: "icon",
    primary: "#4c4f5d",
    secondary: "#737789",
    accent: "#eceef4",
    text: "light",
    pattern: "minimal",
    currencies: ["UAH", "USD", "EUR", "GBP", "PLN", "CAD", "AUD", "JPY"],
    description: "Нейтральний стиль з ручною назвою",
  },
] as const;

const normalizeBankName = (value: string) => value.trim().toLocaleLowerCase("uk-UA");

export function getBankDefinition(value: string | null | undefined): BankDefinition {
  const normalized = normalizeBankName(value || "");
  return BANK_CATALOG.find(bank =>
    normalizeBankName(bank.name) === normalized ||
    bank.aliases.some(alias => normalized.includes(normalizeBankName(alias)))
  ) || BANK_CATALOG[BANK_CATALOG.length - 1];
}

export function getBankById(id: string): BankDefinition {
  return BANK_CATALOG.find(bank => bank.id === id) || BANK_CATALOG[BANK_CATALOG.length - 1];
}
