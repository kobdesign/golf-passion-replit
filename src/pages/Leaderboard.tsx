import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, Crown, Medal, Trophy, UserCheck } from "lucide-react";
import MobileNav from "@/components/MobileNav";
import { calculateVsPar } from "@/lib/courseUtils";

interface LeaderboardEntry {
  id: string;
  rank: number;
  name: string;
  avatar?: string;
  score: number;
  toPar: number;
  isFriend?: boolean;
  isCurrentUser?: boolean;
}

const mockLeaderboardData: Record<string, LeaderboardEntry[]> = {
  allTimeGross: [
    { id: "1", rank: 1, name: "Satachai W.", score: 74, toPar: 2, isFriend: false, isCurrentUser: false },
    { id: "2", rank: 2, name: "Phantira R.", score: 76, toPar: 4, isFriend: true, isCurrentUser: false },
    { id: "3", rank: 2, name: "Mond P.", score: 76, toPar: 4, isFriend: true, isCurrentUser: false },
    { id: "4", rank: 4, name: "Tanest L.", score: 77, toPar: 5, isFriend: false, isCurrentUser: false },
    { id: "5", rank: 5, name: "Justin M.", score: 78, toPar: 6, isFriend: true, isCurrentUser: false },
    { id: "6", rank: 6, name: "You", score: 79, toPar: 7, isFriend: false, isCurrentUser: true },
    { id: "7", rank: 7, name: "Alex T.", score: 80, toPar: 8, isFriend: false, isCurrentUser: false },
    { id: "8", rank: 8, name: "Emma S.", score: 81, toPar: 9, isFriend: true, isCurrentUser: false },
  ],
  monthGross: [
    { id: "1", rank: 1, name: "Phantira R.", score: 76, toPar: 4, isFriend: true, isCurrentUser: false },
    { id: "2", rank: 2, name: "Satachai W.", score: 77, toPar: 5, isFriend: false, isCurrentUser: false },
    { id: "3", rank: 3, name: "You", score: 79, toPar: 7, isFriend: false, isCurrentUser: true },
    { id: "4", rank: 4, name: "Mond P.", score: 80, toPar: 8, isFriend: true, isCurrentUser: false },
    { id: "5", rank: 5, name: "Justin M.", score: 81, toPar: 9, isFriend: true, isCurrentUser: false },
  ],
  allTimeBirdies: [
    { id: "1", rank: 1, name: "Satachai W.", score: 12, toPar: 0, isFriend: false, isCurrentUser: false },
    { id: "2", rank: 2, name: "Tanest L.", score: 10, toPar: 0, isFriend: false, isCurrentUser: false },
    { id: "3", rank: 3, name: "Mond P.", score: 9, toPar: 0, isFriend: true, isCurrentUser: false },
    { id: "4", rank: 4, name: "You", score: 8, toPar: 0, isFriend: false, isCurrentUser: true },
    { id: "5", rank: 5, name: "Phantira R.", score: 7, toPar: 0, isFriend: true, isCurrentUser: false },
  ],
  monthBirdies: [
    { id: "1", rank: 1, name: "Tanest L.", score: 5, toPar: 0, isFriend: false, isCurrentUser: false },
    { id: "2", rank: 2, name: "Satachai W.", score: 4, toPar: 0, isFriend: false, isCurrentUser: false },
    { id: "3", rank: 3, name: "You", score: 3, toPar: 0, isFriend: false, isCurrentUser: true },
    { id: "4", rank: 4, name: "Mond P.", score: 2, toPar: 0, isFriend: true, isCurrentUser: false },
  ],
};

const Leaderboard = () => {
  const { id } = useParams<{ id: string }>();
  const [timeFrame, setTimeFrame] = useState<"allTime" | "month">("allTime");
  const [type, setType] = useState<"gross" | "birdies">("gross");

  const getLeaderboardData = () => {
    const key = `${timeFrame}${type.charAt(0).toUpperCase() + type.slice(1)}` as keyof typeof mockLeaderboardData;
    return mockLeaderboardData[key] || [];
  };

  const data = getLeaderboardData();
  const currentUserEntry = data.find(entry => entry.isCurrentUser);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
    return null;
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Badge className="bg-yellow-500 text-white font-bold">1</Badge>;
    if (rank === 2 || rank === 3) return <Badge className="bg-muted text-muted-foreground font-bold">T{rank}</Badge>;
    return <span className="text-lg font-bold text-muted-foreground">{rank}</span>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-primary/5 to-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to={`/courses/${id}`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">Leaderboards</h1>
              <p className="text-sm text-muted-foreground">Bangkok Golf Resort and Spa</p>
            </div>
            <Trophy className="h-6 w-6 text-primary" />
          </div>
        </div>
      </div>

      <div className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Filters */}
        <Tabs value={timeFrame} onValueChange={(v) => setTimeFrame(v as "allTime" | "month")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="allTime">All-Time</TabsTrigger>
            <TabsTrigger value="month">This Month</TabsTrigger>
          </TabsList>
        </Tabs>

        <Tabs value={type} onValueChange={(v) => setType(v as "gross" | "birdies")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="gross">Best Gross</TabsTrigger>
            <TabsTrigger value="birdies">Most Birdies</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Current User Position (if not in top visible) */}
        {currentUserEntry && currentUserEntry.rank > 5 && (
          <Card className="border-2 border-primary shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-center min-w-[40px]">
                    <span className="text-lg font-bold text-primary">{currentUserEntry.rank}</span>
                  </div>
                  <Avatar className="h-12 w-12 border-2 border-primary">
                    <AvatarFallback className="bg-primary text-primary-foreground">You</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">Your Position</p>
                    <p className="text-sm text-muted-foreground">{currentUserEntry.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">
                    {type === "birdies" ? currentUserEntry.score : calculateVsPar(currentUserEntry.score, 72)}
                  </p>
                  {type === "gross" && (
                    <p className="text-sm text-muted-foreground">({currentUserEntry.score})</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Leaderboard List */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-0">
            {data.map((entry, index) => (
              <div
                key={entry.id}
                className={`flex items-center justify-between p-4 ${
                  index !== data.length - 1 ? "border-b" : ""
                } ${
                  entry.isCurrentUser
                    ? "bg-primary/10 border-l-4 border-l-primary"
                    : "hover:bg-accent/5"
                } transition-colors`}
              >
                <div className="flex items-center gap-4 flex-1">
                  {/* Rank */}
                  <div className="text-center min-w-[50px] flex items-center justify-center gap-2">
                    {entry.rank <= 3 && getRankIcon(entry.rank)}
                    {getRankBadge(entry.rank)}
                  </div>

                  {/* Avatar */}
                  <Avatar className="h-12 w-12">
                    {entry.avatar ? (
                      <AvatarImage src={entry.avatar} alt={entry.name} />
                    ) : (
                      <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
                        {entry.name.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    )}
                  </Avatar>

                  {/* Name */}
                  <div className="flex items-center gap-2 flex-1">
                    <p className={`font-semibold ${entry.isCurrentUser ? "text-primary" : ""}`}>
                      {entry.name}
                    </p>
                    {entry.isFriend && (
                      <UserCheck className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </div>

                {/* Score */}
                <div className="text-right">
                  <p className="text-2xl font-bold">
                    {type === "birdies" 
                      ? entry.score 
                      : calculateVsPar(entry.score, 72)
                    }
                  </p>
                  {type === "gross" && (
                    <p className="text-sm text-muted-foreground">({entry.score})</p>
                  )}
                  {type === "birdies" && (
                    <p className="text-sm text-muted-foreground">birdies</p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Legend */}
        <Card className="border-0 bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-primary" />
                <span>Friend</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-primary rounded" />
                <span>You</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <MobileNav />
    </div>
  );
};

export default Leaderboard;
