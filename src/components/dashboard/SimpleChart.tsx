'use client'

import { useMemo } from 'react'

interface DataPoint {
  label: string
  value: number
}

type FormatType = 'number' | 'currency' | 'percent'

interface SimpleBarChartProps {
  data: DataPoint[]
  height?: number
  barColor?: string
  showLabels?: boolean
  formatType?: FormatType
}

function formatValue(value: number, type: FormatType): string {
  switch (type) {
    case 'currency':
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`
      }
      if (value >= 1000) {
        return `${(value / 1000).toFixed(0)}K`
      }
      return String(value)
    case 'percent':
      return `${value}%`
    default:
      return String(value)
  }
}

export function SimpleBarChart({
  data,
  height = 120,
  barColor = 'bg-primary',
  showLabels = true,
  formatType = 'number',
}: SimpleBarChartProps) {
  const maxValue = useMemo(() => Math.max(...data.map((d) => d.value), 1), [data])

  return (
    <div className="w-full">
      <div className="flex items-end gap-1" style={{ height }}>
        {data.map((item, index) => {
          const barHeight = (item.value / maxValue) * 100
          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`w-full ${barColor} rounded-t transition-all duration-300 hover:opacity-80`}
                style={{ height: `${Math.max(barHeight, 2)}%` }}
                title={`${item.label}: ${formatValue(item.value, formatType)}`}
              />
            </div>
          )
        })}
      </div>
      {showLabels && (
        <div className="flex gap-1 mt-2">
          {data.map((item, index) => (
            <div key={index} className="flex-1 text-center">
              <p className="text-xs text-muted-foreground truncate">{item.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface StatusDonutProps {
  data: { label: string; value: number; color: string }[]
  size?: number
}

export function StatusDonut({ data, size = 100 }: StatusDonutProps) {
  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data])

  const segments = useMemo(() => {
    let currentAngle = 0
    return data.map((item) => {
      const percentage = total > 0 ? item.value / total : 0
      const angle = percentage * 360
      const segment = {
        ...item,
        startAngle: currentAngle,
        endAngle: currentAngle + angle,
        percentage,
      }
      currentAngle += angle
      return segment
    })
  }, [data, total])

  const createArcPath = (startAngle: number, endAngle: number, radius: number, innerRadius: number) => {
    const startRad = ((startAngle - 90) * Math.PI) / 180
    const endRad = ((endAngle - 90) * Math.PI) / 180

    const x1 = 50 + radius * Math.cos(startRad)
    const y1 = 50 + radius * Math.sin(startRad)
    const x2 = 50 + radius * Math.cos(endRad)
    const y2 = 50 + radius * Math.sin(endRad)

    const x3 = 50 + innerRadius * Math.cos(endRad)
    const y3 = 50 + innerRadius * Math.sin(endRad)
    const x4 = 50 + innerRadius * Math.cos(startRad)
    const y4 = 50 + innerRadius * Math.sin(startRad)

    const largeArc = endAngle - startAngle > 180 ? 1 : 0

    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`
  }

  if (total === 0) {
    return (
      <div className="flex flex-col items-center gap-2">
        <svg width={size} height={size} viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="15"
            className="text-muted"
          />
        </svg>
        <p className="text-sm text-muted-foreground">데이터 없음</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox="0 0 100 100">
        {segments.map((segment, index) => (
          <path
            key={index}
            d={createArcPath(segment.startAngle, segment.endAngle, 45, 30)}
            fill={segment.color}
            className="transition-opacity hover:opacity-80"
          >
            <title>
              {segment.label}: {segment.value}건 ({Math.round(segment.percentage * 100)}%)
            </title>
          </path>
        ))}
        <text x="50" y="50" textAnchor="middle" dominantBaseline="middle" className="text-sm font-bold fill-foreground">
          {total}
        </text>
        <text x="50" y="62" textAnchor="middle" className="text-[8px] fill-muted-foreground">
          총 주문
        </text>
      </svg>
      <div className="flex flex-wrap justify-center gap-3">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-xs text-muted-foreground">
              {item.label} ({item.value})
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
