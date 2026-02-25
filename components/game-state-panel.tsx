'use client';

import React, { useState } from 'react';
import {
  Map,
  MapPin,
  ChevronRight,
  Clock,
  CloudSun,
  Coins,
  Swords,
  Users,
  Target,
  ImagePlus,
  Loader2,
  X,
  Maximize2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { GameState, Campaign, Quest } from '@/types';

interface GameStatePanelProps {
  campaign: Campaign;
  gameState: GameState;
  isGeneratingImage?: boolean;
  onGenerateImage?: () => void;
}

export function GameStatePanel({
  campaign,
  gameState,
  isGeneratingImage,
  onGenerateImage,
}: GameStatePanelProps) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Safely access arrays with fallbacks
  const quests = campaign?.quests || [];
  const npcs = campaign?.npcs || [];
  const activeQuests = quests.filter((q) => q?.status === 'active');
  const knownNpcs = npcs.filter((n) => n?.isAlive !== false);

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Map className="w-5 h-5" />
            Game State
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden">
          <ScrollArea className="h-full pr-4">
            <div className="space-y-4">
              {/* Scene Image */}
              {gameState.currentSceneImageUrl && (
                <div
                  className="rounded-lg overflow-hidden cursor-pointer group relative"
                  onClick={() => setLightboxUrl(gameState.currentSceneImageUrl!)}
                >
                  <img
                    src={gameState.currentSceneImageUrl}
                    alt="Current scene"
                    className="w-full h-40 object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <Maximize2 className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                  </div>
                </div>
              )}

              {/* Current Scene */}
              <div>
                <h4 className="text-sm font-semibold mb-1 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Current Scene
                </h4>
                <p className="text-sm text-muted-foreground">
                  {gameState.currentScene || 'The adventure awaits...'}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={onGenerateImage}
                  disabled={isGeneratingImage}
                >
                  {isGeneratingImage ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ImagePlus className="w-4 h-4 mr-2" />
                  )}
                  Generate Image
                </Button>
              </div>

              {/* Environment */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted rounded-lg p-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    <Clock className="w-3 h-3" />
                    Time
                  </div>
                  <p className="text-sm font-medium capitalize">
                    {gameState.timeOfDay}
                  </p>
                </div>
                <div className="bg-muted rounded-lg p-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    <CloudSun className="w-3 h-3" />
                    Weather
                  </div>
                  <p className="text-sm font-medium capitalize">
                    {gameState.weather}
                  </p>
                </div>
              </div>

              {/* Location Breadcrumb & Gold */}
              <div className="space-y-2">
                <div className="bg-muted rounded-lg p-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1.5">
                    <MapPin className="w-3 h-3" />
                    Location
                  </div>
                  {/* Breadcrumb trail */}
                  <div className="flex items-center gap-1 flex-wrap text-xs">
                    {campaign.worldSetting && (
                      <>
                        <span className="text-muted-foreground">{campaign.worldSetting}</span>
                        <ChevronRight className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
                      </>
                    )}
                    <span className="font-medium text-sm text-foreground">
                      {campaign.currentLocation || 'Unknown'}
                    </span>
                  </div>
                  {/* Visited locations chips */}
                  {campaign.locations && campaign.locations.filter(l => l.visited).length > 1 && (
                    <div className="flex gap-1 flex-wrap mt-2">
                      {campaign.locations
                        .filter(l => l.visited)
                        .slice(-6)
                        .map((loc) => (
                          <Badge
                            key={loc.name}
                            variant={loc.name === campaign.currentLocation ? 'default' : 'outline'}
                            className="text-[10px] h-5"
                          >
                            {loc.name}
                          </Badge>
                        ))}
                    </div>
                  )}
                </div>
                <div className="bg-muted rounded-lg p-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    <Coins className="w-3 h-3" />
                    Party Gold
                  </div>
                  <p className="text-sm font-medium">{gameState.partyGold} gp</p>
                </div>
              </div>

              {/* Combat Status */}
              {gameState.inCombat && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Swords className="w-4 h-4 text-red-500" />
                    <span className="font-semibold text-red-500">
                      Combat - Round {gameState.round}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {gameState.initiativeOrder.map((entry, i) => (
                      <div
                        key={entry.id}
                        className={`text-sm flex items-center justify-between ${
                          i === gameState.currentTurn
                            ? 'font-bold text-red-500'
                            : 'text-muted-foreground'
                        }`}
                      >
                        <span>
                          {i + 1}. {entry.name}
                        </span>
                        <span>
                          Init: {entry.initiative}
                          {entry.hp !== undefined && ` | HP: ${entry.hp}/${entry.maxHp}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Quests */}
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Active Quests ({activeQuests.length})
                </h4>
                {activeQuests.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active quests</p>
                ) : (
                  <div className="space-y-2">
                    {activeQuests.slice(0, 3).map((quest) => (
                      <div key={quest.id} className="bg-muted rounded-lg p-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{quest.name}</span>
                          <Badge
                            variant={
                              quest.priority === 'main' ? 'default' : 'secondary'
                            }
                            className="text-xs"
                          >
                            {quest.priority}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {quest.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Known NPCs */}
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Known NPCs ({knownNpcs.length})
                </h4>
                {knownNpcs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No NPCs encountered yet
                  </p>
                ) : (
                  <div className="space-y-1">
                    {knownNpcs.slice(0, 5).map((npc) => (
                      <div
                        key={npc.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span>{npc.name}</span>
                        <Badge
                          variant={
                            npc.disposition === 'friendly'
                              ? 'success'
                              : npc.disposition === 'hostile'
                              ? 'destructive'
                              : 'secondary'
                          }
                          className="text-xs"
                        >
                          {npc.disposition}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm cursor-pointer"
          onClick={() => setLightboxUrl(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20 z-10"
            onClick={() => setLightboxUrl(null)}
          >
            <X className="w-6 h-6" />
          </Button>
          <img
            src={lightboxUrl}
            alt="Scene enlarged"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
