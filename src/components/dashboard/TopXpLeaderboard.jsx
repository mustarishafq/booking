import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Trophy, Crown } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import UserAvatar from '@/components/UserAvatar';
import { cn } from '@/lib/utils';

/** Podium crown styles — gold / silver / bronze */
const PODIUM = {
  1: {
    crown: 'w-4 h-4 fill-amber-400 text-amber-500 drop-shadow-[0_1px_4px_rgba(251,191,36,0.55)]',
    wrap: 'bg-gradient-to-b from-amber-400/30 to-amber-600/10 border-amber-400/45 text-amber-600 dark:text-amber-300',
    ring: 'ring-2 ring-amber-400/40',
  },
  2: {
    crown: 'w-3.5 h-3.5 fill-slate-300 text-slate-400 drop-shadow-[0_1px_3px_rgba(148,163,184,0.45)]',
    wrap: 'bg-gradient-to-b from-slate-300/25 to-slate-500/10 border-slate-400/40 text-slate-600 dark:text-slate-300',
    ring: 'ring-2 ring-slate-400/35',
  },
  3: {
    crown: 'w-3.5 h-3.5 fill-orange-600/90 text-orange-700 dark:fill-orange-500 dark:text-orange-400 drop-shadow-[0_1px_3px_rgba(194,65,12,0.4)]',
    wrap: 'bg-gradient-to-b from-orange-600/20 to-orange-800/10 border-orange-700/40 text-orange-800 dark:text-orange-300',
    ring: 'ring-2 ring-orange-600/30',
  },
};

function RankMark({ rank }) {
  const podium = PODIUM[rank];
  if (podium) {
    return (
      <span
        className={cn(
          'w-7 h-7 rounded-lg border flex items-center justify-center shrink-0',
          podium.wrap,
        )}
        aria-label={`Rank ${rank}`}
      >
        <Crown className={podium.crown} />
      </span>
    );
  }

  return (
    <span
      className="w-7 h-7 rounded-lg border bg-muted text-muted-foreground border-border text-xs font-bold tabular-nums flex items-center justify-center shrink-0"
      aria-label={`Rank ${rank}`}
    >
      {rank}
    </span>
  );
}

export default function TopXpLeaderboard({
  users = [],
  currentUserEmail,
  title = 'Top XP',
}) {
  const me = String(currentUserEmail || '').toLowerCase();

  return (
    <Card className="rounded-2xl border border-border h-full flex flex-col">
      <CardHeader className="pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary shrink-0" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col px-4 sm:px-6 pb-4 sm:pb-6">
        {users.length === 0 ? (
          <EmptyState
            icon={Zap}
            title="No XP yet"
            description="Book resources to climb the leaderboard."
            className="py-8 sm:py-10"
          />
        ) : (
          <ol className="space-y-2 sm:space-y-2.5 flex-1">
            {users.map((entry, index) => {
              const rank = index + 1;
              const isMe = me && entry.email === me;
              const podium = PODIUM[rank];
              return (
                <li
                  key={entry.email}
                  className={cn(
                    'flex items-center gap-3 p-2.5 sm:p-3 rounded-lg transition-colors duration-300',
                    isMe ? 'bg-primary/10 ring-1 ring-primary/25' : 'bg-muted/50',
                  )}
                >
                  <RankMark rank={rank} />
                  <span className={cn('relative shrink-0 rounded-full', podium?.ring)}>
                    <UserAvatar
                      name={entry.name}
                      email={entry.email}
                      avatarUrl={entry.avatar_url}
                      size="sm"
                    />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {entry.name || entry.email}
                      {isMe ? (
                        <span className="ml-1.5 text-xs font-normal text-primary">You</span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      Level {entry.level}
                      {' · '}
                      {entry.bookingCount} booking{entry.bookingCount === 1 ? '' : 's'}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="gap-1 shrink-0 pointer-events-none tabular-nums"
                    title={`${entry.exp} XP · Level ${entry.level}`}
                  >
                    <Zap className="w-3 h-3 fill-amber-400 text-amber-500" />
                    {entry.exp}
                  </Badge>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
