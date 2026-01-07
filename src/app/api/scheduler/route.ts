import { NextResponse } from 'next/server'
import {
  loadAllSchedules,
  updateScheduleFromDB,
  runScheduleNow,
  getActiveSchedules,
  clearAllSchedules,
} from '@/lib/scheduler'

export async function GET() {
  try {
    const activeSchedules = getActiveSchedules()
    return NextResponse.json({
      status: 'ok',
      activeSchedules,
      count: activeSchedules.length,
    })
  } catch (error) {
    console.error('Get scheduler status error:', error)
    return NextResponse.json(
      { error: 'Failed to get scheduler status' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, scheduleId } = body

    switch (action) {
      case 'reload': {
        console.log('🔄 [API] Reloading all schedules...')
        const count = await loadAllSchedules()
        return NextResponse.json({
          status: 'ok',
          message: `Reloaded ${count} schedule(s)`,
          activeSchedules: getActiveSchedules(),
        })
      }

      case 'update': {
        if (!scheduleId) {
          return NextResponse.json(
            { error: 'scheduleId is required' },
            { status: 400 }
          )
        }
        console.log(`🔄 [API] Updating schedule: ${scheduleId}`)
        const success = await updateScheduleFromDB(scheduleId)
        return NextResponse.json({
          status: success ? 'ok' : 'failed',
          scheduleId,
          activeSchedules: getActiveSchedules(),
        })
      }

      case 'run': {
        if (!scheduleId) {
          return NextResponse.json(
            { error: 'scheduleId is required' },
            { status: 400 }
          )
        }
        console.log(`▶️ [API] Running schedule now: ${scheduleId}`)
        const success = await runScheduleNow(scheduleId)
        return NextResponse.json({
          status: success ? 'ok' : 'failed',
          scheduleId,
        })
      }

      case 'clear': {
        console.log('🧹 [API] Clearing all schedules...')
        const count = clearAllSchedules()
        return NextResponse.json({
          status: 'ok',
          message: `Cleared ${count} schedule(s)`,
        })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: reload, update, run, clear' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Scheduler API error:', error)
    return NextResponse.json(
      { error: 'Scheduler operation failed' },
      { status: 500 }
    )
  }
}
