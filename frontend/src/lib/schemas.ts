export function validateTemplateName(name: string): string | null {
  if (!name || !name.trim()) return "Template name is required";
  if (name.length > 100) return "Max 100 characters";
  return null;
}
export function validateApiKey(key: string): string | null {
  if (!key || key.includes("...")) return null;
  if (key.length < 10) return "API key must be at least 10 characters";
  return null;
}
