'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Plus,
  Calendar,
  Clock,
  Trash2,
  Play,
  Settings,
  Bot,
  Database,
  CheckCircle,
  XCircle,
  Loader2,
  Compass,
  Shield,
  Map,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import type { Campaign, Character } from '../types';
import { Users } from 'lucide-react';
import { formatRelativeTime } from '../lib/utils';

export default function HomePage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState<'checking' | 'healthy' | 'error'>('checking');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    description: '',
    worldSetting: '',
  });
  const [creating, setCreating] = useState(false);
  const [campaignCharacters, setCampaignCharacters] = useState<Record<string, Character[]>>({});

  // Check database status
  useEffect(() => {
    const checkDb = async () => {
      try {
        const res = await fetch('/api/db/setup');
        const data = await res.json();
        setDbStatus(data.connected ? 'healthy' : 'error');
      } catch {
        setDbStatus('error');
      }
    };
    checkDb();
  }, []);

  // Load campaigns
  useEffect(() => {
    const loadCampaigns = async () => {
      try {
        const res = await fetch('/api/campaigns');
        const data = await res.json();
        if (data.success) {
          setCampaigns(data.data);
          // Fetch characters for each campaign
          const charMap: Record<string, Character[]> = {};
          await Promise.all(
            data.data.map(async (c: Campaign) => {
              try {
                const charRes = await fetch(`/api/characters?campaignId=${c.id}`);
                const charData = await charRes.json();
                if (charData.success) charMap[c.id] = charData.data;
              } catch { /* ignore */ }
            })
          );
          setCampaignCharacters(charMap);
        }
      } catch (error) {
        toast.error('Failed to load campaigns');
      } finally {
        setLoading(false);
      }
    };
    loadCampaigns();
  }, []);

  const handleCreateCampaign = async () => {
    if (!newCampaign.name.trim()) {
      toast.error('Campaign name is required');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCampaign),
      });
      const data = await res.json();

      if (data.success) {
        toast.success('Campaign created!');
        router.push(`/setup?campaignId=${data.data.id}`);
      } else {
        toast.error(data.error || 'Failed to create campaign');
      }
    } catch (error) {
      toast.error('Failed to create campaign');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;

    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCampaigns(campaigns.filter((c) => c.id !== id));
        toast.success('Campaign deleted');
      }
    } catch (error) {
      toast.error('Failed to delete campaign');
    }
  };

  const handleSetupDb = async () => {
    try {
      toast.info('Setting up database...');
      const res = await fetch('/api/db/setup', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setDbStatus('healthy');
        toast.success('Database setup complete! Refreshing...');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast.error(data.error || 'Database setup failed');
      }
    } catch (error) {
      toast.error('Database setup failed: ' + String(error));
    }
  };

  return (
    <div className="min-h-screen bg-background bg-realm-pattern">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Compass className="w-8 h-8 text-primary" />
                <Sparkles className="w-3 h-3 text-primary/60 absolute -top-0.5 -right-0.5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold font-medieval text-gold-gradient tracking-wide">
                  Infinite Realms
                </h1>
                <p className="text-xs text-muted-foreground tracking-wider uppercase">
                  Solo Tabletop Adventures
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" asChild className="border-border/50 hover:border-primary/40">
                <Link href="/settings">
                  <Bot className="w-4 h-4" />
                </Link>
              </Button>
              {/* Database Status */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 text-sm border border-border/30">
                <Database className="w-3.5 h-3.5 text-muted-foreground" />
                {dbStatus === 'checking' && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                )}
                {dbStatus === 'healthy' && (
                  <CheckCircle className="w-3.5 h-3.5 text-realm-emerald" />
                )}
                {dbStatus === 'error' && (
                  <>
                    <XCircle className="w-3.5 h-3.5 text-realm-crimson" />
                    <Button size="sm" variant="ghost" onClick={handleSetupDb} className="h-6 text-xs">
                      Setup DB
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-semibold font-medieval tracking-wide">Your Campaigns</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Choose a realm to continue your journey</p>
          </div>

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/10">
                <Plus className="w-4 h-4 mr-2" />
                New Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="border-border/50">
              <DialogHeader>
                <DialogTitle className="font-medieval text-lg">Begin a New Adventure</DialogTitle>
                <DialogDescription>
                  Create your campaign, shape a world, and forge your destiny.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Campaign Name</label>
                  <Input
                    placeholder="The Lost Mines of..."
                    value={newCampaign.name}
                    onChange={(e) =>
                      setNewCampaign({ ...newCampaign, name: e.target.value })
                    }
                    className="border-border/50 focus:border-primary/50"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    placeholder="A brief description of your adventure..."
                    value={newCampaign.description}
                    onChange={(e) =>
                      setNewCampaign({
                        ...newCampaign,
                        description: e.target.value,
                      })
                    }
                    className="border-border/50 focus:border-primary/50"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">World Setting</label>
                  <Input
                    placeholder="Forgotten Realms, Eberron, Custom..."
                    value={newCampaign.worldSetting}
                    onChange={(e) =>
                      setNewCampaign({
                        ...newCampaign,
                        worldSetting: e.target.value,
                      })
                    }
                    className="border-border/50 focus:border-primary/50"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                  className="border-border/50"
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateCampaign} disabled={creating}>
                  {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Campaign
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Loading your realms...</p>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Map className="w-10 h-10 text-primary/60" />
              </div>
              <Sparkles className="w-5 h-5 text-primary/40 absolute -top-1 -right-1 animate-pulse" />
            </div>
            <h3 className="text-lg font-semibold font-medieval mb-2">No Realms Discovered</h3>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              Your journey begins with a single step. Create your first campaign and
              step into a world of infinite possibilities.
            </p>
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="shadow-lg shadow-primary/10"
            >
              <Plus className="w-4 h-4 mr-2" />
              Begin Your First Adventure
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((campaign, index) => (
              <div
                key={campaign.id}
                className="realm-card rounded-lg bg-card animate-fade-in"
                style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'both' }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="font-medieval text-base tracking-wide truncate">
                        {campaign.name}
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {campaign.worldSetting || 'Custom World'}
                      </CardDescription>
                    </div>
                    <Badge
                      variant="secondary"
                      className="ml-2 text-[10px] uppercase tracking-wider border border-border/30 shrink-0"
                    >
                      {campaign.difficultyLevel}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2 leading-relaxed">
                    {campaign.description || 'An epic adventure awaits...'}
                  </p>

                  {/* Party Roster */}
                  {campaignCharacters[campaign.id]?.length > 0 && (
                    <div className="flex items-center gap-2 mb-3 overflow-hidden">
                      <Users className="w-3 h-3 text-primary/50 flex-shrink-0" />
                      <div className="flex gap-1.5 flex-wrap">
                        {campaignCharacters[campaign.id].map(char => (
                          <span
                            key={char.id}
                            className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-muted/60 border border-border/30"
                          >
                            {char.portraitUrl && (
                              <img src={char.portraitUrl} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />
                            )}
                            <span className="truncate max-w-[70px]">{char.name}</span>
                            <span className="text-muted-foreground">L{char.level}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                    <span className="flex items-center gap-1.5">
                      <Shield className="w-3 h-3 text-primary/50" />
                      Session {campaign.sessionCount}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-primary/50" />
                      {formatRelativeTime(campaign.lastPlayedAt)}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button asChild className="flex-1 shadow-sm">
                      <Link href={`/game?campaignId=${campaign.id}`}>
                        <Play className="w-4 h-4 mr-2" />
                        Continue
                      </Link>
                    </Button>
                    <Button variant="outline" size="icon" asChild className="border-border/50">
                      <Link href={`/setup?campaignId=${campaign.id}`}>
                        <Settings className="w-4 h-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDeleteCampaign(campaign.id)}
                      className="border-border/50 hover:border-realm-crimson/50 hover:text-realm-crimson"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 mt-auto">
        <div className="container mx-auto px-4 py-4">
          <p className="text-center text-xs text-muted-foreground/60">
            Infinite Realms &mdash; AI-powered solo tabletop adventures
          </p>
        </div>
      </footer>
    </div>
  );
}
