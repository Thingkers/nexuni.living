import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    await supabase.rpc(
      'auto_cancel_expired_bookings',
    )

    return Response.json({
      success: true,
    })
  } catch (error) {
    return Response.json(
      {
        success: false,
        error,
      },
      {
        status: 500,
      },
    )
  }
}