import { serverSupabaseClient } from '#supabase/server'
import { Database } from '~~/shared/types/database.types'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const { job_id, feedback_type, selected_style, free_text } = body

    // バリデーション
    if (!job_id || !feedback_type) {
        throw createError({
            statusCode: 400,
            statusMessage: 'job_id and feedback_type are required'
        })
    }

    if (feedback_type !== 'good' && feedback_type !== 'bad') {
        throw createError({
            statusCode: 400,
            statusMessage: 'Invalid feedback_type'
        })
    }

    // 匿名セッションIDの取得（ヘッダーから）
    const anonSessionId = getRequestHeader(event, 'x-anon-session-id')
    if (!anonSessionId) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Unauthorized: missing x-anon-session-id'
        })
    }

    const client = await serverSupabaseClient<Database>(event)

    try {
        const { error } = await client
            .from('feedbacks')
            .insert({
                job_id,
                anon_session_id: anonSessionId,
                feedback_type,
                selected_style: selected_style || null,
                free_text: free_text || null
            })

        if (error) {
            console.error('Feedback insert error:', error)
            throw createError({
                statusCode: 500,
                statusMessage: 'Failed to save feedback'
            })
        }

        return { success: true }
    } catch (error) {
        console.error('Feedback API error:', error)
        throw createError({
            statusCode: 500,
            statusMessage: 'Internal Server Error'
        })
    }
})
