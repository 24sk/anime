import { createClient } from '@supabase/supabase-js'
import type { Database } from '~~/shared/types/database.types'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)
  const { job_id, feedback_type, selected_style, free_text, anon_session_id } = body

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

  // 匿名セッションIDのバリデーション
  if (!anon_session_id) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized: missing anon_session_id'
    })
  }

  const client = createClient<Database>(
    config.public.supabaseUrl,
    config.supabaseServiceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    }
  )

  try {
    const { error } = await client
      .from('feedbacks')
      .insert({
        job_id,
        anon_session_id,
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
