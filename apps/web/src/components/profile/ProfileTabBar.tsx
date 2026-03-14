import { cn } from '@babylon/shared';
import { FileText, Search } from 'lucide-react';

interface ProfileTabBarProps {
  tab: 'posts' | 'replies' | 'trades';
  onTabChange: (tab: 'posts' | 'replies' | 'trades') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function ProfileTabBar({
  tab,
  onTabChange,
  searchQuery,
  onSearchChange,
}: ProfileTabBarProps) {
  return (
    <div className="sticky top-[57px] z-10 border-border/5 border-b bg-background/95 backdrop-blur-sm">
      <div className="flex items-center gap-3 px-4 py-2">
        <div className="flex flex-1 gap-2">
          <button
            onClick={() => onTabChange('posts')}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 font-medium text-sm transition-colors',
              tab === 'posts'
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:bg-muted/50'
            )}
          >
            <FileText className="h-4 w-4" />
            Posts
          </button>
          <button
            onClick={() => onTabChange('replies')}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 font-medium text-sm transition-colors',
              tab === 'replies'
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:bg-muted/50'
            )}
          >
            Replies
          </button>
          <button
            onClick={() => onTabChange('trades')}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 font-medium text-sm transition-colors',
              tab === 'trades'
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:bg-muted/50'
            )}
          >
            Trades
          </button>
        </div>
      </div>

      <div className="px-4 pb-2">
        <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search posts..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>
    </div>
  );
}
