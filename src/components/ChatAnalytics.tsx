import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BarChart3, MessageSquare, Clock, Zap, TrendingUp, Calendar } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  model?: string;
  rating?: 'up' | 'down';
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  tags?: string[];
}

interface ChatAnalyticsProps {
  chats: ChatSession[];
}

export const ChatAnalytics = ({ chats = [] }: ChatAnalyticsProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const analytics = useMemo(() => {
    const totalChats = chats.length;
    const totalMessages = chats.reduce((sum, chat) => sum + chat.messages.length, 0);
    const userMessages = chats.reduce((sum, chat) => 
      sum + chat.messages.filter(m => m.role === 'user').length, 0);
    const assistantMessages = totalMessages - userMessages;

    // Calculate average messages per chat
    const avgMessagesPerChat = totalChats > 0 ? totalMessages / totalChats : 0;

    // Chat activity over time (last 7 days)
    const today = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const dailyActivity = last7Days.map(date => {
      const chatsOnDate = chats.filter(chat => {
        const createdAt = chat.createdAt instanceof Date ? chat.createdAt : new Date(chat.createdAt);
        return createdAt.toISOString().split('T')[0] === date;
      }).length;
      
      return {
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        chats: chatsOnDate
      };
    });

    // Message length statistics
    const messageLengths = chats.flatMap(chat => 
      chat.messages.map(m => m.content.length)
    );
    const avgMessageLength = messageLengths.length > 0 
      ? messageLengths.reduce((sum, len) => sum + len, 0) / messageLengths.length 
      : 0;

    // Model usage (if available)
    const modelUsage = chats.flatMap(chat => 
      chat.messages.filter(m => m.model).map(m => m.model!)
    );
    const modelStats = modelUsage.reduce((acc, model) => {
      acc[model] = (acc[model] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const modelData = Object.entries(modelStats).map(([model, count]) => ({
      model,
      count,
      percentage: ((count / modelUsage.length) * 100).toFixed(1)
    }));

    // Rating statistics
    const ratings = chats.flatMap(chat => 
      chat.messages.filter(m => m.rating).map(m => m.rating!)
    );
    const upvotes = ratings.filter(r => r === 'up').length;
    const downvotes = ratings.filter(r => r === 'down').length;
    const ratingRatio = ratings.length > 0 ? (upvotes / ratings.length * 100).toFixed(1) : '0';

    // Tag analysis
    const allTags = chats.flatMap(chat => chat.tags || []);
    const tagStats = allTags.reduce((acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topTags = Object.entries(tagStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, count }));

    return {
      totalChats,
      totalMessages,
      userMessages,
      assistantMessages,
      avgMessagesPerChat,
      avgMessageLength,
      dailyActivity,
      modelData,
      upvotes,
      downvotes,
      ratingRatio,
      topTags,
      ratings: ratings.length
    };
  }, [chats]);

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <BarChart3 className="w-4 h-4" />
          Analytics
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Chat Analytics
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Key Metrics */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Chats</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalChats}</div>
              <p className="text-xs text-muted-foreground">
                {analytics.avgMessagesPerChat.toFixed(1)} avg messages/chat
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalMessages}</div>
              <p className="text-xs text-muted-foreground">
                {analytics.userMessages} user, {analytics.assistantMessages} AI
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Message Length</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(analytics.avgMessageLength)}</div>
              <p className="text-xs text-muted-foreground">characters per message</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Positive Rating</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.ratingRatio}%</div>
              <p className="text-xs text-muted-foreground">
                {analytics.upvotes}/{analytics.ratings} ratings
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Activity Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Daily Activity (Last 7 Days)</CardTitle>
              <CardDescription>Number of chats created per day</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={analytics.dailyActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="chats" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Model Usage */}
          {analytics.modelData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Model Usage</CardTitle>
                <CardDescription>AI model distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={analytics.modelData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      dataKey="count"
                      nameKey="model"
                    >
                      {analytics.modelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [`${value} uses`, name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {analytics.modelData.map((item, index) => (
                    <div key={item.model} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span>{item.model}</span>
                      </div>
                      <span>{item.percentage}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top Tags */}
          {analytics.topTags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Popular Tags</CardTitle>
                <CardDescription>Most used chat tags</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.topTags.map((tag, index) => (
                    <div key={tag.tag} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">#{tag.tag}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {tag.count} chats
                        </span>
                      </div>
                      <div className="w-20 bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${(tag.count / analytics.topTags[0].count) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Chats</CardTitle>
              <CardDescription>Your latest conversations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {chats.slice(0, 5).map(chat => (
                  <div key={chat.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <div>
                      <p className="font-medium text-sm">{chat.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {chat.messages.length} messages
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {(chat.createdAt instanceof Date ? chat.createdAt : new Date(chat.createdAt)).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};