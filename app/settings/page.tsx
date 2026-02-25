'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Key,
  Bot,
  CheckCircle,
  XCircle,
  ExternalLink,
  Info,
  Sparkles,
  Loader2,
  BookText,
  Zap,
  AlertTriangle,
  ImageIcon,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Slider } from '../../components/ui/slider';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import { toast } from 'sonner';
import type { AIProvider, AISettings } from '../../types';
import { AI_PROVIDERS } from '../../lib/ai-providers';

const DEFAULT_SETTINGS: AISettings = {
  defaultProvider: 'openai',
  defaultModel: 'gpt-4o',
  temperature: 0.8,
  maxTokens: 2000,
  apiKeys: {},
  globalPrompt: '',
};

const ALL_PROVIDERS: AIProvider[] = ['openai', 'anthropic', 'gemini', 'deepseek', 'openrouter'];

function SettingsPageContent() {
  const [settings, setSettings] = useState<AISettings>(DEFAULT_SETTINGS);
  // Track which API key fields are being edited (have user input)
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<AIProvider, string>>({
    openai: '', anthropic: '', gemini: '', deepseek: '', openrouter: ''
  });
  // Track which fields were actually touched/modified by user
  const [touchedKeys, setTouchedKeys] = useState<Set<AIProvider>>(new Set());
  const [keyVisibility, setKeyVisibility] = useState<Record<AIProvider, boolean>>({
    openai: false, anthropic: false, gemini: false, deepseek: false, openrouter: false
  });
  const [isSaving, setIsSaving] = useState(false);
  const [testingProvider, setTestingProvider] = useState<AIProvider | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [autoFallback, setAutoFallback] = useState(true);
  const [fallbackOrder, setFallbackOrder] = useState<AIProvider[]>(['gemini', 'openai', 'anthropic', 'deepseek', 'openrouter']);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/ai-settings');
        const data = await res.json();
        if (data.success) {
          setSettings(data.data);
          // Initialize fallback with autoFallback from settings if available
          if (data.data.autoFallback !== undefined) {
            setAutoFallback(data.data.autoFallback);
          }
          if (data.data.fallbackOrder) {
            setFallbackOrder(data.data.fallbackOrder);
          }
        } else {
          toast.error(data.error || 'Failed to load settings.');
        }
      } catch (error) {
        toast.error('Failed to load settings.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // Handle API key input changes - only mark as touched when user actually types
  const handleApiKeyChange = (provider: AIProvider, value: string) => {
    setApiKeyInputs(prev => ({ ...prev, [provider]: value }));
    setTouchedKeys(prev => new Set(prev).add(provider));
  };

  // Clear a specific API key input (reset to showing saved state)
  const handleClearInput = (provider: AIProvider) => {
    setApiKeyInputs(prev => ({ ...prev, [provider]: '' }));
    setTouchedKeys(prev => {
      const newSet = new Set(prev);
      newSet.delete(provider);
      return newSet;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);

    // Build settings to save - exclude apiKeys initially
    const { apiKeys: _, ...settingsWithoutKeys } = settings;
    const settingsToSave: Partial<AISettings> & { autoFallback?: boolean; fallbackOrder?: AIProvider[] } = {
      ...settingsWithoutKeys,
      autoFallback,
      fallbackOrder,
    };

    // ONLY include API keys that were explicitly touched by the user
    if (touchedKeys.size > 0) {
      const apiKeysToUpdate: Partial<Record<AIProvider, string>> = {};
      for (const provider of touchedKeys) {
        // Include the value from the input (even if empty, meaning user wants to clear it)
        apiKeysToUpdate[provider] = apiKeyInputs[provider];
      }
      settingsToSave.apiKeys = apiKeysToUpdate;
    }

    try {
      const res = await fetch('/api/ai-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsToSave),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('AI settings saved!');
        // Clear inputs and touched state
        setApiKeyInputs({ openai: '', anthropic: '', gemini: '', deepseek: '', openrouter: '' });
        setTouchedKeys(new Set());
        // Re-fetch settings to get updated (but sanitized) data
        const newRes = await fetch('/api/ai-settings');
        const newData = await newRes.json();
        if (newData.success) setSettings(newData.data);
      } else {
        toast.error(data.error || 'Failed to save settings.');
      }
    } catch (error) {
      toast.error('Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async (provider: AIProvider) => {
    setTestingProvider(provider);
    try {
      // If user has unsaved changes for this provider, prompt them to save first
      if (touchedKeys.has(provider)) {
        toast.info("Please save your new API key before testing.");
        setTestingProvider(null);
        return;
      }
      const res = await fetch('/api/ai-settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.error || 'Test failed.');
      }
    } catch (error) {
      toast.error('Failed to run test.');
    } finally {
      setTestingProvider(null);
    }
  };

  // Get display value for API key input
  const getApiKeyDisplayValue = (provider: AIProvider): string => {
    // If user is editing this field, show their input
    if (touchedKeys.has(provider)) {
      return apiKeyInputs[provider];
    }
    // Otherwise show masked saved key or empty
    return settings.apiKeys?.[provider] ? '••••••••••••••••' : '';
  };

  // Check if a provider has a configured key
  const hasConfiguredKey = (provider: AIProvider): boolean => {
    return !!(settings.apiKeys?.[provider]);
  };

  // Get list of configured providers for fallback selection
  const configuredProviders = ALL_PROVIDERS.filter(p => hasConfiguredKey(p));

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentProvider = (settings.defaultProvider || 'openai') as AIProvider;
  const providerInfo = AI_PROVIDERS[currentProvider];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/">
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </Button>
              <div className="flex items-center gap-2">
                <Bot className="w-6 h-6 text-primary" />
                <div>
                  <h1 className="text-xl font-bold">Global AI Settings</h1>
                  <p className="text-sm text-muted-foreground">Manage providers, models, and keys</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {touchedKeys.size > 0 && (
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Unsaved changes
                </Badge>
              )}
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Settings
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid gap-6 max-w-4xl mx-auto">
          {/* Active Provider Card */}
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Active Provider
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="default" className="text-base px-3 py-1">
                    {AI_PROVIDERS[currentProvider]?.name || currentProvider}
                  </Badge>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-mono text-sm">{settings.defaultModel}</span>
                  {hasConfiguredKey(currentProvider) ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <span className="flex items-center gap-1 text-red-500 text-sm">
                      <XCircle className="w-4 h-4" />
                      No API key
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Provider Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Default Provider
              </CardTitle>
              <CardDescription>Choose the default AI provider and model for all campaigns.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Provider</label>
                <Select
                  value={currentProvider}
                  onValueChange={(p) => {
                    const provider = p as AIProvider;
                    const providerConfig = AI_PROVIDERS[provider];
                    const defaultModel = providerConfig.models.find(m => m.recommended)?.id || providerConfig.models[0].id;
                    setSettings(prev => ({
                      ...prev,
                      defaultProvider: provider,
                      defaultModel: defaultModel,
                    }));
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(AI_PROVIDERS).map(([id, provider]) => (
                      <SelectItem key={id} value={id}>
                        <div className="flex items-center gap-2">
                          {provider.name}
                          {hasConfiguredKey(id as AIProvider) && (
                            <CheckCircle className="w-3 h-3 text-green-500" />
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Model</label>
                <Select value={settings.defaultModel} onValueChange={(m) => setSettings(prev => ({ ...prev, defaultModel: m }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {providerInfo.models.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        <div className="flex items-center gap-2">
                          {model.name}
                          {model.recommended && <Badge variant="secondary" className="text-xs">Recommended</Badge>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {providerInfo.models.find(m => m.id === settings.defaultModel)?.description}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Rate Limit Fallback */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Rate Limit Handling
              </CardTitle>
              <CardDescription>Automatically switch to another provider when rate limited (429 error).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Auto-fallback on rate limit</p>
                  <p className="text-sm text-muted-foreground">Try another configured provider if the primary one is rate limited</p>
                </div>
                <Switch checked={autoFallback} onCheckedChange={setAutoFallback} />
              </div>
              {autoFallback && configuredProviders.length > 1 && (
                <div className="pt-2 border-t">
                  <p className="text-sm font-medium mb-2">Fallback priority (drag to reorder):</p>
                  <div className="flex flex-wrap gap-2">
                    {configuredProviders.map((provider, index) => (
                      <Badge
                        key={provider}
                        variant={provider === currentProvider ? "default" : "secondary"}
                        className="cursor-default"
                      >
                        {index + 1}. {AI_PROVIDERS[provider].name}
                        {provider === currentProvider && " (Primary)"}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {configuredProviders.length <= 1 && (
                <p className="text-sm text-muted-foreground italic">
                  Configure at least 2 providers to enable fallback.
                </p>
              )}
            </CardContent>
          </Card>

          {/* API Keys */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                API Keys
              </CardTitle>
              <CardDescription>
                Your API keys are encrypted and stored securely. Only edit a field if you want to change that key.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(AI_PROVIDERS).map(([pId, pInfo]) => {
                const provider = pId as AIProvider;
                const isConfigured = hasConfiguredKey(provider);
                const isTouched = touchedKeys.has(provider);
                const isActive = provider === currentProvider;

                return (
                  <div
                    key={pId}
                    className={`border rounded-lg p-4 space-y-3 ${isActive ? 'border-primary/50 bg-primary/5' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{pInfo.name}</h3>
                        {isActive && <Badge variant="default" className="text-xs">Active</Badge>}
                        {isConfigured ? (
                          <span title="API Key is configured">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          </span>
                        ) : (
                          <span title="API Key is not configured">
                            <XCircle className="w-4 h-4 text-muted-foreground" />
                          </span>
                        )}
                        {isTouched && (
                          <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600">
                            Modified
                          </Badge>
                        )}
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <a href={pInfo.docsUrl} target="_blank" rel="noopener noreferrer">
                          Get API Key <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type={keyVisibility[provider] ? 'text' : 'password'}
                        placeholder={isConfigured ? 'Enter new key to replace...' : `Enter ${pInfo.name} API key...`}
                        value={getApiKeyDisplayValue(provider)}
                        onChange={(e) => handleApiKeyChange(provider, e.target.value)}
                        onFocus={() => {
                          // When focusing, if not already touched and has saved key, clear to allow fresh input
                          if (!isTouched && isConfigured) {
                            setTouchedKeys(prev => new Set(prev).add(provider));
                            setApiKeyInputs(prev => ({ ...prev, [provider]: '' }));
                          }
                        }}
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setKeyVisibility(prev => ({ ...prev, [provider]: !prev[provider] }))}
                      >
                        {keyVisibility[provider] ? 'Hide' : 'Show'}
                      </Button>
                      {isTouched && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleClearInput(provider)}
                          title="Cancel changes"
                        >
                          Cancel
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTest(provider)}
                        disabled={testingProvider === provider || isSaving || !isConfigured}
                      >
                        {testingProvider === provider ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Test'}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">{pInfo.description}</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Model Parameters */}
          <Card>
            <CardHeader>
              <CardTitle>Model Parameters</CardTitle>
              <CardDescription>Adjust the creativity and length of AI responses.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <div>
                <label className="text-sm font-medium">Temperature: {settings.temperature?.toFixed(1)}</label>
                <Slider
                  value={[settings.temperature || 0.8]}
                  onValueChange={([v]) => setSettings(prev => ({ ...prev, temperature: v }))}
                  min={0} max={2} step={0.1}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">Lower is more focused, higher is more creative.</p>
              </div>
              <div>
                <label className="text-sm font-medium">Max Tokens: {settings.maxTokens}</label>
                <Slider
                  value={[settings.maxTokens || 2000]}
                  onValueChange={([v]) => setSettings(prev => ({ ...prev, maxTokens: v }))}
                  min={500} max={8000} step={100}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">Maximum length of AI responses.</p>
              </div>
            </CardContent>
          </Card>

          {/* Image Generation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Image Generation & Storage
              </CardTitle>
              <CardDescription>Configure AI image generation for scenes, NPCs, and items. Requires an OpenAI API key.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Image Provider</label>
                  <Select
                    value={(settings as any).imageProvider || 'openai'}
                    onValueChange={(v) => setSettings(prev => ({ ...prev, imageProvider: v as any }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">
                        <div className="flex items-center gap-2">
                          OpenAI (DALL-E)
                          {hasConfiguredKey('openai') && <CheckCircle className="w-3 h-3 text-green-500" />}
                        </div>
                      </SelectItem>
                      <SelectItem value="none">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Image Model</label>
                  <Select
                    value={(settings as any).imageModel || 'dall-e-3'}
                    onValueChange={(v) => setSettings(prev => ({ ...prev, imageModel: v }))}
                    disabled={(settings as any).imageProvider === 'none'}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dall-e-3">
                        <div className="flex items-center gap-2">
                          DALL-E 3
                          <Badge variant="secondary" className="text-xs">Recommended</Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="dall-e-2">DALL-E 2 (Cheaper, lower quality)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(settings as any).imageModel === 'dall-e-2'
                      ? 'DALL-E 2: ~$0.02/image, 1024x1024 max'
                      : 'DALL-E 3: ~$0.04/image, 1792x1024 scenes'}
                  </p>
                </div>
              </div>
              <div className="border-t pt-4">
                <label className="text-sm font-medium">Local Image Storage Path</label>
                <Input
                  type="text"
                  placeholder="./public/images (default)"
                  value={(settings as any).imageStoragePath || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, imageStoragePath: e.target.value || undefined }))}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Directory where generated and uploaded images are stored locally. Leave empty to use default (./public/images).
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Global Prompt */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookText className="w-5 h-5" />
                Global Prompt Amendments
              </CardTitle>
              <CardDescription>Add text here to amend the system prompt for all campaigns.</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={settings.globalPrompt}
                onChange={(e) => setSettings(prev => ({ ...prev, globalPrompt: e.target.value }))}
                placeholder="e.g., All responses should be in the style of a classic fantasy novel..."
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Security Info */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  <strong>Security:</strong> Your API keys are encrypted at rest in the database. They are only decrypted temporarily on the server to make API calls to the respective providers.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
      <SettingsPageContent />
    </Suspense>
  );
}
