"use client";

import { useState, useEffect } from "react";
import {
  useSettings,
  useUpdateSetting,
  useSystemInfo,
  useValidateDeps,
  useTestAI,
  useTestOCR,
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

  const [provider, setProvider] = useState("openai");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [tesseractPath, setTesseractPath] = useState("");
  const [popperPath, setPopperPath] = useState("");
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (data?.settings) {
      setProvider(data.settings.ai_provider || "openai");
      setApiKey(data.settings.ai_api_key || "");
      setModel(data.settings.ai_model || "");
      setTesseractPath(data.settings.tesseract_path || "");
      setPopperPath(data.settings.poppler_path || "");
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
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Configure AI provider and OCR settings
        </p>
      </div>

      {/* System Info */}
      {sysInfo && (
        <Card>
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
                  className={`gap-1 ${available ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-red-100 text-red-600 hover:bg-red-100"}`}
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
        <Card>
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
                    className={`gap-1 ${
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
                    className={`gap-1 ${
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
      <Card>
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
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowKey(!showKey)}
                  type="button"
                >
                  {showKey ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
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
            className="w-full"
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

      {/* OCR */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" />
            OCR Configuration
          </CardTitle>
          <CardDescription>
            Paths for Tesseract and Poppler. pdfplumber is used as primary
            fallback for text-based PDFs.
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
            className="w-full"
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
        className="w-full"
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
