'use client';

import React, { useState, useCallback } from 'react';
import {
  FileText,
  Upload,
  Link as LinkIcon,
  Trash2,
  Eye,
  EyeOff,
  Plus,
  Loader2,
  BookOpen,
  Globe,
  File,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { CampaignContent, ContentType, ContentCategory } from '@/types';

// Re-export for convenience
export type { CampaignContent };

interface CampaignContentManagerProps {
  campaignId: string;
  contents: CampaignContent[];
  onAddContent: (content: Omit<CampaignContent, 'id' | 'createdAt' | 'updatedAt' | 'campaignId'>) => Promise<void>;
  onRemoveContent: (id: string) => Promise<void>;
  onToggleVisibility: (id: string) => Promise<void>;
}

const CONTENT_CATEGORIES = [
  { id: 'lore', name: 'Lore & History', icon: BookOpen },
  { id: 'rules', name: 'House Rules', icon: FileText },
  { id: 'locations', name: 'Locations', icon: Globe },
  { id: 'npcs', name: 'NPCs & Factions', icon: File },
  { id: 'items', name: 'Items & Equipment', icon: File },
  { id: 'monsters', name: 'Monsters & Encounters', icon: File },
  { id: 'other', name: 'Other', icon: File },
];

export function CampaignContentManager({
  campaignId,
  contents,
  onAddContent,
  onRemoveContent,
  onToggleVisibility,
}: CampaignContentManagerProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addingContent, setAddingContent] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['lore', 'rules']));

  // New content form state
  const [newContent, setNewContent] = useState({
    name: '',
    type: 'text' as ContentType,
    content: '',
    source: '',
    category: 'lore' as ContentCategory,
    isHidden: false,
  });

  // File upload handler
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    const isPdf = file.type === 'application/pdf';
    const isText = file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md');

    if (!isPdf && !isText) {
      toast.error('Please upload a PDF or text file');
      return;
    }

    try {
      if (isText) {
        const text = await file.text();
        setNewContent(prev => ({
          ...prev,
          name: file.name.replace(/\.[^/.]+$/, ''),
          type: 'text',
          content: text,
          source: file.name,
        }));
      } else if (isPdf) {
        // For PDFs, we'll need to extract text - for now, just store the file info
        // In a real implementation, you'd use pdf.js or a server-side PDF parser
        toast.info('PDF uploaded - text extraction will be processed');
        setNewContent(prev => ({
          ...prev,
          name: file.name.replace(/\.[^/.]+$/, ''),
          type: 'pdf',
          content: `[PDF Content from ${file.name}]`,
          source: file.name,
        }));
      }
    } catch (error) {
      toast.error('Failed to read file');
    }
  }, []);

  // URL fetch handler
  const handleFetchUrl = useCallback(async () => {
    if (!newContent.source) {
      toast.error('Please enter a URL');
      return;
    }

    try {
      // In a real implementation, you'd fetch the URL content from a server endpoint
      // to avoid CORS issues
      toast.info('Fetching URL content...');
      setNewContent(prev => ({
        ...prev,
        type: 'url',
        content: `[Content fetched from ${prev.source}]`,
        name: prev.name || new URL(prev.source).hostname,
      }));
    } catch (error) {
      toast.error('Failed to fetch URL');
    }
  }, [newContent.source]);

  // API fetch handler
  const handleFetchApi = useCallback(async () => {
    if (!newContent.source) {
      toast.error('Please enter an API endpoint');
      return;
    }

    try {
      const response = await fetch(newContent.source);
      const data = await response.json();
      setNewContent(prev => ({
        ...prev,
        type: 'api',
        content: JSON.stringify(data, null, 2),
        name: prev.name || 'API Data',
      }));
      toast.success('API data fetched!');
    } catch (error) {
      toast.error('Failed to fetch API data');
    }
  }, [newContent.source]);

  // Submit new content
  const handleAddContent = async () => {
    if (!newContent.name.trim() || !newContent.content.trim()) {
      toast.error('Please provide a name and content');
      return;
    }

    setAddingContent(true);
    try {
      await onAddContent({
        name: newContent.name,
        type: newContent.type,
        content: newContent.content,
        source: newContent.source,
        category: newContent.category,
        isHidden: newContent.isHidden,
      });

      // Reset form
      setNewContent({
        name: '',
        type: 'text' as ContentType,
        content: '',
        source: '',
        category: 'lore' as ContentCategory,
        isHidden: false,
      });
      setIsAddDialogOpen(false);
      toast.success('Content added to campaign!');
    } catch (error) {
      toast.error('Failed to add content');
    } finally {
      setAddingContent(false);
    }
  };

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  // Group contents by category
  const contentsByCategory = CONTENT_CATEGORIES.map(cat => ({
    ...cat,
    contents: contents.filter(c => c.category === cat.id),
  }));

  const totalContents = contents.length;
  const hiddenContents = contents.filter(c => c.isHidden).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Campaign Content
            </CardTitle>
            <CardDescription>
              Add lore, rules, and reference material for the AI to use
            </CardDescription>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Content
          </Button>
        </div>
        {totalContents > 0 && (
          <div className="flex gap-2 mt-2">
            <Badge variant="secondary">{totalContents} items</Badge>
            {hiddenContents > 0 && (
              <Badge variant="outline">{hiddenContents} hidden from AI</Badge>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {totalContents === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No content added yet</p>
            <p className="text-sm mt-1">
              Add PDFs, text documents, or API data to enhance your campaign
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {contentsByCategory.map(category => {
              if (category.contents.length === 0) return null;
              const CategoryIcon = category.icon;
              const isExpanded = expandedCategories.has(category.id);

              return (
                <div key={category.id} className="border rounded-lg">
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      <CategoryIcon className="w-4 h-4" />
                      <span className="font-medium">{category.name}</span>
                      <Badge variant="secondary" className="ml-2">
                        {category.contents.length}
                      </Badge>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t p-2 space-y-2">
                      {category.contents.map(content => (
                        <div
                          key={content.id}
                          className={cn(
                            "flex items-center justify-between p-2 rounded-lg",
                            content.isHidden ? "bg-muted/30 opacity-60" : "bg-muted/50"
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Badge variant="outline" className="text-xs">
                              {content.type}
                            </Badge>
                            <span className="truncate font-medium">{content.name}</span>
                            {content.isHidden && (
                              <EyeOff className="w-3 h-3 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => onToggleVisibility(content.id)}
                              title={content.isHidden ? 'Show to AI' : 'Hide from AI'}
                            >
                              {content.isHidden ? (
                                <Eye className="w-4 h-4" />
                              ) : (
                                <EyeOff className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => onRemoveContent(content.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Add Content Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Campaign Content</DialogTitle>
            <DialogDescription>
              Add reference material, lore, or rules for the AI Dungeon Master to use.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Content Type Selection */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { type: 'text' as ContentType, label: 'Text', icon: FileText },
                { type: 'pdf' as ContentType, label: 'PDF', icon: File },
                { type: 'url' as ContentType, label: 'URL', icon: Globe },
                { type: 'api' as ContentType, label: 'API', icon: LinkIcon },
              ].map(({ type, label, icon: Icon }) => (
                <Button
                  key={type}
                  variant={newContent.type === type ? 'default' : 'outline'}
                  className="flex-col h-auto py-3"
                  onClick={() => setNewContent(prev => ({ ...prev, type }))}
                >
                  <Icon className="w-5 h-5 mb-1" />
                  <span className="text-xs">{label}</span>
                </Button>
              ))}
            </div>

            {/* Name */}
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={newContent.name}
                onChange={e => setNewContent(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Forgotten Realms Lore, House Rules"
              />
            </div>

            {/* Category */}
            <div>
              <label className="text-sm font-medium">Category</label>
              <Select
                value={newContent.category}
                onValueChange={v => setNewContent(prev => ({ ...prev, category: v as ContentCategory }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_CATEGORIES.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Type-specific input */}
            {newContent.type === 'text' && (
              <div>
                <label className="text-sm font-medium">Content</label>
                <Textarea
                  value={newContent.content}
                  onChange={e => setNewContent(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Paste or type your content here..."
                  rows={10}
                />
              </div>
            )}

            {newContent.type === 'pdf' && (
              <div>
                <label className="text-sm font-medium">Upload PDF or Text File</label>
                <div className="mt-2 border-2 border-dashed rounded-lg p-6 text-center">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Drag & drop or click to upload
                  </p>
                  <input
                    type="file"
                    accept=".pdf,.txt,.md"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <Button asChild variant="outline">
                    <label htmlFor="file-upload" className="cursor-pointer">
                      Choose File
                    </label>
                  </Button>
                  {newContent.source && (
                    <p className="mt-2 text-sm text-green-600">
                      ✓ {newContent.source}
                    </p>
                  )}
                </div>
              </div>
            )}

            {newContent.type === 'url' && (
              <div>
                <label className="text-sm font-medium">URL</label>
                <div className="flex gap-2">
                  <Input
                    value={newContent.source}
                    onChange={e => setNewContent(prev => ({ ...prev, source: e.target.value }))}
                    placeholder="https://example.com/lore-page"
                  />
                  <Button variant="outline" onClick={handleFetchUrl}>
                    Fetch
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Note: Some websites may block content fetching
                </p>
              </div>
            )}

            {newContent.type === 'api' && (
              <div>
                <label className="text-sm font-medium">API Endpoint (JSON)</label>
                <div className="flex gap-2">
                  <Input
                    value={newContent.source}
                    onChange={e => setNewContent(prev => ({ ...prev, source: e.target.value }))}
                    placeholder="https://api.example.com/data"
                  />
                  <Button variant="outline" onClick={handleFetchApi}>
                    Fetch
                  </Button>
                </div>
              </div>
            )}

            {/* Preview */}
            {newContent.content && (
              <div>
                <label className="text-sm font-medium">Preview</label>
                <div className="mt-1 p-3 bg-muted rounded-lg max-h-32 overflow-y-auto">
                  <pre className="text-xs whitespace-pre-wrap">
                    {newContent.content.slice(0, 500)}
                    {newContent.content.length > 500 && '...'}
                  </pre>
                </div>
              </div>
            )}

            {/* Hidden toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newContent.isHidden}
                onChange={e => setNewContent(prev => ({ ...prev, isHidden: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm">
                Hide from AI (save for later)
              </span>
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddContent} disabled={addingContent}>
              {addingContent && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Content
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
