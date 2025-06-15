import { supabase } from '../lib/supabase';

export interface AnalyticsMetric {
  id: string
  profile_id: string
  metric_name: string
  metric_type: 'count' | 'sum' | 'average' | 'percentage' | 'ratio'
  value: number
  period: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year'
  period_start: string
  period_end: string
  dimensions?: Record<string, any>
  created_at: string
}

export interface KPITarget {
  id: string
  profile_id: string
  kpi_name: string
  target_value: number
  current_value: number
  target_period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  status: 'on_track' | 'at_risk' | 'behind' | 'exceeded'
  created_at: string
  updated_at: string
}

export interface CustomReport {
  id: string
  profile_id: string
  report_name: string
  description: string
  report_type: 'dashboard' | 'scheduled' | 'ad_hoc'
  configuration: {
    metrics: string[]
    filters: Record<string, any>
    groupBy: string[]
    timeRange: {
      start: string
      end: string
      period: string
    }
    visualizations: Array<{
      type: 'line' | 'bar' | 'pie' | 'table' | 'metric'
      metric: string
      title: string
    }>
  }
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly'
    time: string
    recipients: string[]
  }
  created_at: string
  updated_at: string
}

export interface PredictiveInsight {
  id: string
  profile_id: string
  insight_type: 'trend' | 'anomaly' | 'forecast' | 'recommendation'
  title: string
  description: string
  confidence_score: number
  impact_level: 'low' | 'medium' | 'high'
  metric_affected: string
  predicted_value?: number
  time_horizon?: string
  action_items: string[]
  created_at: string
}

export interface BenchmarkData {
  metric_name: string
  industry_average: number
  top_quartile: number
  user_value: number
  percentile: number
}

export class BusinessIntelligenceService {
  // Core Analytics Methods
  static async getCallAnalytics(profileId: string, timeRange: { start: string; end: string }): Promise<{
    totalCalls: number
    successfulCalls: number
    averageDuration: number
    conversionRate: number
    hourlyDistribution: Array<{ hour: number; calls: number }>
    outcomeBreakdown: Array<{ outcome: string; count: number; percentage: number }>
  }> {
    try {
      const { data: callLogs, error } = await supabase
        .from('call_logs')
        .select('*')
        .eq('profile_id', profileId)
        .gte('created_at', timeRange.start)
        .lte('created_at', timeRange.end);

      if (error) {
        console.error('Error fetching call analytics:', error);
        return this.getEmptyCallAnalytics();
      }

      const totalCalls = callLogs?.length || 0;
      const successfulCalls = callLogs?.filter(call => 
        call.outcome === 'completed' || call.outcome === 'converted'
      ).length || 0;

      const totalDuration = callLogs?.reduce((sum, call) => sum + (call.duration_seconds || 0), 0) || 0;
      const averageDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;

      const conversions = callLogs?.filter(call => call.outcome === 'converted').length || 0;
      const conversionRate = totalCalls > 0 ? Math.round((conversions / totalCalls) * 100) : 0;

      // Hourly distribution
      const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        calls: callLogs?.filter(call => {
          const callHour = new Date(call.created_at).getHours();
          return callHour === hour;
        }).length || 0
      }));

      // Outcome breakdown
      const outcomeMap = new Map<string, number>();
      callLogs?.forEach(call => {
        const outcome = call.outcome || 'unknown';
        outcomeMap.set(outcome, (outcomeMap.get(outcome) || 0) + 1);
      });

      const outcomeBreakdown = Array.from(outcomeMap.entries()).map(([outcome, count]) => ({
        outcome,
        count,
        percentage: totalCalls > 0 ? Math.round((count / totalCalls) * 100) : 0
      }));

      return {
        totalCalls,
        successfulCalls,
        averageDuration,
        conversionRate,
        hourlyDistribution,
        outcomeBreakdown
      };
    } catch (error) {
      console.error('Error calculating call analytics:', error);
      return this.getEmptyCallAnalytics();
    }
  }

  private static getEmptyCallAnalytics() {
    return {
      totalCalls: 0,
      successfulCalls: 0,
      averageDuration: 0,
      conversionRate: 0,
      hourlyDistribution: Array.from({ length: 24 }, (_, hour) => ({ hour, calls: 0 })),
      outcomeBreakdown: []
    };
  }

  static async getCampaignAnalytics(profileId: string, campaignId?: string): Promise<{
    totalCampaigns: number
    activeCampaigns: number
    totalLeads: number
    contactedLeads: number
    convertedLeads: number
    averageConversionRate: number
    campaignPerformance: Array<{
      campaign_id: string
      campaign_name: string
      total_leads: number
      contacted: number
      converted: number
      conversion_rate: number
      status: string
    }>
  }> {
    try {
      // Get campaigns
      let campaignQuery = supabase
        .from('campaigns')
        .select('*')
        .eq('profile_id', profileId);

      if (campaignId) {
        campaignQuery = campaignQuery.eq('id', campaignId);
      }

      const { data: campaigns } = await campaignQuery;

      // Get leads
      let leadsQuery = supabase
        .from('campaign_leads')
        .select('*')
        .eq('profile_id', profileId);

      if (campaignId) {
        leadsQuery = leadsQuery.eq('campaign_id', campaignId);
      }

      const { data: leads } = await leadsQuery;

      const totalCampaigns = campaigns?.length || 0;
      const activeCampaigns = campaigns?.filter(c => c.status === 'active').length || 0;
      const totalLeads = leads?.length || 0;
      const contactedLeads = leads?.filter(l => l.status !== 'new').length || 0;
      const convertedLeads = leads?.filter(l => l.status === 'converted').length || 0;
      const averageConversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

      // Campaign performance
      const campaignPerformance = campaigns?.map(campaign => {
        const campaignLeads = leads?.filter(l => l.campaign_id === campaign.id) || [];
        const contacted = campaignLeads.filter(l => l.status !== 'new').length;
        const converted = campaignLeads.filter(l => l.status === 'converted').length;
        const conversionRate = campaignLeads.length > 0 ? Math.round((converted / campaignLeads.length) * 100) : 0;

        return {
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          total_leads: campaignLeads.length,
          contacted,
          converted,
          conversion_rate: conversionRate,
          status: campaign.status
        };
      }) || [];

      return {
        totalCampaigns,
        activeCampaigns,
        totalLeads,
        contactedLeads,
        convertedLeads,
        averageConversionRate,
        campaignPerformance
      };
    } catch (error) {
      console.error('Error calculating campaign analytics:', error);
      return {
        totalCampaigns: 0,
        activeCampaigns: 0,
        totalLeads: 0,
        contactedLeads: 0,
        convertedLeads: 0,
        averageConversionRate: 0,
        campaignPerformance: []
      };
    }
  }

  static async getAgentPerformance(profileId: string): Promise<{
    totalAgents: number
    activeAgents: number
    averageCallsPerAgent: number
    topPerformingAgent: string
    agentMetrics: Array<{
      agent_id: string
      agent_name: string
      total_calls: number
      successful_calls: number
      average_duration: number
      conversion_rate: number
      efficiency_score: number
    }>
  }> {
    try {
      // Get agents
      const { data: agents } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('profile_id', profileId);

      // Get call logs with agent information
      const { data: callLogs } = await supabase
        .from('call_logs')
        .select('*')
        .eq('profile_id', profileId)
        .not('agent_id', 'is', null);

      const totalAgents = agents?.length || 0;
      const activeAgents = agents?.filter(a => a.status === 'active').length || 0;
      const totalCalls = callLogs?.length || 0;
      const averageCallsPerAgent = activeAgents > 0 ? Math.round(totalCalls / activeAgents) : 0;

      // Calculate agent metrics
      const agentMetrics = agents?.map(agent => {
        const agentCalls = callLogs?.filter(call => call.agent_id === agent.id) || [];
        const successfulCalls = agentCalls.filter(call => 
          call.outcome === 'completed' || call.outcome === 'converted'
        ).length;
        const conversions = agentCalls.filter(call => call.outcome === 'converted').length;
        const totalDuration = agentCalls.reduce((sum, call) => sum + (call.duration_seconds || 0), 0);
        const averageDuration = agentCalls.length > 0 ? Math.round(totalDuration / agentCalls.length) : 0;
        const conversionRate = agentCalls.length > 0 ? Math.round((conversions / agentCalls.length) * 100) : 0;
        
        // Calculate efficiency score (weighted combination of metrics)
        const efficiencyScore = Math.round(
          (conversionRate * 0.4) + 
          ((successfulCalls / Math.max(agentCalls.length, 1)) * 100 * 0.3) +
          (Math.min(averageDuration / 300, 1) * 100 * 0.3) // Normalize duration to 5 minutes
        );

        return {
          agent_id: agent.id,
          agent_name: agent.name,
          total_calls: agentCalls.length,
          successful_calls: successfulCalls,
          average_duration: averageDuration,
          conversion_rate: conversionRate,
          efficiency_score: efficiencyScore
        };
      }) || [];

      // Find top performing agent
      const topAgent = agentMetrics.reduce((top, current) => 
        current.efficiency_score > top.efficiency_score ? current : top,
        agentMetrics[0] || { agent_name: 'N/A', efficiency_score: 0 }
      );

      return {
        totalAgents,
        activeAgents,
        averageCallsPerAgent,
        topPerformingAgent: topAgent.agent_name,
        agentMetrics
      };
    } catch (error) {
      console.error('Error calculating agent performance:', error);
      return {
        totalAgents: 0,
        activeAgents: 0,
        averageCallsPerAgent: 0,
        topPerformingAgent: 'N/A',
        agentMetrics: []
      };
    }
  }

  // KPI Management
  static async createKPITarget(target: Omit<KPITarget, 'id' | 'created_at' | 'updated_at'>): Promise<KPITarget | null> {
    try {
      const { data, error } = await supabase
        .from('kpi_targets')
        .insert({
          ...target,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating KPI target:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error creating KPI target:', error);
      return null;
    }
  }

  static async getKPITargets(profileId: string): Promise<KPITarget[]> {
    try {
      const { data, error } = await supabase
        .from('kpi_targets')
        .select('*')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching KPI targets:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching KPI targets:', error);
      return [];
    }
  }

  static async updateKPIProgress(profileId: string): Promise<void> {
    try {
      const targets = await this.getKPITargets(profileId);
      
      for (const target of targets) {
        let currentValue = 0;
        let status: KPITarget['status'] = 'on_track';

        // Calculate current value based on KPI type
        switch (target.kpi_name) {
          case 'conversion_rate':
            const conversionData = await this.getCallAnalytics(profileId, {
              start: this.getPeriodStart(target.target_period),
              end: new Date().toISOString()
            });
            currentValue = conversionData.conversionRate;
            break;
          
          case 'total_calls':
            const callData = await this.getCallAnalytics(profileId, {
              start: this.getPeriodStart(target.target_period),
              end: new Date().toISOString()
            });
            currentValue = callData.totalCalls;
            break;
          
          case 'average_duration':
            const durationData = await this.getCallAnalytics(profileId, {
              start: this.getPeriodStart(target.target_period),
              end: new Date().toISOString()
            });
            currentValue = durationData.averageDuration;
            break;
        }

        // Determine status
        const progress = currentValue / target.target_value;
        if (progress >= 1) {
          status = 'exceeded';
        } else if (progress >= 0.8) {
          status = 'on_track';
        } else if (progress >= 0.6) {
          status = 'at_risk';
        } else {
          status = 'behind';
        }

        // Update KPI
        await supabase
          .from('kpi_targets')
          .update({
            current_value: currentValue,
            status,
            updated_at: new Date().toISOString()
          })
          .eq('id', target.id);
      }
    } catch (error) {
      console.error('Error updating KPI progress:', error);
    }
  }

  private static getPeriodStart(period: string): string {
    const now = new Date();
    switch (period) {
      case 'daily':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      case 'weekly':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        return weekStart.toISOString();
      case 'monthly':
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      case 'quarterly':
        const quarter = Math.floor(now.getMonth() / 3);
        return new Date(now.getFullYear(), quarter * 3, 1).toISOString();
      case 'yearly':
        return new Date(now.getFullYear(), 0, 1).toISOString();
      default:
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    }
  }

  // Predictive Analytics
  static async generatePredictiveInsights(profileId: string): Promise<PredictiveInsight[]> {
    try {
      const insights: Omit<PredictiveInsight, 'id' | 'created_at'>[] = [];

      // Get historical data for trends
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const callAnalytics = await this.getCallAnalytics(profileId, {
        start: thirtyDaysAgo.toISOString(),
        end: new Date().toISOString()
      });

      // Trend analysis
      if (callAnalytics.totalCalls > 0) {
        const recentWeekCalls = await this.getCallAnalytics(profileId, {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString()
        });

        const previousWeekCalls = await this.getCallAnalytics(profileId, {
          start: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        });

        const callTrend = recentWeekCalls.totalCalls - previousWeekCalls.totalCalls;
        if (Math.abs(callTrend) > previousWeekCalls.totalCalls * 0.2) {
          insights.push({
            profile_id: profileId,
            insight_type: 'trend',
            title: callTrend > 0 ? 'Increasing Call Volume' : 'Decreasing Call Volume',
            description: `Call volume has ${callTrend > 0 ? 'increased' : 'decreased'} by ${Math.abs(callTrend)} calls (${Math.round(Math.abs(callTrend) / Math.max(previousWeekCalls.totalCalls, 1) * 100)}%) compared to last week.`,
            confidence_score: 0.8,
            impact_level: Math.abs(callTrend) > previousWeekCalls.totalCalls * 0.5 ? 'high' : 'medium',
            metric_affected: 'total_calls',
            predicted_value: recentWeekCalls.totalCalls + callTrend,
            time_horizon: 'next_week',
            action_items: callTrend > 0 
              ? ['Consider scaling up agent capacity', 'Review campaign effectiveness']
              : ['Investigate causes of decline', 'Optimize campaign targeting']
          });
        }

        // Conversion rate insights
        const conversionTrend = recentWeekCalls.conversionRate - previousWeekCalls.conversionRate;
        if (Math.abs(conversionTrend) > 5) {
          insights.push({
            profile_id: profileId,
            insight_type: 'trend',
            title: conversionTrend > 0 ? 'Improving Conversion Rate' : 'Declining Conversion Rate',
            description: `Conversion rate has ${conversionTrend > 0 ? 'improved' : 'declined'} by ${Math.abs(conversionTrend).toFixed(1)}% compared to last week.`,
            confidence_score: 0.75,
            impact_level: Math.abs(conversionTrend) > 10 ? 'high' : 'medium',
            metric_affected: 'conversion_rate',
            predicted_value: recentWeekCalls.conversionRate + conversionTrend,
            time_horizon: 'next_week',
            action_items: conversionTrend > 0
              ? ['Analyze successful strategies', 'Scale winning approaches']
              : ['Review agent scripts', 'Analyze failed calls', 'Improve targeting']
          });
        }
      }

      // Anomaly detection
      const avgDuration = callAnalytics.averageDuration;
      if (avgDuration > 600) { // More than 10 minutes
        insights.push({
          profile_id: profileId,
          insight_type: 'anomaly',
          title: 'Unusually Long Call Duration',
          description: `Average call duration (${Math.round(avgDuration / 60)} minutes) is significantly higher than typical range.`,
          confidence_score: 0.9,
          impact_level: 'medium',
          metric_affected: 'average_duration',
          action_items: ['Review agent efficiency', 'Optimize call scripts', 'Provide additional training']
        });
      }

      // Save insights to database
      if (insights.length > 0) {
        const { data } = await supabase
          .from('predictive_insights')
          .insert(insights)
          .select();

        return data || [];
      }

      return [];
    } catch (error) {
      console.error('Error generating predictive insights:', error);
      return [];
    }
  }

  static async getPredictiveInsights(profileId: string, limit = 10): Promise<PredictiveInsight[]> {
    try {
      const { data, error } = await supabase
        .from('predictive_insights')
        .select('*')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching predictive insights:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching predictive insights:', error);
      return [];
    }
  }

  // Benchmarking
  static async getBenchmarkData(profileId: string): Promise<BenchmarkData[]> {
    try {
      // Get user's current metrics
      const callAnalytics = await this.getCallAnalytics(profileId, {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString()
      });

      // Industry benchmarks (these would typically come from a benchmarking service)
      const benchmarks: BenchmarkData[] = [
        {
          metric_name: 'conversion_rate',
          industry_average: 15,
          top_quartile: 25,
          user_value: callAnalytics.conversionRate,
          percentile: this.calculatePercentile(callAnalytics.conversionRate, 15, 25)
        },
        {
          metric_name: 'average_duration',
          industry_average: 180, // 3 minutes
          top_quartile: 240, // 4 minutes
          user_value: callAnalytics.averageDuration,
          percentile: this.calculatePercentile(callAnalytics.averageDuration, 180, 240)
        },
        {
          metric_name: 'success_rate',
          industry_average: 60,
          top_quartile: 80,
          user_value: callAnalytics.totalCalls > 0 ? Math.round((callAnalytics.successfulCalls / callAnalytics.totalCalls) * 100) : 0,
          percentile: this.calculatePercentile(
            callAnalytics.totalCalls > 0 ? (callAnalytics.successfulCalls / callAnalytics.totalCalls) * 100 : 0,
            60,
            80
          )
        }
      ];

      return benchmarks;
    } catch (error) {
      console.error('Error fetching benchmark data:', error);
      return [];
    }
  }

  private static calculatePercentile(userValue: number, average: number, topQuartile: number): number {
    if (userValue >= topQuartile) return 90;
    if (userValue >= average) return 50 + ((userValue - average) / (topQuartile - average)) * 40;
    return (userValue / average) * 50;
  }

  // Custom Reports
  static async createCustomReport(report: Omit<CustomReport, 'id' | 'created_at' | 'updated_at'>): Promise<CustomReport | null> {
    try {
      const { data, error } = await supabase
        .from('custom_reports')
        .insert({
          ...report,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating custom report:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error creating custom report:', error);
      return null;
    }
  }

  static async getCustomReports(profileId: string): Promise<CustomReport[]> {
    try {
      const { data, error } = await supabase
        .from('custom_reports')
        .select('*')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching custom reports:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching custom reports:', error);
      return [];
    }
  }

  static async generateReportData(reportId: string): Promise<any> {
    try {
      const { data: report, error } = await supabase
        .from('custom_reports')
        .select('*')
        .eq('id', reportId)
        .single();

      if (error || !report) {
        console.error('Error fetching report configuration:', error);
        return null;
      }

      const { configuration } = report;
      const reportData: any = {};

      // Generate data based on configuration
      for (const metric of configuration.metrics) {
        switch (metric) {
          case 'call_analytics':
            reportData.call_analytics = await this.getCallAnalytics(
              report.profile_id,
              configuration.timeRange
            );
            break;
          case 'campaign_analytics':
            reportData.campaign_analytics = await this.getCampaignAnalytics(report.profile_id);
            break;
          case 'agent_performance':
            reportData.agent_performance = await this.getAgentPerformance(report.profile_id);
            break;
        }
      }

      return {
        report_id: reportId,
        report_name: report.report_name,
        generated_at: new Date().toISOString(),
        data: reportData
      };
    } catch (error) {
      console.error('Error generating report data:', error);
      return null;
    }
  }

  // Executive Dashboard
  static async getExecutiveDashboard(profileId: string): Promise<{
    kpis: Array<{ name: string; value: number; change: number; status: string }>
    insights: PredictiveInsight[]
    benchmarks: BenchmarkData[]
    alerts: Array<{ type: string; message: string; severity: string }>
  }> {
    try {
      // Get current period metrics
      const currentMetrics = await this.getCallAnalytics(profileId, {
        start: this.getPeriodStart('monthly'),
        end: new Date().toISOString()
      });

      // Get previous period for comparison
      const previousPeriodStart = new Date();
      previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 1);
      const previousMetrics = await this.getCallAnalytics(profileId, {
        start: previousPeriodStart.toISOString(),
        end: this.getPeriodStart('monthly')
      });

      // Calculate KPIs with changes
      const kpis = [
        {
          name: 'Total Calls',
          value: currentMetrics.totalCalls,
          change: currentMetrics.totalCalls - previousMetrics.totalCalls,
          status: currentMetrics.totalCalls > previousMetrics.totalCalls ? 'up' : 'down'
        },
        {
          name: 'Conversion Rate',
          value: currentMetrics.conversionRate,
          change: currentMetrics.conversionRate - previousMetrics.conversionRate,
          status: currentMetrics.conversionRate > previousMetrics.conversionRate ? 'up' : 'down'
        },
        {
          name: 'Avg Duration',
          value: Math.round(currentMetrics.averageDuration / 60), // Convert to minutes
          change: Math.round((currentMetrics.averageDuration - previousMetrics.averageDuration) / 60),
          status: currentMetrics.averageDuration > previousMetrics.averageDuration ? 'up' : 'down'
        }
      ];

      // Get insights and benchmarks
      const insights = await this.getPredictiveInsights(profileId, 5);
      const benchmarks = await this.getBenchmarkData(profileId);

      // Generate alerts
      const alerts = [];
      if (currentMetrics.conversionRate < 10) {
        alerts.push({
          type: 'performance',
          message: 'Conversion rate is below 10% - consider reviewing scripts and targeting',
          severity: 'warning'
        });
      }
      if (currentMetrics.totalCalls < previousMetrics.totalCalls * 0.8) {
        alerts.push({
          type: 'volume',
          message: 'Call volume has decreased by more than 20% compared to last month',
          severity: 'critical'
        });
      }

      return { kpis, insights, benchmarks, alerts };
    } catch (error) {
      console.error('Error generating executive dashboard:', error);
      return { kpis: [], insights: [], benchmarks: [], alerts: [] };
    }
  }
}