"use client";

import { useState, useEffect } from "react";
import {
  useSettings,
  useUpdateSetting,
  useSystemInfo,
  useValidateDeps,
  useTestAI,
  useTestOCR,
  useTestMistralOCR,
} from "@/hooks/use-settings";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Save,
  Brain,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Zap,
  ScanLine,
  Package,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { validateApiKey } from "@/lib/schemas";
import { PageHeader } from "@/components/layout/page-header";

const providerModels: Record<string, string[]> = {
  openai: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1"],
  claude: [
    "claude-sonnet-4-20250514",
    "claude-haiku-4-20250414",
    "claude-opus-4-20250514",
  ],
  gemini: ["gemini-2.0-flash", "gemini-2.5-pro", "gemini-2.5-flash"],
};

export default function SettingsPage() {
  const { data, isLoading } = useSettings();
  const updateMutation = useUpdateSetting();
  const { data: sysInfo } = useSystemInfo();
  const { data: depsValidation, isLoading: depsLoading } = useValidateDeps();
  const testAIMutation = useTestAI();
  const testOCRMutation = useTestOCR();
  const testMistralMutation = useTestMistralOCR();

  const [provider, setProvider] = useState("openai");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [tesseractPath, setTesseractPath] = useState("");
  const [popperPath, setPopperPath] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [apiKeyError, setApiKeyError] = useState("");
  const [ocrProvider, setOcrProvider] = useState("default");
  const [mistralApiKey, setMistralApiKey] = useState("");
  const [showMistralKey, setShowMistralKey] = useState(false);

  useEffect(() => {
    if (data?.settings) {
      setProvider(data.settings.ai_provider || "openai");
      setApiKey(data.settings.ai_api_key || "");
      setModel(data.settings.ai_model || "");
      setTesseractPath(data.settings.tesseract_path || "");
      setPopperPath(data.settings.poppler_path || "");
      setOcrProvider(data.settings.ocr_provider || "default");
      setMistralApiKey(data.settings.mistral_api_key || "");
    }
  }, [data]);

  const saveSetting = (key: string, value: string) => {
    updateMutation.mutate(
      { key, value },
      {
        onSuccess: () => toast.success(`${key} updated`),
        onError: () => toast.error(`Failed to update ${key}`),
      }
    );
  };

  const handleSaveAll = () => {
    saveSetting("ai_provider", provider);
    if (apiKey && !apiKey.includes("...")) saveSetting("ai_api_key", apiKey);
    saveSetting("ai_model", model);
    if (tesseractPath) saveSetting("tesseract_path", tesseractPath);
    if (popperPath) saveSetting("poppler_path", popperPath);
    saveSetting("ocr_provider", ocrProvider);
    if (mistralApiKey && !mistralApiKey.includes("...")) saveSetting("mistral_api_key", mistralApiKey);
  };

  const handleTestAI = () => {
    testAIMutation.mutate(undefined, {
      onSuccess: (result) => {
        if (result.status === "ok") {
          toast.success(result.message);
        } else {
          toast.error(result.message);
        }
      },
      onError: () => toast.error("Connection test failed"),
    });
  };

  const handleTestMistral = () => {
    testMistralMutation.mutate(undefined, {
      onSuccess: (result) => {
        if (result.status === "ok") {
          toast.success(result.message);
        } else {
          toast.error(result.message);
        }
      },
      onError: () => toast.error("Mistral OCR test failed"),
    });
  };

  const handleTestOCR = () => {
    testOCRMutation.mutate(undefined, {
      onSuccess: (result) => {
        if (result.status === "ok") {
          toast.success(result.message);
        } else {
          toast.error(result.message);
        }
      },
      onError: () => toast.error("OCR test failed"),
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader
        title="Settings"
        description="Configure AI provider and OCR settings"
      />

      {/* System Info */}
      {sysInfo && (
        <Card className="synapse-shadow border-border/50 rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Package className="h-4 w-4" />
              System Libraries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(sysInfo.libraries).map(([lib, available]) => (
                <Badge
                  key={lib}
                  variant={available ? "default" : "secondary"}
                  className={`rounded-full gap-1 ${available ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-red-100 text-red-600 hover:bg-red-100"}`}
                >
                  {available ? (
                    <CheckCircle className="h-3 w-3" />
                  ) : (
                    <XCircle className="h-3 w-3" />
                  )}
                  {lib.replace(/_/g, " ")}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dependencies Validation */}
      {depsValidation && (
        <Card className="synapse-shadow border-border/50 rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              {depsValidation.ok ? (
                <ShieldCheck className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              )}
              Dependencies Validation
            </CardTitle>
            <CardDescription>
              {depsValidation.summary}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Python Packages</p>
              <div className="flex flex-wrap gap-2">
                {depsValidation.python_packages.map((dep) => (
                  <Badge
                    key={dep.name}
                    variant={dep.installed ? "default" : "secondary"}
                    className={`rounded-full gap-1 ${
                      dep.installed
                        ? "bg-green-100 text-green-700 hover:bg-green-100"
                        : dep.required
                          ? "bg-red-100 text-red-600 hover:bg-red-100"
                          : "bg-amber-100 text-amber-700 hover:bg-amber-100"
                    }`}
                    title={`${dep.detail}${dep.version ? ` (v${dep.version})` : ""}${dep.required ? " — required" : " — optional"}`}
                  >
                    {dep.installed ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      <XCircle className="h-3 w-3" />
                    )}
                    {dep.name}
                    {dep.version && (
                      <span className="text-[10px] opacity-70">{dep.version}</span>
                    )}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">System Tools</p>
              <div className="flex flex-wrap gap-2">
                {depsValidation.system_tools.map((dep) => (
                  <Badge
                    key={dep.name}
                    variant={dep.installed ? "default" : "secondary"}
                    className={`rounded-full gap-1 ${
                      dep.installed
                        ? "bg-green-100 text-green-700 hover:bg-green-100"
                        : "bg-amber-100 text-amber-700 hover:bg-amber-100"
                    }`}
                    title={`${dep.detail}${dep.version ? ` (${dep.version})` : ""}`}
                  >
                    {dep.installed ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      <XCircle className="h-3 w-3" />
                    )}
                    {dep.name}
                    {dep.version && (
                      <span className="text-[10px] opacity-70">{dep.version}</span>
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Provider */}
      <Card className="synapse-shadow border-border/50 rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Provider
          </CardTitle>
          <CardDescription>
            Choose which AI provider to use for document analysis and extraction
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Provider</Label>
            <Select value={provider} onValueChange={(val) => setProvider(val ?? "openai")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI (GPT)</SelectItem>
                <SelectItem value="claude">Anthropic (Claude)</SelectItem>
                <SelectItem value="gemini">Google (Gemini)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>API Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showKey ? "text" : "password"}
                  placeholder="Enter your API key"
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setApiKeyError(validateApiKey(e.target.value) || "");
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowKey(!showKey)}
                  type="button"
                  aria-label={showKey ? "Hide API key" : "Show API key"}
                >
                  {showKey ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
            {apiKeyError && <p className="text-xs text-red-500">{apiKeyError}</p>}
          </div>

          <div className="space-y-2">
            <Label>Model</Label>
            <Select value={model} onValueChange={(val) => setModel(val ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {(providerModels[provider] || []).map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            onClick={handleTestAI}
            disabled={testAIMutation.isPending}
            className="w-full rounded-xl"
          >
            {testAIMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Zap className="mr-2 h-4 w-4" />
            )}
            Test AI Connection
          </Button>

          {testAIMutation.data && (
            <div
              className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${
                testAIMutation.data.status === "ok"
                  ? "border-green-200 bg-green-50 text-green-800"
                  : "border-red-200 bg-red-50 text-red-800"
              }`}
            >
              {testAIMutation.data.status === "ok" ? (
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 flex-shrink-0" />
              )}
              {testAIMutation.data.message}
            </div>
          )}
        </CardContent>
      </Card>

      {/* OCR Provider */}
      <Card className="synapse-shadow border-border/50 rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" />
            OCR Provider
          </CardTitle>
          <CardDescription>
            Choose the OCR engine for document pre-processing. Mistral OCR uses
            a dedicated API for high-quality text extraction from PDFs and images.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Provider</Label>
            <Select value={ocrProvider} onValueChange={(val) => setOcrProvider(val ?? "default")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default (pdfplumber + Tesseract + AI Vision)</SelectItem>
                <SelectItem value="mistral">Mistral OCR</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {ocrProvider === "mistral" && (
            <>
              <div className="space-y-2">
                <Label>Mistral API Key</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showMistralKey ? "text" : "password"}
                      placeholder="Enter your Mistral API key"
                      value={mistralApiKey}
                      onChange={(e) => setMistralApiKey(e.target.value)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setShowMistralKey(!showMistralKey)}
                      type="button"
                      aria-label={showMistralKey ? "Hide API key" : "Show API key"}
                    >
                      {showMistralKey ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Get your API key from{" "}
                  <a href="https://console.mistral.ai/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    console.mistral.ai
                  </a>
                </p>
              </div>

              <Button
                variant="outline"
                onClick={handleTestMistral}
                disabled={testMistralMutation.isPending}
                className="w-full rounded-xl"
              >
                {testMistralMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="mr-2 h-4 w-4" />
                )}
                Test Mistral OCR
              </Button>

              {testMistralMutation.data && (
                <div
                  className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${
                    testMistralMutation.data.status === "ok"
                      ? "border-green-200 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200 dark:border-green-800"
                      : "border-red-200 bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200 dark:border-red-800"
                  }`}
                >
                  {testMistralMutation.data.status === "ok" ? (
                    <CheckCircle className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 flex-shrink-0" />
                  )}
                  {testMistralMutation.data.message}
                </div>
              )}
            </>
          )}

          {ocrProvider === "default" && (
            <p className="text-xs text-muted-foreground rounded-lg bg-muted p-3">
              Default mode uses pdfplumber for digital PDFs, Tesseract for scanned documents,
              and your configured AI provider as a final fallback. Configure Tesseract paths below if needed.
            </p>
          )}
        </CardContent>
      </Card>

      {/* OCR */}
      <Card className="synapse-shadow border-border/50 rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" />
            OCR Configuration (Tesseract)
          </CardTitle>
          <CardDescription>
            Paths for Tesseract and Poppler. Used as fallback when Mistral OCR is
            not configured, or as primary engine in default mode.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tesseract Path</Label>
            <Input
              placeholder="e.g., C:\Program Files\Tesseract-OCR\tesseract.exe"
              value={tesseractPath}
              onChange={(e) => setTesseractPath(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to use system PATH. Required only for scanned/image
              documents.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Poppler Path</Label>
            <Input
              placeholder="e.g., C:\poppler\Library\bin"
              value={popperPath}
              onChange={(e) => setPopperPath(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Required for scanned PDF OCR on Windows. Text-based PDFs work
              without it (via pdfplumber).
            </p>
          </div>

          <Button
            variant="outline"
            onClick={handleTestOCR}
            disabled={testOCRMutation.isPending}
            className="w-full rounded-xl"
          >
            {testOCRMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ScanLine className="mr-2 h-4 w-4" />
            )}
            Test OCR (Tesseract)
          </Button>

          {testOCRMutation.data && (
            <div
              className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${
                testOCRMutation.data.status === "ok"
                  ? "border-green-200 bg-green-50 text-green-800"
                  : "border-red-200 bg-red-50 text-red-800"
              }`}
            >
              {testOCRMutation.data.status === "ok" ? (
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 flex-shrink-0" />
              )}
              {testOCRMutation.data.message}
            </div>
          )}
        </CardContent>
      </Card>

      <Button
        className="w-full rounded-xl"
        onClick={handleSaveAll}
        disabled={updateMutation.isPending}
      >
        {updateMutation.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        Save All Settings
      </Button>
    </div>
  );
}
