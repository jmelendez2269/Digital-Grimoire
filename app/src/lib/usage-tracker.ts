import { createClient } from '@/lib/supabase/server';

// Cost constants (update these with your actual pricing)
export const PRICING = {
  // Azure Document Intelligence (per page)
  AZURE_OCR_PER_PAGE: 0.01,
  
  // OpenAI (per 1K tokens)
  OPENAI_INPUT_PER_1K: 0.0025,  // GPT-4o pricing
  OPENAI_OUTPUT_PER_1K: 0.01,   // GPT-4o pricing

  // Notion API (per 1K requests) - Notion API is generally free; track at $0 for visibility
  NOTION_REQUEST_PER_1K: 0,
  
  // Cloudflare R2
  R2_STORAGE_PER_GB_MONTH: 0.015, // $0.015 per GB/month
  R2_CLASS_A_PER_1K: 0.0036,      // Write operations per 1000
  R2_CLASS_B_PER_1K: 0.00036,     // Read operations per 1000
  
  // Supabase (included in plan, but track for future)
  SUPABASE_DATABASE_READS: 0,
  SUPABASE_DATABASE_WRITES: 0,
};

export interface UsageLogParams {
  service: 'azure_ocr' | 'openai_metadata' | 'r2_storage' | 'r2_bandwidth' | 'notion' | 'convergence_query' | 'other';
  endpoint?: string;
  operation: string;
  unitsUsed: number;
  unitType: 'pages' | 'tokens' | 'bytes' | 'requests';
  estimatedCost?: number;
  userId?: string;
  documentId?: string;
  requestMetadata?: Record<string, any>;
  success?: boolean;
  errorMessage?: string;
}

/**
 * Log API usage to the database for tracking and cost analysis
 */
export async function logApiUsage(params: UsageLogParams): Promise<void> {
  try {
    const supabase = await createClient();
    
    // Calculate cost if not provided
    const cost = params.estimatedCost ?? calculateCost(params.service, params.unitsUsed, params.unitType);
    
    const { data, error } = await supabase.from('api_usage').insert({
      service: params.service,
      endpoint: params.endpoint,
      operation: params.operation,
      units_used: params.unitsUsed,
      unit_type: params.unitType,
      estimated_cost: cost,
      user_id: params.userId || null,
      document_id: params.documentId || null,
      request_metadata: params.requestMetadata || {},
      success: params.success !== false,
      error_message: params.errorMessage || null,
    }).select();
    
    if (error) {
      console.error(`[Usage Tracker] Failed to insert usage record for ${params.service}:`, error);
      console.error(`[Usage Tracker] Error details:`, {
        service: params.service,
        operation: params.operation,
        userId: params.userId,
        unitsUsed: params.unitsUsed,
        errorCode: error.code,
        errorMessage: error.message,
      });
    } else {
      console.log(`[Usage Tracker] ✅ Successfully logged ${params.service} - ${params.operation}: ${params.unitsUsed} ${params.unitType}, $${cost.toFixed(4)}`);
      if (data && data.length > 0) {
        console.log(`[Usage Tracker] Inserted record ID: ${data[0].id}`);
      }
    }
  } catch (error) {
    // Don't throw errors from usage tracking - just log them
    console.error('[Usage Tracker] Exception while logging API usage:', error);
    if (error instanceof Error) {
      console.error('[Usage Tracker] Error stack:', error.stack);
    }
  }
}

/**
 * Calculate estimated cost based on service and usage
 */
function calculateCost(
  service: UsageLogParams['service'],
  units: number,
  unitType: UsageLogParams['unitType']
): number {
  switch (service) {
    case 'azure_ocr':
      return units * PRICING.AZURE_OCR_PER_PAGE;
    
    case 'openai_metadata':
      // Assuming mixed input/output, use average
      const avgCostPer1K = (PRICING.OPENAI_INPUT_PER_1K + PRICING.OPENAI_OUTPUT_PER_1K) / 2;
      return (units / 1000) * avgCostPer1K;
    
    case 'notion':
      // Track requests for visibility (free or enterprise-dependent). This is set to $0 by default.
      return (units / 1000) * PRICING.NOTION_REQUEST_PER_1K;
    
    case 'r2_storage':
      if (unitType === 'bytes') {
        // Convert bytes to GB and calculate monthly cost (prorated)
        const gb = units / (1024 * 1024 * 1024);
        return gb * PRICING.R2_STORAGE_PER_GB_MONTH;
      }
      return 0;
    
    case 'r2_bandwidth':
      // R2 egress is free up to certain limits
      return 0;
    
    default:
      return 0;
  }
}

/**
 * Log Azure OCR usage
 */
export async function logOcrUsage(params: {
  pages: number;
  userId?: string;
  documentId?: string;
  success?: boolean;
  errorMessage?: string;
  responseTime?: number;
}) {
  await logApiUsage({
    service: 'azure_ocr',
    operation: 'read_document',
    unitsUsed: params.pages,
    unitType: 'pages',
    userId: params.userId,
    documentId: params.documentId,
    success: params.success,
    errorMessage: params.errorMessage,
    requestMetadata: {
      responseTime: params.responseTime,
    },
  });
}

/**
 * Log OpenAI/Claude metadata extraction usage
 */
export async function logMetadataExtractionUsage(params: {
  inputTokens: number;
  outputTokens: number;
  userId?: string;
  documentId?: string;
  success?: boolean;
  errorMessage?: string;
  model?: string;
}) {
  const totalTokens = params.inputTokens + params.outputTokens;
  
  // Calculate more accurate cost based on input/output ratio
  const inputCost = (params.inputTokens / 1000) * PRICING.OPENAI_INPUT_PER_1K;
  const outputCost = (params.outputTokens / 1000) * PRICING.OPENAI_OUTPUT_PER_1K;
  const totalCost = inputCost + outputCost;
  
  await logApiUsage({
    service: 'openai_metadata',
    operation: 'extract_metadata',
    unitsUsed: totalTokens,
    unitType: 'tokens',
    estimatedCost: totalCost,
    userId: params.userId,
    documentId: params.documentId,
    success: params.success,
    errorMessage: params.errorMessage,
    requestMetadata: {
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      model: params.model || 'gpt-4o',
    },
  });
}

/**
 * Log R2 storage upload
 */
export async function logStorageUpload(params: {
  fileSize: number;
  userId?: string;
  documentId?: string;
  fileName?: string;
  success?: boolean;
  errorMessage?: string;
}) {
  await logApiUsage({
    service: 'r2_storage',
    operation: 'upload',
    unitsUsed: 1,
    unitType: 'requests',
    estimatedCost: PRICING.R2_CLASS_A_PER_1K / 1000, // Cost per single write
    userId: params.userId,
    documentId: params.documentId,
    success: params.success,
    errorMessage: params.errorMessage,
    requestMetadata: {
      fileSize: params.fileSize,
      fileName: params.fileName,
    },
  });
}

/**
 * Log R2 bandwidth usage (downloads)
 */
export async function logBandwidthUsage(params: {
  bytes: number;
  userId?: string;
  documentId?: string;
  operation: 'download' | 'stream';
}) {
  await logApiUsage({
    service: 'r2_bandwidth',
    operation: params.operation,
    unitsUsed: params.bytes,
    unitType: 'bytes',
    estimatedCost: 0, // R2 egress is free
    userId: params.userId,
    documentId: params.documentId,
    requestMetadata: {
      bytes: params.bytes,
    },
  });
}

/**
 * Log Notion API usage
 */
export async function logNotionUsage(params: {
  requests: number;
  operation: string;
  userId?: string;
  endpoint?: string;
  success?: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
}) {
  await logApiUsage({
    service: 'notion',
    operation: params.operation,
    endpoint: params.endpoint,
    unitsUsed: params.requests,
    unitType: 'requests',
    userId: params.userId,
    success: params.success,
    errorMessage: params.errorMessage,
    requestMetadata: params.metadata,
  });
}

/**
 * Log Convergence Machine query usage and costs
 */
export async function logConvergenceQueryUsage(params: {
  inputTokens: number;
  outputTokens: number;
  userId: string;
  queryId?: string;
  queryText?: string;
  lensWeights?: Record<string, number>;
  responseLength?: string;
  success?: boolean;
  errorMessage?: string;
}) {
  const totalTokens = params.inputTokens + params.outputTokens;
  
  // Calculate cost based on GPT-4o pricing
  const inputCost = (params.inputTokens / 1000) * PRICING.OPENAI_INPUT_PER_1K;
  const outputCost = (params.outputTokens / 1000) * PRICING.OPENAI_OUTPUT_PER_1K;
  const totalCost = inputCost + outputCost;
  
  await logApiUsage({
    service: 'convergence_query',
    operation: 'convergence_machine_query',
    endpoint: '/api/convergence/query',
    unitsUsed: totalTokens,
    unitType: 'tokens',
    estimatedCost: totalCost,
    userId: params.userId,
    success: params.success,
    errorMessage: params.errorMessage,
    requestMetadata: {
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      queryId: params.queryId,
      queryText: params.queryText?.substring(0, 200), // First 200 chars for reference
      lensWeights: params.lensWeights,
      responseLength: params.responseLength,
      model: 'gpt-4o',
    },
  });
}

/**
 * Log user activity (uploads, views, searches, etc.)
 */
export async function logUserActivity(
  userId: string,
  activityType: 'upload' | 'view' | 'search' | 'annotation' | 'bookmark',
  count: number = 1
) {
  try {
    const supabase = await createClient();
    
    // Call the database function to update user activity
    await supabase.rpc('update_user_activity', {
      p_user_id: userId,
      p_activity_type: activityType,
      p_count: count,
    });
  } catch (error) {
    console.error('Failed to log user activity:', error);
  }
}

/**
 * Get current month's cost
 */
export async function getCurrentMonthCost(): Promise<number> {
  try {
    const supabase = await createClient();
    
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const { data, error } = await supabase
      .from('api_usage')
      .select('estimated_cost')
      .gte('created_at', startOfMonth.toISOString());
    
    if (error) throw error;
    
    return data?.reduce((sum, row) => sum + (parseFloat(row.estimated_cost) || 0), 0) || 0;
  } catch (error) {
    console.error('Failed to get current month cost:', error);
    return 0;
  }
}

/**
 * Check if cost thresholds are exceeded
 */
export async function checkCostThresholds(): Promise<{
  daily: { exceeded: boolean; current: number; threshold: number };
  weekly: { exceeded: boolean; current: number; threshold: number };
  monthly: { exceeded: boolean; current: number; threshold: number };
}> {
  try {
    const supabase = await createClient();
    
    // Get thresholds
    const { data: alerts } = await supabase
      .from('cost_alerts')
      .select('*');
    
    const thresholds = {
      daily: alerts?.find(a => a.alert_type === 'daily')?.threshold_amount || 50,
      weekly: alerts?.find(a => a.alert_type === 'weekly')?.threshold_amount || 300,
      monthly: alerts?.find(a => a.alert_type === 'monthly')?.threshold_amount || 1000,
    };
    
    // Get current costs
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const { data: dailyData } = await supabase
      .from('api_usage')
      .select('estimated_cost')
      .gte('created_at', dayAgo.toISOString());
    
    const { data: weeklyData } = await supabase
      .from('api_usage')
      .select('estimated_cost')
      .gte('created_at', weekAgo.toISOString());
    
    const { data: monthlyData } = await supabase
      .from('api_usage')
      .select('estimated_cost')
      .gte('created_at', monthStart.toISOString());
    
    const dailyCost = dailyData?.reduce((sum, row) => sum + (parseFloat(row.estimated_cost) || 0), 0) || 0;
    const weeklyCost = weeklyData?.reduce((sum, row) => sum + (parseFloat(row.estimated_cost) || 0), 0) || 0;
    const monthlyCost = monthlyData?.reduce((sum, row) => sum + (parseFloat(row.estimated_cost) || 0), 0) || 0;
    
    return {
      daily: { exceeded: dailyCost > thresholds.daily, current: dailyCost, threshold: thresholds.daily },
      weekly: { exceeded: weeklyCost > thresholds.weekly, current: weeklyCost, threshold: thresholds.weekly },
      monthly: { exceeded: monthlyCost > thresholds.monthly, current: monthlyCost, threshold: thresholds.monthly },
    };
  } catch (error) {
    console.error('Failed to check cost thresholds:', error);
    return {
      daily: { exceeded: false, current: 0, threshold: 50 },
      weekly: { exceeded: false, current: 0, threshold: 300 },
      monthly: { exceeded: false, current: 0, threshold: 1000 },
    };
  }
}

