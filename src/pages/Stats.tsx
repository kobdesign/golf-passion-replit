import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Info, ChevronRight } from "lucide-react";
import MobileNav from "@/components/MobileNav";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis } from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";

const Stats = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("stats");
  const isMobile = useIsMobile();

  // Mock data based on the reference images
  const grossScoreData = [
    { name: "Birdie or better", value: 8, color: "hsl(221 83% 53%)" },
    { name: "Par", value: 30, color: "hsl(200 80% 60%)" },
    { name: "Bogey", value: 28, color: "hsl(142 76% 60%)" },
    { name: "Double or Worse", value: 34, color: "hsl(85 70% 60%)" },
  ];

  const distributionData = [
    { name: "Birdie", value: 8, color: "hsl(221 83% 53%)" },
    { name: "Par", value: 52, color: "hsl(200 80% 60%)" },
    { name: "Bogey", value: 30, color: "hsl(142 76% 60%)" },
    { name: "Double", value: 35, color: "hsl(85 70% 60%)" },
  ];

  const parStats = {
    par3: 4.3,
    par4: 4.9,
    par5: 5.3,
  };

  const totalScore = grossScoreData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-muted/20 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(courseId ? `/courses/${courseId}/round-summary` : "/")}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === "stats" ? "default" : "outline"}
            onClick={() => setActiveTab("stats")}
            className="flex-1"
          >
            Stats
          </Button>
          <Button
            variant={activeTab === "benchmarks" ? "default" : "outline"}
            onClick={() => setActiveTab("benchmarks")}
            className="flex-1"
          >
            Benchmarks
          </Button>
        </div>

        {activeTab === "stats" && (
          <div className="space-y-4">
            {/* Gross Score & Distribution */}
            <Card className={isMobile ? "p-3" : "p-4"}>
              <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-2 gap-6'}`}>
                {/* Gross Score */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className={`font-bold ${isMobile ? 'text-sm' : 'text-base'}`}>Gross Score</h3>
                    <Info className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Top 12% at this course
                  </p>
                  <div className="relative">
                    <ResponsiveContainer width="100%" height={isMobile ? 120 : 140}>
                      <PieChart>
                        <Pie
                          data={grossScoreData}
                          cx="50%"
                          cy="50%"
                          innerRadius={isMobile ? 35 : 45}
                          outerRadius={isMobile ? 55 : 65}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {grossScoreData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`font-bold ${isMobile ? 'text-2xl' : 'text-3xl'}`}>87</span>
                    </div>
                  </div>
                </div>

                {/* Distribution */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className={`font-bold ${isMobile ? 'text-sm' : 'text-base'}`}>Distribution</h3>
                    <Info className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Top 7% at this course
                  </p>
                  <ResponsiveContainer width="100%" height={isMobile ? 120 : 140}>
                    <BarChart data={distributionData}>
                      <XAxis hide />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {distributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Legend */}
              <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-4'} gap-2 mt-4 text-xs`}>
                {grossScoreData.map((item, index) => (
                  <div key={index} className="flex items-center gap-1">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-muted-foreground truncate">{item.name}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Par Stats */}
            <Card className={isMobile ? "p-3" : "p-4"}>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="flex items-center gap-1 mb-2">
                    <span className={`font-bold ${isMobile ? 'text-sm' : 'text-base'}`}>Par 3</span>
                    <Info className="h-3 w-3 text-primary" />
                  </div>
                  <div className={`font-bold ${isMobile ? 'text-2xl' : 'text-3xl'}`}>{parStats.par3}</div>
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-2">
                    <span className={`font-bold ${isMobile ? 'text-sm' : 'text-base'}`}>Par 4</span>
                    <Info className="h-3 w-3 text-primary" />
                  </div>
                  <div className={`font-bold ${isMobile ? 'text-2xl' : 'text-3xl'}`}>{parStats.par4}</div>
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-2">
                    <span className={`font-bold ${isMobile ? 'text-sm' : 'text-base'}`}>Par 5</span>
                    <Info className="h-3 w-3 text-primary" />
                  </div>
                  <div className={`font-bold ${isMobile ? 'text-2xl' : 'text-3xl'}`}>{parStats.par5}</div>
                </div>
              </div>
            </Card>

            {/* Fairways & Greens */}
            <Card className={isMobile ? "p-3" : "p-4"}>
              <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-2 gap-6'}`}>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className={`font-bold ${isMobile ? 'text-sm' : 'text-base'}`}>Fairways Hit</h3>
                    <Info className="h-3 w-3 text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    60th percentile at this course
                  </p>
                  <CircularProgress percentage={42.9} label="%(6)" isMobile={isMobile} />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className={`font-bold ${isMobile ? 'text-sm' : 'text-base'}`}>Greens in Regulation</h3>
                    <Info className="h-3 w-3 text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Top 25% at this course
                  </p>
                  <CircularProgress percentage={44.4} label="%(8)" isMobile={isMobile} />
                </div>
              </div>
            </Card>

            {/* Avg 1st Putt */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base">Avg 1st Putt (Ft)</h3>
                  <Info className="h-4 w-4 text-primary" />
                </div>
                <span className="text-2xl font-bold">-</span>
              </div>
              <div className="relative h-8 bg-muted rounded-full">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 text-xs text-muted-foreground px-2">
                  0
                </div>
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  25
                </div>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 text-xs text-muted-foreground px-2">
                  50
                </div>
              </div>
            </Card>

            {/* Avg Approach */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base">Avg Approach (Yds)</h3>
                  <Info className="h-4 w-4 text-primary" />
                </div>
                <span className="text-2xl font-bold">-</span>
              </div>
              <div className="relative h-8 bg-muted rounded-full">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 text-xs text-muted-foreground px-2">
                  50
                </div>
                <div className="absolute left-1/3 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  100
                </div>
                <div className="absolute left-2/3 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  150
                </div>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 text-xs text-muted-foreground px-2">
                  200
                </div>
              </div>
            </Card>

            {/* Putting Stats */}
            <Card className={isMobile ? "p-3" : "p-4"}>
              <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-2 gap-4'}`}>
                <div className={`bg-muted/30 rounded-lg ${isMobile ? 'p-3' : 'p-4'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-bold text-sm">Total Putts</h3>
                    <Info className="h-3 w-3 text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Top 9% at this course
                  </p>
                  <div className={`font-bold ${isMobile ? 'text-3xl' : 'text-4xl'}`}>34</div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-sm">Putts Per Hole</h3>
                      <Info className="h-3 w-3 text-primary" />
                    </div>
                    <div className={`font-bold ${isMobile ? 'text-2xl' : 'text-3xl'}`}>1.9</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-sm"># of ≥ 3 Putts</h3>
                      <Info className="h-3 w-3 text-primary" />
                    </div>
                    <div className={`font-bold ${isMobile ? 'text-2xl' : 'text-3xl'}`}>2</div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Sand Saves & Up & Down */}
            <Card className={isMobile ? "p-3" : "p-4"}>
              <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-2 gap-6'}`}>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className={`font-bold ${isMobile ? 'text-sm' : 'text-base'}`}>Sand Saves</h3>
                    <Info className="h-3 w-3 text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Top 17% at this course
                  </p>
                  <CircularProgress percentage={0} label="%" isMobile={isMobile} />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className={`font-bold ${isMobile ? 'text-sm' : 'text-base'}`}>Up & Down</h3>
                    <Info className="h-3 w-3 text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    62nd percentile at this course
                  </p>
                  <CircularProgress percentage={22.2} label="%" isMobile={isMobile} />
                </div>
              </div>
            </Card>

            {/* Penalties */}
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base">Penalties</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">4</span>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === "benchmarks" && (
          <div className="space-y-4">
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Benchmarks data coming soon</p>
            </Card>
          </div>
        )}
      </div>

      <MobileNav />
    </div>
  );
};

const CircularProgress = ({ 
  percentage, 
  label, 
  isMobile 
}: { 
  percentage: number; 
  label: string;
  isMobile?: boolean;
}) => {
  const size = isMobile ? 100 : 120;
  const radius = isMobile ? 40 : 50;
  const strokeWidth = isMobile ? 8 : 10;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex items-center justify-center">
      <div className="relative">
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke="hsl(200 80% 60%)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-bold ${isMobile ? 'text-xl' : 'text-2xl'}`}>{percentage}{label}</span>
        </div>
      </div>
    </div>
  );
};

export default Stats;
