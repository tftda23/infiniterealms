'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  UserPlus,
  Loader2,
  Play,
  Settings,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CharacterCreator, type NewCharacterData } from '@/components/character-creator';
import { CampaignContentManager, type CampaignContent } from '@/components/campaign-content-manager';
import type { Campaign, Character } from '@/types';

function SetupPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const campaignId = searchParams.get('campaignId');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [campaignContents, setCampaignContents] = useState<CampaignContent[]>([]);

  // New character state
  const [newCharacterOpen, setNewCharacterOpen] = useState(false);

  // Load campaign data
  useEffect(() => {
    if (!campaignId) {
      router.push('/');
      return;
    }

    const loadData = async () => {
      try {
        const [campaignRes, charactersRes, contentRes] = await Promise.all([
          fetch(`/api/campaigns/${campaignId}`),
          fetch(`/api/characters?campaignId=${campaignId}`),
          fetch(`/api/campaign-content?campaignId=${campaignId}`),
        ]);

        const [campaignData, charactersData, contentData] = await Promise.all([
          campaignRes.json(),
          charactersRes.json(),
          contentRes.json(),
        ]);

        if (campaignData.success) setCampaign(campaignData.data);
        if (charactersData.success) setCharacters(charactersData.data);
        if (contentData.success) setCampaignContents(contentData.data);
      } catch (error) {
        toast.error('Failed to load campaign data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [campaignId, router]);

  // Save campaign settings
  const handleSaveCampaign = async () => {
    if (!campaign) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaign.name,
          description: campaign.description,
          worldSetting: campaign.worldSetting,
          difficultyLevel: campaign.difficultyLevel,
          rulesEnforcement: campaign.rulesEnforcement,
          dmPersonality: campaign.dmPersonality,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Campaign saved!');
      } else {
        toast.error(data.error || 'Failed to save');
      }
    } catch (error) {
      toast.error('Failed to save campaign');
    } finally {
      setSaving(false);
    }
  };

  // Create new character
  const handleCreateCharacter = async (characterData: NewCharacterData) => {
    try {
      const res = await fetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          ...characterData,
          hitDiceRemaining: characterData.level,
          deathSaves: { successes: 0, failures: 0 },
          experience: 0,
          notes: '',
          syncEnabled: false,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setCharacters([...characters, data.data]);
        setNewCharacterOpen(false);
        toast.success(`${characterData.name} has joined the party!`);
      } else {
        toast.error(data.error || 'Failed to create character');
      }
    } catch (error) {
      toast.error('Failed to create character');
    }
  };

  // Delete character
  const handleDeleteCharacter = async (characterId: string) => {
    if (!confirm('Are you sure you want to delete this character?')) return;

    try {
      const res = await fetch(`/api/characters/${characterId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setCharacters(characters.filter((c) => c.id !== characterId));
        toast.success('Character deleted');
      }
    } catch (error) {
      toast.error('Failed to delete character');
    }
  };

  // Campaign content handlers
  const handleAddContent = useCallback(async (content: Omit<CampaignContent, 'id' | 'createdAt' | 'updatedAt' | 'campaignId'>) => {
    const res = await fetch('/api/campaign-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId,
        name: content.name,
        type: content.type,
        content: content.content,
        summary: content.summary,
        source: content.source,
        category: content.category,
        isHidden: content.isHidden,
      }),
    });

    const data = await res.json();
    if (data.success) {
      setCampaignContents(prev => [data.data, ...prev]);
    } else {
      throw new Error(data.error || 'Failed to add content');
    }
  }, [campaignId]);

  const handleRemoveContent = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to remove this content?')) return;

    const res = await fetch(`/api/campaign-content/${id}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      setCampaignContents(prev => prev.filter(c => c.id !== id));
      toast.success('Content removed');
    } else {
      toast.error('Failed to remove content');
    }
  }, []);

  const handleToggleContentVisibility = useCallback(async (id: string) => {
    const res = await fetch(`/api/campaign-content/${id}/toggle-visibility`, {
      method: 'POST',
    });

    const data = await res.json();
    if (data.success) {
      setCampaignContents(prev =>
        prev.map(c => (c.id === id ? data.data : c))
      );
    } else {
      toast.error('Failed to toggle visibility');
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Campaign not found</p>
          <Button asChild>
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/">
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </Button>
              <div>
                <h1 className="text-xl font-bold">{campaign.name}</h1>
                <p className="text-sm text-muted-foreground">Campaign Setup</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSaveCampaign} disabled={saving}>
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
              <Button asChild>
                <Link href={`/game?campaignId=${campaignId}`}>
                  <Play className="w-4 h-4 mr-2" />
                  Play
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="campaign">
          <TabsList>
            <TabsTrigger value="campaign">
              <Settings className="w-4 h-4 mr-2" />
              Campaign
            </TabsTrigger>
            <TabsTrigger value="characters">
              <UserPlus className="w-4 h-4 mr-2" />
              Characters ({characters.length})
            </TabsTrigger>
            <TabsTrigger value="content">
              <BookOpen className="w-4 h-4 mr-2" />
              Content ({campaignContents.length})
            </TabsTrigger>
          </TabsList>

          {/* Campaign Settings */}
          <TabsContent value="campaign" className="mt-6">
            <div className="grid gap-6 max-w-2xl">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Campaign Name</label>
                    <Input
                      value={campaign.name}
                      onChange={(e) =>
                        setCampaign({ ...campaign, name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      value={campaign.description}
                      onChange={(e) =>
                        setCampaign({ ...campaign, description: e.target.value })
                      }
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">World Setting</label>
                    <Input
                      value={campaign.worldSetting}
                      onChange={(e) =>
                        setCampaign({ ...campaign, worldSetting: e.target.value })
                      }
                      placeholder="Forgotten Realms, Eberron, Custom..."
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Game Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Difficulty Level</label>
                    <select
                      className="w-full mt-1 p-2 rounded-md border bg-background"
                      value={campaign.difficultyLevel}
                      onChange={(e) =>
                        setCampaign({
                          ...campaign,
                          difficultyLevel: e.target.value as Campaign['difficultyLevel'],
                        })
                      }
                    >
                      <option value="easy">Easy</option>
                      <option value="normal">Normal</option>
                      <option value="hard">Hard</option>
                      <option value="deadly">Deadly</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Rules Enforcement</label>
                    <select
                      className="w-full mt-1 p-2 rounded-md border bg-background"
                      value={campaign.rulesEnforcement}
                      onChange={(e) =>
                        setCampaign({
                          ...campaign,
                          rulesEnforcement: e.target.value as Campaign['rulesEnforcement'],
                        })
                      }
                    >
                      <option value="strict">Strict (RAW)</option>
                      <option value="moderate">Moderate</option>
                      <option value="loose">Loose (Rule of Cool)</option>
                    </select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Dungeon Master</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">DM Personality</label>
                    <div className="flex gap-1.5 flex-wrap mt-1 mb-2">
                      {[
                        { label: 'Classic Fantasy', value: 'A wise and fair Dungeon Master who creates rich, immersive high-fantasy adventures with compelling NPCs and dramatic storytelling.' },
                        { label: 'Grim & Gritty', value: 'A harsh, realistic DM running a dark, low-fantasy world where resources are scarce, choices have consequences, and death lurks around every corner.' },
                        { label: 'Lighthearted', value: 'A fun, humorous DM who keeps things lighthearted with witty NPCs, comedic situations, and a focus on creative problem-solving over combat.' },
                        { label: 'Horror', value: 'A suspenseful DM who builds dread and tension with atmospheric descriptions, unreliable allies, creeping horrors, and moments of genuine terror.' },
                        { label: 'Tactical', value: 'A strategic DM focused on challenging combat encounters, clever puzzles, resource management, and rewarding tactical thinking.' },
                      ].map(preset => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setCampaign({ ...campaign, dmPersonality: preset.value })}
                          className="px-2.5 py-1 text-xs rounded-full border border-border hover:bg-primary/10 hover:border-primary/30 transition-colors"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    <Textarea
                      value={campaign.dmPersonality}
                      onChange={(e) =>
                        setCampaign({ ...campaign, dmPersonality: e.target.value })
                      }
                      rows={4}
                      placeholder="A wise and fair Dungeon Master who creates immersive adventures..."
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Characters */}
          <TabsContent value="characters" className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Party Members</h2>

              <Button onClick={() => setNewCharacterOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Character
              </Button>

              <CharacterCreator
                open={newCharacterOpen}
                onOpenChange={setNewCharacterOpen}
                onCreateCharacter={handleCreateCharacter}
              />
            </div>

            {characters.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <UserPlus className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No characters yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first character to begin adventuring!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {characters.map((character) => (
                  <Card key={character.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle>{character.name}</CardTitle>
                          <CardDescription>
                            Level {character.level} {character.race} {character.class}
                          </CardDescription>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteCharacter(character.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="secondary">
                          HP: {character.currentHp}/{character.maxHp}
                        </Badge>
                        <Badge variant="secondary">AC: {character.armorClass}</Badge>
                        <Badge variant="outline">{character.background}</Badge>
                        {character.alignment && (
                          <Badge variant="outline">{character.alignment}</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Campaign Content */}
          <TabsContent value="content" className="mt-6">
            <div className="max-w-4xl">
              <CampaignContentManager
                campaignId={campaignId!}
                contents={campaignContents}
                onAddContent={handleAddContent}
                onRemoveContent={handleRemoveContent}
                onToggleVisibility={handleToggleContentVisibility}
              />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default function SetupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <SetupPageContent />
    </Suspense>
  );
}
