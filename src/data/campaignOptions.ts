export type CampaignDifficulty = "very-easy" | "easy" | "normal" | "hard" | "very-hard";
export type CampaignAiProfileId = "default" | "fast" | "advanced" | "openai" | "anthropic" | "google";

export const difficultyOptions: { id: CampaignDifficulty; name: string; description: string }[] = [
  { id: "very-easy", name: "Muito fácil", description: "Expansão mais tranquila e IA menos agressiva." },
  { id: "easy", name: "Fácil", description: "Uma campanha acessível para aprender." },
  { id: "normal", name: "Normal", description: "Equilíbrio entre desafio e crescimento." },
  { id: "hard", name: "Difícil", description: "A IA reage com mais eficiência e pressão." },
  { id: "very-hard", name: "Muito difícil", description: "Para campanhas exigentes e pouco espaço para erros." },
];

export const aiProfiles: { id: CampaignAiProfileId; label: string; summary: string; integrated: boolean }[] = [
  { id: "default", label: "Padrão do jogo — equilibrado", summary: "Padrão do jogo", integrated: true },
  { id: "fast", label: "Modelo rápido — menor latência", summary: "Modelo rápido", integrated: false },
  { id: "advanced", label: "Modelo avançado — maior capacidade", summary: "Modelo avançado", integrated: false },
  { id: "openai", label: "OpenAI — integração futura", summary: "OpenAI (não conectado)", integrated: false },
  { id: "anthropic", label: "Anthropic Claude — integração futura", summary: "Claude (não conectado)", integrated: false },
  { id: "google", label: "Google Gemini — integração futura", summary: "Gemini (não conectado)", integrated: false },
];
