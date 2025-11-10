import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, User, BarChart3, Users, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <div className="text-center space-y-8 p-8 max-w-2xl">
        <div className="space-y-4">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Golf Courses
          </h1>
          <p className="text-xl text-muted-foreground">
            Discover and book the best golf courses around the world
          </p>
          {!user && (
            <p className="text-sm text-muted-foreground">
              Please login to access all features
            </p>
          )}
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {user ? (
            <>
              <Link to="/courses">
                <Button size="lg" className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity w-full sm:w-auto">
                  <MapPin className="mr-2 h-5 w-5" />
                  Browse Courses
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              
              <Link to="/social-feed">
                <Button size="lg" variant="outline" className="hover:border-primary hover:text-primary transition-all w-full sm:w-auto">
                  <Users className="mr-2 h-5 w-5" />
                  Social Feed
                </Button>
              </Link>
              
              <Link to="/stats">
                <Button size="lg" variant="outline" className="hover:border-primary hover:text-primary transition-all w-full sm:w-auto">
                  <BarChart3 className="mr-2 h-5 w-5" />
                  View Stats
                </Button>
              </Link>
              
              <Link to="/profile">
                <Button size="lg" variant="outline" className="hover:border-primary hover:text-primary transition-all w-full sm:w-auto">
                  <User className="mr-2 h-5 w-5" />
                  Profile
                </Button>
              </Link>
            </>
          ) : (
            <Link to="/auth">
              <Button size="lg" className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity w-full sm:w-auto">
                <LogIn className="mr-2 h-5 w-5" />
                Login / Sign Up
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
