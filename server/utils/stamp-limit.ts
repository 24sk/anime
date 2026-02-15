import type { H3Event } from 'h3';
import { getSupabaseClient } from './supabase';
import type { Database } from '~~/shared/types/database.types';

type GeneratedStampCountRow = Database['public']['Tables']['generated_stamp_counts']['Row'];
type GeneratedStampCountInsert
  = Database['public']['Tables']['generated_stamp_counts']['Insert'];
type GeneratedStampCountUpdate
  = Database['public']['Tables']['generated_stamp_counts']['Update'];

/**
 * LINEスタンプ生成の日次上限設定
 * @remark 仕様: docs/features/ui/line-stamp.md 5.8.1 レート制限・コスト保護
 */
export const LINE_STAMP_DAILY_LIMIT = 40;

/**
 * UTC基準の日付文字列 (YYYY-MM-DD) を取得する
 * @param {Date} date - 対象日時
 * @returns {string} UTC基準の日付文字列
 */
function getUtcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * LINEスタンプ生成の日次上限（1ユーザー40枚/日）をチェックし、必要に応じてカウンタを更新する
 *
 * @param {H3Event} _event - H3イベント（将来的な拡張用。現在は未使用）
 * @param {string} anonSessionId - 匿名セッションID（anon_session_id）
 * @param {number} increment - 今回のリクエストで増加させる生成枚数
 * @returns {Promise<{ allowed: boolean; remaining: number }>} チェック結果
 *
 * @remarks
 * - Supabase の generated_stamp_counts テーブルを使用して日次カウントを管理する。
 * - テーブルは (anon_session_id, date) の複合主キーで、UTC基準の日付ごとに1行を保持する。
 * - 取得・更新には service_role キーを使用し、RLS の影響を受けない。
 * - 何らかのエラーが発生した場合はログに記録し、サービス継続性を優先して「許可」とする（fail-open）。
 */
export async function checkLineStampDailyLimit(
  _event: H3Event,
  anonSessionId: string,
  increment: number
): Promise<{ allowed: boolean; remaining: number }> {
  const supabase = getSupabaseClient();
  const now = new Date();
  const today = getUtcDateString(now);

  // 異常な increment は即座に拒否する
  if (increment <= 0) {
    return { allowed: true, remaining: LINE_STAMP_DAILY_LIMIT };
  }

  // generated_stamp_counts テーブルから当日分のレコードを取得
  // 型推論の問題を回避するため、rate-limit.ts と同様に型アサーションを使用する
  const query = supabase
    .from('generated_stamp_counts')
    .select('anon_session_id, date, generated_count, last_generated_at') as unknown as {
    eq: (column: string, value: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{
          data: GeneratedStampCountRow | null;
          error: { code?: string } | null;
        }>;
      };
    };
  };

  try {
    const { data: initialData, error: selectError } = await query
      .eq('anon_session_id', anonSessionId)
      .eq('date', today)
      .maybeSingle();

    let countRow = initialData;

    if (selectError) {
      // エラーはログに記録して、日次制限チェックをスキップ（サービス継続性のため）
      console.error('[stamp-limit] select error:', selectError);
      return { allowed: true, remaining: LINE_STAMP_DAILY_LIMIT };
    }

    // まだ当日レコードが存在しない場合
    if (!countRow) {
      // 今回の increment のみで上限を超える場合は拒否
      if (increment > LINE_STAMP_DAILY_LIMIT) {
        return { allowed: false, remaining: 0 };
      }

      const insertData: GeneratedStampCountInsert = {
        anon_session_id: anonSessionId,
        date: today,
        generated_count: increment,
        last_generated_at: now.toISOString()
      };

      const insertQuery = supabase.from('generated_stamp_counts') as unknown as {
        insert: (
          data: GeneratedStampCountInsert
        ) => Promise<{ error: { code?: string } | null }>;
      };

      const { error: insertError } = await insertQuery.insert(insertData);

      if (insertError) {
        // 重複エラー（23505）の場合は、他プロセスが先に作成したとみなして
        // 後続の UPDATE 処理に進むために、再度 SELECT を試みる
        if (insertError.code === '23505') {
          const { data: retryRow, error: retryError } = await query
            .eq('anon_session_id', anonSessionId)
            .eq('date', today)
            .maybeSingle();

          if (retryRow) {
            countRow = retryRow;
            // 成功したので、下の UPDATE ロジックへ進む
          } else {
            console.error('[stamp-limit] retry select error after 23505:', retryError);
            return { allowed: true, remaining: LINE_STAMP_DAILY_LIMIT };
          }
        } else {
          console.error('[stamp-limit] insert error:', insertError);
          return { allowed: true, remaining: LINE_STAMP_DAILY_LIMIT };
        }
      } else {
        // INSERT 成功
        return {
          allowed: true,
          remaining: LINE_STAMP_DAILY_LIMIT - increment
        };
      }
    }

    const currentCount = countRow.generated_count ?? 0;
    const newCount = currentCount + increment;

    // 上限超過チェック
    if (newCount > LINE_STAMP_DAILY_LIMIT) {
      return {
        allowed: false,
        remaining: Math.max(LINE_STAMP_DAILY_LIMIT - currentCount, 0)
      };
    }

    const updateData: GeneratedStampCountUpdate = {
      generated_count: newCount,
      last_generated_at: now.toISOString()
    };

    const updateQuery = (supabase.from('generated_stamp_counts') as unknown as {
      update: (data: GeneratedStampCountUpdate) => {
        eq: (column: string, value: string) => {
          eq: (column: string, value: string) => Promise<{
            error: { code?: string } | null;
          }>;
        };
      };
    }).update(updateData);

    const { error: updateError } = await updateQuery
      .eq('anon_session_id', anonSessionId)
      .eq('date', today);

    if (updateError) {
      console.error('[stamp-limit] update error:', updateError);
      return { allowed: true, remaining: LINE_STAMP_DAILY_LIMIT };
    }

    return {
      allowed: true,
      remaining: LINE_STAMP_DAILY_LIMIT - newCount
    };
  } catch (error) {
    // 予期せぬエラーもログに記録しつつ、サービス継続性を優先して許可する
    const message = error instanceof Error ? error.message : String(error);
    console.error('[stamp-limit] unexpected error:', message);
    return { allowed: true, remaining: LINE_STAMP_DAILY_LIMIT };
  }
}
